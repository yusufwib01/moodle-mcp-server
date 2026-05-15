import { z } from "zod";
import type { ToolDefinition } from "../types.js";
import { buildScaffold, type ScaffoldType } from "./scaffolds.js";

const inputSchema = z.object({
  type: z.enum(["mod", "block", "local", "report"]).describe("Plugin type."),
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,31}$/, "Plugin name must be lowercase letters, digits, underscores."),
});

export const getFeatureScaffold: ToolDefinition<typeof inputSchema> = {
  name: "get_feature_scaffold",
  description:
    "Return the standard file structure and starter content for a new Moodle plugin of a given type.",
  inputSchema,
  async run(input) {
    const files = buildScaffold(input.type as ScaffoldType, input.name);
    return { type: input.type, name: input.name, files };
  },
};
