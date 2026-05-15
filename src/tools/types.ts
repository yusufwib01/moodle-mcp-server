import type { ZodTypeAny, z } from "zod";

export interface ToolDefinition<TSchema extends ZodTypeAny = ZodTypeAny, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: TSchema;
  run(input: z.infer<TSchema>): Promise<TOutput>;
}
