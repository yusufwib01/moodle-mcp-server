import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    capability: z
      .string()
      .min(1)
      .describe("Capability name to find, e.g. mod/quiz:view or moodle/site:config."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const findCapability: ToolDefinition<typeof inputSchema> = {
  name: "find_capability",
  description:
    "Locate Moodle capability declarations across db/access.php files. Returns the file and line where the capability key is defined.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: `'${input.capability}'`,
      root,
      glob: "db/access.php",
      fixedStrings: true,
    });
    return capResults(matches, { offset: input.offset, limit: input.limit });
  },
};
