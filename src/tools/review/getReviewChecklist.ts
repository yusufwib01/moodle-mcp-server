import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const guidelinesDir = join(here, "..", "..", "..", "guidelines");

const TYPES = [
  "general",
  "db",
  "security",
  "accessibility",
  "privacy",
  "mobile",
  "performance",
  "documentation",
  "git",
  "third_party",
] as const;

const inputSchema = z.object({
  type: z.enum(TYPES).default("general"),
});

export const getReviewChecklist: ToolDefinition<typeof inputSchema> = {
  name: "get_review_checklist",
  description:
    "Return a Moodle review checklist (general, db, security, accessibility). Applies to peer review and integration review alike.",
  inputSchema,
  async run(input) {
    const file = join(guidelinesDir, `review_checklist_${input.type}.md`);
    const content = await readFile(file, "utf8");
    return { type: input.type, content };
  },
};
