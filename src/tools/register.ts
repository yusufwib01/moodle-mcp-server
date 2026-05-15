import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import type { ToolDefinition } from "./types.js";

export function toJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: "jsonSchema7" }) as Record<string, unknown>;
}

export interface ToolListEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolDispatchers {
  list(): ToolListEntry[];
  call(name: string, rawInput: unknown): Promise<unknown>;
}

export function buildToolDispatchers(tools: ToolDefinition[]): ToolDispatchers {
  const byName = new Map<string, ToolDefinition>();
  for (const tool of tools) {
    if (byName.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    byName.set(tool.name, tool);
  }
  return {
    list() {
      return tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: toJsonSchema(tool.inputSchema),
      }));
    },
    async call(name, rawInput) {
      const tool = byName.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }
      const parsed = tool.inputSchema.parse(rawInput ?? {});
      return tool.run(parsed);
    },
  };
}
