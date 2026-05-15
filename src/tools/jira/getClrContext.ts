import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const checklistFile = join(here, "..", "..", "..", "guidelines", "clr_checklist_general.md");

const inputSchema = z.object({
  mdlIssue: z.string().regex(/^MDL-\d+$/, "Expected MDL issue key, e.g. MDL-12345."),
});

export const getClrContext: ToolDefinition<typeof inputSchema> = {
  name: "get_clr_context",
  description:
    "Bundle the CLR checklist plus an orchestrator instruction telling Claude to fetch the issue from the Jira MCP and then optionally call list_component_files for any components in scope.",
  inputSchema,
  async run(input) {
    const clrChecklist = await readFile(checklistFile, "utf8");
    return {
      mdlIssue: input.mdlIssue,
      instruction:
        `Call the Jira MCP to fetch ${input.mdlIssue} (summary, description, affected components). ` +
        `For each affected component, call list_component_files on this server to surface its files, ` +
        `then review the patch against the checklist below.`,
      componentFiles: [] as Array<{ component: string; files: string[] }>,
      clrChecklist,
    };
  },
};
