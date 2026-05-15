import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { resolveCallRoot, rootSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  apiFunction: z.string().min(2).describe("Function/method to find usages of, e.g. $DB->get_records."),
  maxExamples: z.number().int().positive().max(20).default(5),
  root: rootSchema,
});

export const getApiUsageExamples: ToolDefinition<typeof inputSchema> = {
  name: "get_api_usage_examples",
  description: "Return up to 5 real-world usage snippets of a Moodle API across the codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: input.apiFunction,
      root,
      glob: "*.php",
      fixedStrings: true,
    });
    const examples = matches.slice(0, input.maxExamples).map((m) => ({
      file: m.file,
      line: m.line,
      snippet: m.snippet,
    }));
    return { apiFunction: input.apiFunction, examples, totalMatches: matches.length };
  },
};
