import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

const inputSchema = z
  .object({
    functionName: z
      .string()
      .regex(identifier, "Function name must be a valid PHP identifier."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const traceCallPath: ToolDefinition<typeof inputSchema> = {
  name: "trace_call_path",
  description:
    "Locate a PHP function's definitions and all callers across the Moodle codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const defPattern = `function\\s+${input.functionName}\\s*\\(`;
    const callPattern = `\\b${input.functionName}\\s*\\(`;

    const [defs, calls] = await Promise.all([
      runRipgrep({ pattern: defPattern, root, glob: "*.php" }),
      runRipgrep({ pattern: callPattern, root, glob: "*.php" }),
    ]);

    const definitions = defs.map((m) => ({
      file: m.file,
      line: m.line,
      signature: m.snippet.replace(/\s*\{.*$/, "").trim(),
    }));

    const defLineKeys = new Set(defs.map((m) => `${m.file}:${m.line}`));
    const filteredCalls = calls.filter((m) => !defLineKeys.has(`${m.file}:${m.line}`));

    return {
      definitions,
      callers: capResults(filteredCalls, { offset: input.offset, limit: input.limit }),
    };
  },
};
