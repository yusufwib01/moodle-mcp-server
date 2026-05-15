import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export class ComponentResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComponentResolveError";
  }
}

const PLUGIN_TYPE_DIRS: Record<string, string> = {
  mod: "mod",
  block: "blocks",
  local: "local",
  report: "report",
  tool: "admin/tool",
  auth: "auth",
  enrol: "enrol",
  filter: "filter",
  qbehaviour: "question/behaviour",
  qformat: "question/format",
  qtype: "question/type",
  theme: "theme",
  format: "course/format",
  repository: "repository",
  message: "message/output",
  gradeimport: "grade/import",
  gradeexport: "grade/export",
  gradereport: "grade/report",
  webservice: "webservice",
};

const CORE_SUBSYSTEM_DIRS: Record<string, string> = {
  core: "lib",
  core_course: "course",
  core_user: "user",
  core_group: "group",
  core_message: "message",
  core_grades: "grade",
  core_question: "question",
  core_enrol: "enrol",
  core_role: "admin/roles",
  core_backup: "backup",
  core_files: "files",
  core_search: "search",
  core_tag: "tag",
  core_blog: "blog",
  core_admin: "admin",
  core_auth: "auth",
};

export function resolveComponentPath(root: string, component: string): string {
  if (!component) {
    throw new ComponentResolveError("Component name is empty.");
  }

  const coreMatch = CORE_SUBSYSTEM_DIRS[component];
  if (coreMatch) {
    return assertExists(join(root, coreMatch), component);
  }

  const underscore = component.indexOf("_");
  if (underscore === -1) {
    throw new ComponentResolveError(`Unknown component: ${component}`);
  }
  const type = component.slice(0, underscore);
  const name = component.slice(underscore + 1);
  const dir = PLUGIN_TYPE_DIRS[type];
  if (!dir) {
    throw new ComponentResolveError(`Unknown plugin type: ${type} (component: ${component})`);
  }
  return assertExists(join(root, dir, name), component);
}

function assertExists(absolute: string, component: string): string {
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
    throw new ComponentResolveError(`Component directory not found for ${component}: ${absolute}`);
  }
  return absolute;
}
