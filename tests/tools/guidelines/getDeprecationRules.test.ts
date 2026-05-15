import { describe, it, expect } from "vitest";
import { getDeprecationRules } from "../../../src/tools/guidelines/getDeprecationRules.js";

describe("getDeprecationRules", () => {
  it("returns the stub content", async () => {
    const out = await getDeprecationRules.run({});
    expect(out.content).toContain("Deprecation");
  });
});
