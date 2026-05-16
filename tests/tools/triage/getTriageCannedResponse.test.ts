import { describe, it, expect } from "vitest";
import { getTriageCannedResponse } from "../../../src/tools/triage/getTriageCannedResponse.js";

describe("getTriageCannedResponse", () => {
  it("lists available templates when none requested", async () => {
    const out = await getTriageCannedResponse.run({});
    expect(out.templates).toEqual(
      expect.arrayContaining([
        "support_request",
        "duplicate",
        "contributed_plugin",
        "unsupported_version",
        "need_more_info",
      ]),
    );
  });

  it("returns a specific template body", async () => {
    const out = await getTriageCannedResponse.run({ template: "duplicate" });
    expect(out.template).toBe("duplicate");
    expect(out.content).toContain("Duplicate");
    expect(out.content).toContain("MDL-XXXXX");
  });

  it("rejects unknown templates via schema", () => {
    expect(() => getTriageCannedResponse.inputSchema.parse({ template: "nope" })).toThrow();
  });
});
