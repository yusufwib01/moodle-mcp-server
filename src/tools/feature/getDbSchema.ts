import { readFile } from "node:fs/promises";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import { resolveCallRoot, rootSchema } from "../common.js";
import { runRipgrep } from "../../lib/ripgrep.js";
import { safeJoin } from "../../lib/paths.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  tableName: z.string().regex(/^[a-z][a-z0-9_]+$/i),
  root: rootSchema,
});

interface FieldDef {
  name: string;
  type: string;
  length?: string;
  notnull?: string;
  sequence?: string;
}

interface KeyDef {
  name: string;
  type: string;
  fields: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

export const getDbSchema: ToolDefinition<typeof inputSchema> = {
  name: "get_db_schema",
  description: "Return the install.xml table definition for a given Moodle DB table.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: `<TABLE NAME=\"${input.tableName}\"`,
      root,
      glob: "install.xml",
      fixedStrings: false,
    });
    if (matches.length === 0) {
      throw new Error(`Table not found in any install.xml: ${input.tableName}`);
    }
    const match = matches[0];
    const xml = await readFile(safeJoin(root, match.file), "utf8");
    const parsed = parser.parse(xml);
    const tables = parsed?.XMLDB?.TABLES?.TABLE;
    const list: any[] = Array.isArray(tables) ? tables : tables ? [tables] : [];
    const table = list.find((t) => t.NAME === input.tableName);
    if (!table) {
      throw new Error(`Table not found after parsing: ${input.tableName}`);
    }
    const fieldNodes = table.FIELDS?.FIELD;
    const fields: FieldDef[] = (Array.isArray(fieldNodes) ? fieldNodes : fieldNodes ? [fieldNodes] : []).map((f: any) => ({
      name: f.NAME,
      type: f.TYPE,
      length: f.LENGTH,
      notnull: f.NOTNULL,
      sequence: f.SEQUENCE,
    }));
    const keyNodes = table.KEYS?.KEY;
    const keys: KeyDef[] = (Array.isArray(keyNodes) ? keyNodes : keyNodes ? [keyNodes] : []).map((k: any) => ({
      name: k.NAME,
      type: k.TYPE,
      fields: k.FIELDS,
    }));
    return {
      file: match.file,
      tableName: input.tableName,
      comment: table.COMMENT ?? "",
      fields,
      keys,
    };
  },
};
