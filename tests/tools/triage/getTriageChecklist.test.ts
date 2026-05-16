import { describe, it, expect } from "vitest";
import { getTriageChecklist } from "../../../src/tools/triage/getTriageChecklist.js";

describe("getTriageChecklist", () => {
  it("returns the Moodle triage checklist content", async () => {
    const out = await getTriageChecklist.run({});
    expect(out.content).toContain("Moodle Issue Triage Checklist");
    expect(out.content).toContain("Support request");
    expect(out.content).toContain("Duplicate");
  });
});
