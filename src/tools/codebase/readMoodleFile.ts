import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import { safeJoin } from "../../lib/paths.js";
import { sliceLines } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    filePath: z.string().min(1).describe("Path relative to MOODLE_ROOT."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const readMoodleFile: ToolDefinition<typeof inputSchema> = {
  name: "read_moodle_file",
  description:
    "Read a file inside the Moodle codebase. Supports offset/limit pagination; default returns first 500 lines.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const absolute = safeJoin(root, input.filePath);
    let stats;
    try {
      stats = await stat(absolute);
    } catch {
      throw new Error(`File not found at ${input.filePath} in ${root}`);
    }
    if (!stats.isFile()) {
      throw new Error(`Not a regular file: ${input.filePath}`);
    }
    const content = await readFile(absolute, "utf8");
    const allLines = content.split("\n");
    const sliced = sliceLines(allLines, { offset: input.offset, limit: input.limit });
    return {
      filePath: input.filePath,
      ...sliced,
    };
  },
};
