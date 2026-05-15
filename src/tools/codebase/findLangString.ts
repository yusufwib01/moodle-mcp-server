import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .regex(/^[A-Za-z0-9_]+$/, "Lang string key may only contain letters, digits, underscores.")
      .describe("Lang string key, e.g. pluginname."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const findLangString: ToolDefinition<typeof inputSchema> = {
  name: "find_lang_string",
  description:
    "Locate Moodle lang string definitions across lang/en/*.php files. Returns each file/line where `$string['key']` is assigned.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: `\\$string\\[['\"]${input.key}['\"]\\]`,
      root,
      glob: "lang/en/*.php",
    });
    return capResults(matches, { offset: input.offset, limit: input.limit });
  },
};
