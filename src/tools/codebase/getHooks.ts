import { readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { resolveComponentPath } from "../../lib/moodle.js";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  component: z.string().min(1).optional(),
  root: rootSchema,
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
});

interface HookEntry {
  file: string;
  content: string;
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    const s = await stat(path);
    if (!s.isFile()) return null;
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export const getHooks: ToolDefinition<typeof inputSchema> = {
  name: "get_hooks",
  description:
    "Return Moodle hook callback registrations. With a component, reads its db/hooks.php and db/callbacks.php; without one, lists every db/hooks.php in the codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);

    if (input.component) {
      const componentDir = resolveComponentPath(root, input.component);
      const candidates = [
        join(componentDir, "db", "hooks.php"),
        join(componentDir, "db", "callbacks.php"),
      ];
      const entries: HookEntry[] = [];
      for (const path of candidates) {
        const content = await readIfExists(path);
        if (content !== null) entries.push({ file: relative(root, path), content });
      }
      return { entries };
    }

    const matches = await runRipgrep({
      pattern: "callbacks",
      root,
      glob: "db/hooks.php",
    });
    const seen = new Set<string>();
    const files = matches.filter((m) => {
      if (seen.has(m.file)) return false;
      seen.add(m.file);
      return true;
    });
    return capResults(files, { offset: input.offset, limit: input.limit });
  },
};
