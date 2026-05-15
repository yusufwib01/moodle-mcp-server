import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read(): Promise<string>;
}

const here = dirname(fileURLToPath(import.meta.url));
const guidelinesDir = join(here, "..", "..", "guidelines");

function mdResource(uri: string, name: string, description: string, file: string): ResourceDefinition {
  return {
    uri,
    name,
    description,
    mimeType: "text/markdown",
    read: () => readFile(join(guidelinesDir, file), "utf8"),
  };
}

export const allResources: ResourceDefinition[] = [
  mdResource(
    "moodle://guidelines/coding-style",
    "Moodle coding style",
    "Core coding-style notes for Moodle PHP.",
    "coding_style.md",
  ),
  mdResource(
    "moodle://guidelines/clr-checklist",
    "Moodle CLR checklist",
    "General CLR (Component Lead Review) checklist.",
    "clr_checklist_general.md",
  ),
  mdResource(
    "moodle://guidelines/deprecation",
    "Moodle deprecation rules",
    "Deprecation handling conventions.",
    "deprecation.md",
  ),
];

export function listResources(resources: ResourceDefinition[]) {
  return resources.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readResource(
  resources: ResourceDefinition[],
  uri: string,
): Promise<Array<{ uri: string; mimeType: string; text: string }>> {
  const match = resources.find((r) => r.uri === uri);
  if (!match) {
    throw new Error(`Unknown resource: ${uri}`);
  }
  return [{ uri: match.uri, mimeType: match.mimeType, text: await match.read() }];
}
