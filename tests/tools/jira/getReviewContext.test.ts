import { describe, it, expect } from "vitest";
import { getReviewContext } from "../../../src/tools/jira/getReviewContext.js";

describe("getReviewContext", () => {
  it("returns instruction + checklist", async () => {
    const out = await getReviewContext.run({ mdlIssue: "MDL-99999" });
    expect(out.instruction).toMatch(/jira/i);
    expect(out.mdlIssue).toBe("MDL-99999");
    expect(out.reviewChecklist).toBeTruthy();
    expect(out.componentFiles).toEqual([]);
  });

  it("rejects malformed issue keys via schema", () => {
    expect(() => getReviewContext.inputSchema.parse({ mdlIssue: "foo" })).toThrow();
  });
});
