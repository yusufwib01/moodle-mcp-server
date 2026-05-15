import { describe, it, expect } from "vitest";
import { getIntegrationWorkflowHelpers } from "../../../src/tools/jira/getIntegrationWorkflowHelpers.js";

describe("getIntegrationWorkflowHelpers", () => {
  it("returns docs, tools, and git aliases", async () => {
    const out = await getIntegrationWorkflowHelpers.run({});
    expect(out.docs.peerReview).toContain("moodledev.io");
    expect(out.tools.map((t) => t.name)).toEqual(["CIBot", "TOBIC", "moodle-userscripts"]);
    expect(out.gitAliases.map((g) => g.alias)).toEqual([
      "integration-reset",
      "integration-diff",
      "integration-wdiff",
    ]);
    expect(out.workflow.length).toBeGreaterThan(0);
  });
});
