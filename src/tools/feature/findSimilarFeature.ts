import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    description: z.string().min(2).describe("Free-text description; split on whitespace into keywords."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const findSimilarFeature: ToolDefinition<typeof inputSchema> = {
  name: "find_similar_feature",
  description:
    "Search Moodle for code that resembles a feature description by splitting it into keywords and running ripgrep over each.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const keywords = input.description
      .split(/\s+/)
      .filter((k) => k.length >= 3)
      .slice(0, 5);
    const allMatches = [] as Array<{ file: string; line: number; snippet: string; keyword: string }>;
    for (const kw of keywords) {
      const hits = await runRipgrep({ pattern: kw, root, glob: "*.php", fixedStrings: true });
      for (const m of hits) {
        allMatches.push({ ...m, keyword: kw });
      }
    }
    const dedup = new Map<string, { file: string; line: number; snippet: string; keyword: string }>();
    for (const m of allMatches) {
      if (!dedup.has(m.file)) dedup.set(m.file, m);
    }
    return capResults([...dedup.values()], { offset: input.offset, limit: input.limit });
  },
};
