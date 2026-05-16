import { describe, it, expect } from "vitest";
import { snapshotSupport, getReleases, supportLevelOn } from "../../src/lib/moodleReleases.js";

describe("moodleReleases", () => {
  it("on 2026-05-16 reports 5.2 + 5.1 in general support, 5.0 + 4.5 in security only", () => {
    const snap = snapshotSupport(new Date("2026-05-16"));
    expect(snap.generalSupport.map((r) => r.version)).toEqual(["5.2", "5.1"]);
    expect(snap.securityOnly.map((r) => r.version)).toEqual(["5.0", "4.5"]);
    expect(snap.future.map((r) => r.version)).toEqual(["5.3"]);
  });

  it("classifies 5.3 as future before its release date", () => {
    expect(supportLevelOn(getReleases().find((r) => r.version === "5.3")!, new Date("2026-05-16"))).toBe(
      "future",
    );
  });

  it("classifies 4.5 as eol after security end", () => {
    expect(supportLevelOn(getReleases().find((r) => r.version === "4.5")!, new Date("2028-01-01"))).toBe(
      "eol",
    );
  });
});
