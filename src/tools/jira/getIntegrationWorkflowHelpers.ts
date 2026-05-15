import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({});

export const getIntegrationWorkflowHelpers: ToolDefinition<typeof inputSchema> = {
  name: "get_integration_workflow_helpers",
  description:
    "Return references to the Moodle integration team tooling: CIBot, TOBIC, moodle-userscripts (TamperMonkey), and the standard git aliases used during integration review.",
  inputSchema,
  async run() {
    return {
      docs: {
        peerReview: "https://moodledev.io/general/development/process/peer-review",
        integration: "https://moodledev.io/general/development/process/integration",
        clr: "https://moodledev.io/general/development/process/integration/clr",
      },
      tools: [
        {
          name: "CIBot",
          purpose:
            "Posts continuous-integration results (phpunit, behat, codechecker, etc.) to the Moodle tracker as the patch progresses.",
        },
        {
          name: "TOBIC",
          purpose: "Testing-orchestration system used by the integration team to drive QA across branches.",
        },
        {
          name: "moodle-userscripts",
          purpose:
            "TamperMonkey scripts that add buttons + commands inside the Moodle tracker for the integrators' common workflows.",
          url: "https://github.com/danpoltawski/moodle-userscripts",
        },
      ],
      gitAliases: [
        {
          alias: "integration-reset",
          purpose: "Reset the local working tree to match the current integration branch state before review.",
          example:
            "git config alias.integration-reset '!sh -c \"git fetch integration && git checkout integration/main && git reset --hard FETCH_HEAD\"'",
        },
        {
          alias: "integration-diff",
          purpose: "Show the diff between the current state and the upstream integration branch for the patch under review.",
          example:
            "git config alias.integration-diff '!sh -c \"git diff integration/main\"'",
        },
        {
          alias: "integration-wdiff",
          purpose: "Word-level diff against the upstream integration branch — useful for spotting small textual changes.",
          example:
            "git config alias.integration-wdiff '!sh -c \"git diff --color-words integration/main\"'",
        },
      ],
      timeline: {
        normal:
          "Mon–Thu integration window; Friday is testing wrap-up. Integration merges what passed CI + CLR by EOD Thursday.",
        continuousIntegration:
          "Continuous integration / freeze periods prioritise issues that unblock QA or release.",
        onSync:
          "On-sync periods keep stable + main behaviour aligned; expect extra scrutiny on cross-branch diffs.",
      },
      workflow: [
        "Reset checkout to current integration branch (integration-reset).",
        "Pull the candidate patch.",
        "Review CIBot results in the tracker.",
        "Diff against upstream (integration-diff or integration-wdiff).",
        "Run the relevant phpunit + behat slices locally.",
        "Verify component maintainer + tracker labels.",
        "Approve and push when satisfied.",
      ],
    };
  },
};
