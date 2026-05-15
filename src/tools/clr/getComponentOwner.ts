import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
let componentsJsonPath = join(here, "..", "..", "..", "data", "components.json");

export function setComponentsJsonPathForTests(path: string | undefined): void {
  if (path === undefined) {
    componentsJsonPath = join(here, "..", "..", "..", "data", "components.json");
  } else {
    componentsJsonPath = path;
  }
}

const inputSchema = z.object({
  component: z.string().min(1),
});

export const getComponentOwner: ToolDefinition<typeof inputSchema> = {
  name: "get_component_owner",
  description:
    "Return owner/maintainer metadata for a Moodle component. Returns notConfigured=true until data/components.json is populated.",
  inputSchema,
  async run(input) {
    if (!existsSync(componentsJsonPath)) {
      return {
        notConfigured: true,
        message:
          "components.json is not populated yet. Populate data/components.json with `{ components: { <name>: { owner, maintainer } } }`.",
      };
    }
    const raw = JSON.parse(await readFile(componentsJsonPath, "utf8"));
    const entry = raw.components?.[input.component];
    if (!entry) return { notFound: true, component: input.component };
    return { component: input.component, ...entry };
  },
};
