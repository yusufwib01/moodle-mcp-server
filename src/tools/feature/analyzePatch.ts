import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  diff: z.string().min(1).describe("Unified diff text (e.g. output of `git diff`)."),
});

const PLUGIN_DIR_TO_TYPE: Array<{ prefix: string; component: (parts: string[]) => string | null }> = [
  { prefix: "mod/", component: (p) => (p[1] ? `mod_${p[1]}` : null) },
  { prefix: "blocks/", component: (p) => (p[1] ? `block_${p[1]}` : null) },
  { prefix: "local/", component: (p) => (p[1] ? `local_${p[1]}` : null) },
  { prefix: "report/", component: (p) => (p[1] ? `report_${p[1]}` : null) },
  { prefix: "admin/tool/", component: (p) => (p[2] ? `tool_${p[2]}` : null) },
  { prefix: "auth/", component: (p) => (p[1] ? `auth_${p[1]}` : null) },
  { prefix: "enrol/", component: (p) => (p[1] ? `enrol_${p[1]}` : null) },
  { prefix: "filter/", component: (p) => (p[1] ? `filter_${p[1]}` : null) },
  { prefix: "theme/", component: (p) => (p[1] ? `theme_${p[1]}` : null) },
  { prefix: "lib/", component: () => "core" },
];

function resolveComponentFromPath(path: string): string | null {
  const parts = path.split("/");
  for (const rule of PLUGIN_DIR_TO_TYPE) {
    if (path.startsWith(rule.prefix)) return rule.component(parts);
  }
  return null;
}

interface FileEntry {
  path: string;
  added: number;
  removed: number;
  isNew: boolean;
}

function extractFiles(diff: string): FileEntry[] {
  const lines = diff.split("\n");
  const files: FileEntry[] = [];
  let current: FileEntry | null = null;
  let pendingIsNew = false;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (current) files.push(current);
      current = null;
      pendingIsNew = false;
      continue;
    }
    if (line.startsWith("new file mode")) {
      pendingIsNew = true;
      continue;
    }
    if (line.startsWith("+++ b/")) {
      const path = line.slice("+++ b/".length);
      current = { path, added: 0, removed: 0, isNew: pendingIsNew };
      pendingIsNew = false;
      continue;
    }
    if (line.startsWith("+++ /dev/null")) {
      current = null;
      continue;
    }
    if (current && line.startsWith("+") && !line.startsWith("+++")) current.added++;
    if (current && line.startsWith("-") && !line.startsWith("---")) current.removed++;
  }
  if (current) files.push(current);
  return files;
}

function suggestChecklists(files: Array<{ path: string }>): string[] {
  const set = new Set<string>(["general"]);
  for (const f of files) {
    if (f.path.includes("/db/") || f.path.endsWith("install.xml") || f.path.endsWith("upgrade.php")) set.add("db");
    if (f.path.includes("/classes/external/") || f.path.endsWith("access.php") || f.path.endsWith("services.php")) set.add("security");
    if (f.path.endsWith(".mustache") || f.path.includes("/templates/")) set.add("accessibility");
    if (f.path.includes("/classes/privacy/") || f.path.endsWith("install.xml") || f.path.endsWith("upgrade.php")) set.add("privacy");
    if (f.path.endsWith("services.php") || f.path.includes("/classes/external/") || f.path.endsWith(".mustache")) set.add("mobile");
    if (f.path.includes("thirdparty") || f.path.includes("/vendor/")) set.add("third_party");
    if (f.path.endsWith("upgrade.txt") || f.path.endsWith(".md")) set.add("documentation");
  }
  return [...set];
}

function suggestTrackerLabels(files: Array<{ path: string }>): string[] {
  const set = new Set<string>();
  for (const f of files) {
    if (
      f.path.endsWith(".mustache") ||
      f.path.includes("/templates/") ||
      f.path.includes("/amd/") ||
      f.path.endsWith(".css") ||
      f.path.endsWith(".scss")
    ) {
      set.add("ui_change");
    }
    if (
      f.path.endsWith("services.php") ||
      f.path.includes("/classes/external/") ||
      f.path.endsWith(".mustache")
    ) {
      set.add("affects_mobileapp");
    }
    if (
      f.path.endsWith("upgrade.txt") ||
      f.path.endsWith("README.md") ||
      f.path.endsWith("readme_moodle.txt")
    ) {
      set.add("docs_required");
    }
    if (f.path.includes("thirdparty") || f.path.includes("/vendor/")) {
      set.add("third_party");
    }
    if (f.path.includes("/classes/privacy/")) {
      set.add("privacy_implementation");
    }
  }
  return [...set];
}

export const analyzePatch: ToolDefinition<typeof inputSchema> = {
  name: "analyze_patch",
  description:
    "Parse a unified diff (e.g. `git diff` output) and return affected files, resolved Moodle components, and suggested review checklists.",
  inputSchema,
  async run(input) {
    const files = extractFiles(input.diff);
    const components = [...new Set(files.map((f) => resolveComponentFromPath(f.path)).filter((c): c is string => c !== null))];
    const suggestedChecklists = suggestChecklists(files);
    const suggestedTrackerLabels = suggestTrackerLabels(files);
    return {
      files,
      components,
      suggestedChecklists,
      suggestedTrackerLabels,
      summary: `${files.length} file(s) changed across ${components.length} component(s).`,
    };
  },
};
