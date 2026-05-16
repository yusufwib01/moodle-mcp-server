import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    pattern: z.string().min(1).describe("ripgrep regex pattern to search for."),
    filePattern: z.string().default("*.php"),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const findSimilarImplementations: ToolDefinition<typeof inputSchema> = {
  name: "find_similar_implementations",
  description:
    "Find similar code patterns across Moodle for cross-component reference. Keeps the first match per file.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: input.pattern,
      root,
      glob: input.filePattern,
    });
    const seen = new Set<string>();
    const deduped = matches.filter((m) => (seen.has(m.file) ? false : (seen.add(m.file), true)));
    return capResults(deduped, { offset: input.offset, limit: input.limit });
  },
};
