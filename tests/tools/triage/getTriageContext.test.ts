import { describe, it, expect } from "vitest";
import { getTriageContext } from "../../../src/tools/triage/getTriageContext.js";

describe("getTriageContext", () => {
  it("returns Jira orchestrator instruction + checklist", async () => {
    const out = await getTriageContext.run({ mdlIssue: "MDL-12345" });
    expect(out.mdlIssue).toBe("MDL-12345");
    expect(out.instruction).toMatch(/jira/i);
    expect(out.checklist).toContain("Moodle Issue Triage Checklist");
  });

  it("rejects malformed issue keys via schema", () => {
    expect(() => getTriageContext.inputSchema.parse({ mdlIssue: "foo" })).toThrow();
  });
});
