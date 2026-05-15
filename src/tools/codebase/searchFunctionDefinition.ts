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
      .regex(identifier, "Function name must be a valid PHP identifier.")
      .describe("PHP function name to locate."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const searchFunctionDefinition: ToolDefinition<typeof inputSchema> = {
  name: "search_function_definition",
  description: "Find PHP function definitions matching a name across the Moodle codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const pattern = `function\\s+${input.functionName}\\s*\\(`;
    const matches = await runRipgrep({ pattern, root, glob: "*.php" });
    const results = matches.map((m) => ({
      file: m.file,
      line: m.line,
      signature: m.snippet.replace(/\s*\{.*$/, "").trim(),
    }));
    return capResults(results, { offset: input.offset, limit: input.limit });
  },
};
