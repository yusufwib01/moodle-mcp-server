import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "..", "..", "guidelines", "upgrade_notes.md");

const inputSchema = z.object({});

export const getUpgradeNoteFormat: ToolDefinition<typeof inputSchema> = {
  name: "get_upgrade_note_format",
  description: "Return the expected format for Moodle upgrade.txt entries with examples.",
  inputSchema,
  async run() {
    return { content: await readFile(file, "utf8") };
  },
};
