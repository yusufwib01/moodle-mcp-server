import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const checklistFile = join(here, "..", "..", "..", "guidelines", "triage_checklist.md");

const inputSchema = z.object({
  mdlIssue: z.string().regex(/^MDL-\d+$/, "Expected MDL issue key, e.g. MDL-12345."),
});

export const getTriageContext: ToolDefinition<typeof inputSchema> = {
  name: "get_triage_context",
  description:
    "Bundle the triage checklist plus an orchestrator instruction telling Claude to fetch the issue from the Jira MCP and walk it through the screening flow. Pair with suggest_triage_outcome on the issue's description.",
  inputSchema,
  async run(input) {
    const checklist = await readFile(checklistFile, "utf8");
    return {
      mdlIssue: input.mdlIssue,
      instruction:
        `Call the Jira MCP to fetch ${input.mdlIssue} (summary, description, reporter, affected versions, components, current labels). ` +
        `Pass the description into suggest_triage_outcome to get a heuristic classification. ` +
        `Apply the checklist below; if you decide on a Close outcome, pull the matching canned response with get_triage_canned_response.`,
      checklist,
    };
  },
};
