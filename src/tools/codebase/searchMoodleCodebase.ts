import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    query: z.string().min(1).describe("Pattern to grep for (ripgrep regex)."),
    filePattern: z.string().default("*.php").describe("Glob for file types to search."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const searchMoodleCodebase: ToolDefinition<typeof inputSchema> = {
  name: "search_moodle_codebase",
  description:
    "Search the Moodle codebase with ripgrep. Returns paginated matches with file path, line number, and snippet.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: input.query,
      root,
      glob: input.filePattern,
    });
    return capResults(matches, { offset: input.offset, limit: input.limit });
  },
};
