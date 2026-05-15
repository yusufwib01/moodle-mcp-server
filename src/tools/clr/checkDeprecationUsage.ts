import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { safeJoin } from "../../lib/paths.js";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
let deprecatedJsonPath = join(here, "..", "..", "..", "data", "deprecated.json");

export function setDeprecatedJsonPathForTests(path: string | undefined): void {
  if (path === undefined) {
    deprecatedJsonPath = join(here, "..", "..", "..", "data", "deprecated.json");
  } else {
    deprecatedJsonPath = path;
  }
}

const inputSchema = z.object({
  filePath: z.string().min(1),
  root: rootSchema,
});

interface DeprecatedEntry {
  name: string;
  since?: string;
  note?: string;
}

export const checkDeprecationUsage: ToolDefinition<typeof inputSchema> = {
  name: "check_deprecation_usage",
  description:
    "Scan a Moodle file for usages of known-deprecated APIs. Returns notConfigured=true until data/deprecated.json is populated.",
  inputSchema,
  async run(input) {
    if (!existsSync(deprecatedJsonPath)) {
      return {
        notConfigured: true,
        message:
          "deprecated.json is not populated yet. Populate data/deprecated.json with `{ items: [{ name, since?, note? }] }`.",
      };
    }
    const raw = JSON.parse(await readFile(deprecatedJsonPath, "utf8"));
    const items: DeprecatedEntry[] = raw.items ?? [];
    const root = resolveCallRoot(input.root);
    const absolute = safeJoin(root, input.filePath);
    const s = await stat(absolute);
    if (!s.isFile()) throw new Error(`Not a file: ${input.filePath}`);
    const source = await readFile(absolute, "utf8");
    const lines = source.split("\n");
    const findings = items
      .map((item) => {
        const re = new RegExp(`\\b${item.name}\\b`);
        const lineHits: number[] = [];
        lines.forEach((line, idx) => {
          if (re.test(line)) lineHits.push(idx + 1);
        });
        return { name: item.name, since: item.since, note: item.note, lines: lineHits };
      })
      .filter((f) => f.lines.length > 0);
    return { findings };
  },
};
