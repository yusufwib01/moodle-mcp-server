import { describe, it, expect } from "vitest";
import { getClrChecklist } from "../../../src/tools/clr/getClrChecklist.js";

describe("getClrChecklist", () => {
  it("returns the general checklist when requested", async () => {
    const out = await getClrChecklist.run({ type: "general" });
    expect(out.type).toBe("general");
    expect(out.content).toContain("CLR");
  });

  it("schema defaults type to general", () => {
    expect(getClrChecklist.inputSchema.parse({}).type).toBe("general");
  });

  it("returns the db checklist when requested", async () => {
    const out = await getClrChecklist.run({ type: "db" });
    expect(out.type).toBe("db");
    expect(out.content).toBeTruthy();
  });

  it("rejects unknown types via schema", () => {
    expect(() => getClrChecklist.inputSchema.parse({ type: "nope" })).toThrow();
  });
});
