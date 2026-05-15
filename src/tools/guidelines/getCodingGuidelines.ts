import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const guidelinesDir = join(here, "..", "..", "..", "guidelines");

const TOPICS = [
  "phpdoc",
  "db_queries",
  "deprecation",
  "output_api",
  "behat",
  "phpunit",
  "upgrade_notes",
  "coding_style",
] as const;

type Topic = (typeof TOPICS)[number];

const inputSchema = z.object({
  topic: z.enum(TOPICS).optional(),
});

export function listGuidelineTopics(): readonly Topic[] {
  return TOPICS;
}

async function readStub(topic: Topic): Promise<string> {
  const file = join(guidelinesDir, `${topic}.md`);
  if (!existsSync(file)) {
    throw new Error(`Guideline file missing: ${topic}.md`);
  }
  return readFile(file, "utf8");
}

export const getCodingGuidelines: ToolDefinition<typeof inputSchema> = {
  name: "get_coding_guidelines",
  description:
    "Return Moodle coding-guideline notes for a topic. Call with no topic to list available topics.",
  inputSchema,
  async run(input) {
    if (!input.topic) {
      return { topics: [...TOPICS] };
    }
    const content = await readStub(input.topic);
    return { topic: input.topic, content };
  },
};
