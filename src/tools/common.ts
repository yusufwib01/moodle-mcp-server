import { z } from "zod";
import { resolveRoot } from "../lib/paths.js";

export const rootSchema = z
  .string()
  .min(1)
  .optional()
  .describe("Absolute Moodle root override. Defaults to MOODLE_ROOT env.");

export const paginationSchema = z.object({
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function resolveCallRoot(override: string | undefined): string {
  return resolveRoot(override);
}
