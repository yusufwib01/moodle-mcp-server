import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "..", "..", "guidelines", "triage_checklist.md");

const inputSchema = z.object({});

export const getTriageChecklist: ToolDefinition<typeof inputSchema> = {
  name: "get_triage_checklist",
  description:
    "Return the Moodle issue triage checklist: 11-question screening flow, required confirmation fields, possible outcomes, and triage priority order. Source: moodledev.io/general/development/process/triage.",
  inputSchema,
  async run() {
    return { content: await readFile(file, "utf8") };
  },
};
