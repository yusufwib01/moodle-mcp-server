import { describe, it, expect } from "vitest";
import { getMoodleReleases } from "../../../src/tools/feature/getMoodleReleases.js";

describe("getMoodleReleases", () => {
  it("returns the support snapshot for a given date", async () => {
    const out = await getMoodleReleases.run({ asOf: "2026-05-16" });
    expect(out.generalSupport).toEqual(["5.2", "5.1"]);
    expect(out.securityOnly).toEqual(["5.0", "4.5"]);
    expect(out.future).toEqual(["5.3"]);
    expect(out.releases.length).toBeGreaterThan(0);
  });

  it("rejects malformed dates via schema", () => {
    expect(() => getMoodleReleases.inputSchema.parse({ asOf: "May 2026" })).toThrow();
  });
});
