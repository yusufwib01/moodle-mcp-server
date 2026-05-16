import { z } from "zod";
import { snapshotSupport } from "../../lib/moodleReleases.js";
import type { ToolDefinition } from "../types.js";

const issueType = z.enum([
  "bug",
  "security",
  "accessibility",
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
    .describe("True if the bug is a regression introduced after the latest release branched."),
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "asOf must be YYYY-MM-DD.")
    .optional()
    .describe("Date used to compute the active support window. Defaults to today."),
  overrideGeneralSupport: z
    .array(z.string())
    .optional()
    .describe(
      "Override the auto-detected general-support stables, e.g. ['5.2','5.1']. Use only if the bundled release matrix is out of date.",
    ),
  overrideSecurityOnly: z
    .array(z.string())
    .optional()
    .describe(
      "Override the auto-detected security-only stables. Use only if the bundled release matrix is out of date.",
    ),
});

function toStableTags(versions: string[]): string[] {
  return versions.map((v) => {
    const [major, minor] = v.split(".").map((n) => parseInt(n, 10));
    const tag = major * 100 + (Number.isFinite(minor) ? minor : 0);
    return `MOODLE_${tag}_STABLE`;
  });
}

export const getBackportTargets: ToolDefinition<typeof inputSchema> = {
  name: "get_backport_targets",
  description:
    "Return the Moodle branches a patch should land on per the backport policy. Uses the bundled release support matrix (sourced from moodledev.io/general/releases); pass asOf=YYYY-MM-DD or override arrays to test different windows.",
  inputSchema,
  async run(input) {
    const today = input.asOf ? new Date(input.asOf) : new Date();
    const snap = snapshotSupport(today);

    const generalVersions = input.overrideGeneralSupport ?? snap.generalSupport.map((r) => r.version);
    const securityOnlyVersions = input.overrideSecurityOnly ?? snap.securityOnly.map((r) => r.version);

    const generalStables = toStableTags(generalVersions);
    const securityOnlyStables = toStableTags(securityOnlyVersions);
    const allSupportedStables = [...generalStables, ...securityOnlyStables];

    let targets: string[];
    let rationale: string;

    switch (input.issueType) {
      case "security":
        targets = ["main", ...allSupportedStables];
        rationale =
          "Security fixes land on main and every branch still in general OR security support, coordinated through Moodle's security workflow.";
        break;
      case "accessibility":
        targets = ["main", ...allSupportedStables];
        rationale =
          "Accessibility fixes follow the same backport policy as security: main and every branch still in general OR security support.";
        break;
      case "bug":
        if (input.isRegression) {
          targets = ["main", ...generalStables];
          rationale =
            "Regressions land on main and every branch still in general support so users do not lose a feature that worked. Security-only branches receive regressions only when they are also security-relevant.";
        } else {
          targets = ["main", generalStables[0]].filter(Boolean) as string[];
          rationale =
            "Non-regression bug fixes land on main and the latest general-support stable. Older stables only get the fix if they reproduce and the fix is low-risk.";
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
          "Tasks/subtasks usually follow the parent issue type — override issueType if this is a backportable bug fix.";
        break;
    }

    return {
      issueType: input.issueType,
      isRegression: input.isRegression,
      asOf: today.toISOString().slice(0, 10),
      activeGeneralSupport: generalVersions,
      activeSecurityOnly: securityOnlyVersions,
      targets,
      rationale,
      branchSuffixHint:
        "Branch names follow MDL-XXXXX_<target> — e.g. MDL-12345_main, MDL-12345_502, MDL-12345_501.",
    };
  },
};
