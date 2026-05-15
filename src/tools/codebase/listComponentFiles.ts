import { readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { z } from "zod";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import { resolveComponentPath } from "../../lib/moodle.js";
import { capResults } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    component: z.string().min(1).describe("Moodle component name, e.g. mod_quiz, core_course."),
    root: rootSchema,
  })
  .merge(paginationSchema);

async function walk(dir: string, root: string): Promise<Array<{ path: string; type: string }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: Array<{ path: string; type: string }> = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full, root)));
    } else if (entry.isFile()) {
      out.push({ path: relative(root, full), type: extname(entry.name).replace(/^\./, "") || "file" });
    }
  }
  return out;
}

export const listComponentFiles: ToolDefinition<typeof inputSchema> = {
  name: "list_component_files",
  description: "List every file under a Moodle component directory (e.g. mod_quiz, block_html).",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const componentDir = resolveComponentPath(root, input.component);
    const files = (await walk(componentDir, root)).sort((a, b) => a.path.localeCompare(b.path));
    return capResults(files, { offset: input.offset, limit: input.limit });
  },
};
