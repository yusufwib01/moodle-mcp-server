import { describe, it, expect } from "vitest";
import { getReviewChecklist } from "../../../src/tools/clr/getReviewChecklist.js";

describe("getReviewChecklist", () => {
  it("returns the general checklist when requested", async () => {
    const out = await getReviewChecklist.run({ type: "general" });
    expect(out.type).toBe("general");
    expect(out.content).toContain("Review Checklist");
  });

  it("schema defaults type to general", () => {
    expect(getReviewChecklist.inputSchema.parse({}).type).toBe("general");
  });

  it("returns the db checklist when requested", async () => {
    const out = await getReviewChecklist.run({ type: "db" });
    expect(out.type).toBe("db");
    expect(out.content).toBeTruthy();
  });

  it("rejects unknown types via schema", () => {
    expect(() => getReviewChecklist.inputSchema.parse({ type: "nope" })).toThrow();
  });
});
