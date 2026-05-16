import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "..", "..", "guidelines", "triage_canned_responses.md");

const TEMPLATES = [
  "support_request",
  "administrator_contact",
  "contributed_plugin",
  "duplicate",
  "unsupported_version",
  "en_fix",
  "translation_request",
  "already_possible",
  "triaged_bug",
  "triaged_improvement",
  "triaged_security",
  "need_more_info",
] as const;

const inputSchema = z.object({
  template: z.enum(TEMPLATES).optional().describe("Template name. Omit to list available templates."),
});

function extractTemplate(content: string, template: string): string | null {
  const lines = content.split("\n");
  const header = `## ${template}`;
  const startIdx = lines.findIndex((l) => l.trim() === header);
  if (startIdx === -1) return null;
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.trim() === "---");
  const slice = lines.slice(startIdx, endIdx === -1 ? undefined : endIdx).join("\n");
  return slice.trim();
}

export const getTriageCannedResponse: ToolDefinition<typeof inputSchema> = {
  name: "get_triage_canned_response",
  description:
    "Return a Moodle tracker canned response template by name (e.g. support_request, duplicate, contributed_plugin). Omit `template` to list all templates.",
  inputSchema,
  async run(input) {
    if (!input.template) {
      return { templates: [...TEMPLATES] };
    }
    const content = await readFile(file, "utf8");
    const extracted = extractTemplate(content, input.template);
    if (!extracted) {
      throw new Error(`Template not found: ${input.template}`);
    }
    return { template: input.template, content: extracted };
  },
};
