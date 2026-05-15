import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "..", "..", "guidelines", "deprecation.md");

const inputSchema = z.object({});

export const getDeprecationRules: ToolDefinition<typeof inputSchema> = {
  name: "get_deprecation_rules",
  description: "Return Moodle deprecation handling conventions (debugging(), @deprecated, upgrade.txt).",
  inputSchema,
  async run() {
    const content = await readFile(file, "utf8");
    return { content };
  },
};
