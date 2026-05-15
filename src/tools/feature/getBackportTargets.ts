import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const issueType = z.enum([
  "bug",
  "security",
  "improvement",
  "new_feature",
  "task",
  "epic",
  "subtask",
]);

const inputSchema = z.object({
  issueType,
  isRegression: z
    .boolean()
    .default(false)
    .describe("True if the bug is a regression introduced after the latest LTS branched."),
  supportedStables: z
    .array(z.string().regex(/^[0-9]+$/, "Stable version must be numeric, e.g. 405."))
    .default(["405", "404"])
    .describe(
      "Currently supported stable branches as numeric tags, e.g. ['405', '404']. Override per call.",
    ),
});

export const getBackportTargets: ToolDefinition<typeof inputSchema> = {
  name: "get_backport_targets",
  description:
    "Return the Moodle branches a patch should land on per the backport policy, given the issue type and the currently supported stables. Defaults to ['405','404'] — override for your current support window.",
  inputSchema,
  async run(input) {
    const stableBranches = input.supportedStables
      .map((v) => `MOODLE_${v}_STABLE`)
      .sort((a, b) => b.localeCompare(a));
    let targets: string[];
    let rationale: string;

    switch (input.issueType) {
      case "security":
        targets = ["main", ...stableBranches];
        rationale =
          "Security fixes land on main and every supported stable, coordinated through Moodle's security workflow.";
        break;
      case "bug":
        if (input.isRegression) {
          targets = ["main", ...stableBranches];
          rationale =
            "Regressions land on main and every supported stable so users on stable do not lose a feature that worked.";
        } else {
          targets = ["main", stableBranches[0]].filter(Boolean) as string[];
          rationale =
            "Non-regression bug fixes land on main and the latest stable. Older stables only get the fix if they reproduce and the fix is low-risk.";
        }
        break;
      case "new_feature":
      case "improvement":
      case "epic":
        targets = ["main"];
        rationale = "New features and improvements only land on main.";
        break;
      case "task":
      case "subtask":
        targets = ["main"];
        rationale =
          "Tasks/subtasks usually follow the parent issue type — override by changing issueType if this is a backportable bug fix.";
        break;
    }

    return {
      issueType: input.issueType,
      isRegression: input.isRegression,
      supportedStables: input.supportedStables,
      targets,
      rationale,
      branchSuffixHint:
        "Branch names follow MDL-XXXXX_<target> — e.g. MDL-12345_main, MDL-12345_405, MDL-12345_404.",
    };
  },
};
