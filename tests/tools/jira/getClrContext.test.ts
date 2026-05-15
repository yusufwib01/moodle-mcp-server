import { describe, it, expect } from "vitest";
import { getClrContext } from "../../../src/tools/jira/getClrContext.js";

describe("getClrContext", () => {
  it("returns instruction + checklist", async () => {
    const out = await getClrContext.run({ mdlIssue: "MDL-99999" });
    expect(out.instruction).toMatch(/jira/i);
    expect(out.mdlIssue).toBe("MDL-99999");
    expect(out.clrChecklist).toBeTruthy();
    expect(out.componentFiles).toEqual([]);
  });

  it("rejects malformed issue keys via schema", () => {
    expect(() => getClrContext.inputSchema.parse({ mdlIssue: "foo" })).toThrow();
  });
});
