import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { safeJoin } from "../../lib/paths.js";
import { sliceLines } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  mdlIssue: z.string().regex(/^MDL-\d+$/, "Expected an MDL issue key, e.g. MDL-12345."),
  filePath: z.string().min(1).optional(),
  root: rootSchema,
});

interface FunctionEntry {
  name: string;
  line: number;
}

function findFunctions(source: string): FunctionEntry[] {
  const out: FunctionEntry[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (m) out.push({ name: m[1], line: i + 1 });
  }
  return out;
}

export const getBugContext: ToolDefinition<typeof inputSchema> = {
  name: "get_bug_context",
  description:
    "Bundle codebase context (optional file preview + function list) and instruct Claude to fetch the ticket from the Jira MCP.",
  inputSchema,
  async run(input) {
    const instruction = `Call the Jira MCP to fetch ${input.mdlIssue} (summary, description, affected components) and combine with the codebase context below.`;
    if (!input.filePath) {
      return { instruction, mdlIssue: input.mdlIssue };
    }
    const root = resolveCallRoot(input.root);
    const absolute = safeJoin(root, input.filePath);
    try {
      const s = await stat(absolute);
      if (!s.isFile()) throw new Error("not a file");
    } catch {
      throw new Error(`File not found at ${input.filePath} in ${root}`);
    }
    const content = await readFile(absolute, "utf8");
    const sliced = sliceLines(content.split("\n"));
    return {
      instruction,
      mdlIssue: input.mdlIssue,
      file: {
        filePath: input.filePath,
        ...sliced,
      },
      functions: findFunctions(content),
    };
  },
};
