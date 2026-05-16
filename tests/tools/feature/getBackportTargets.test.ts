import { describe, it, expect } from "vitest";
import { getBackportTargets } from "../../../src/tools/feature/getBackportTargets.js";

describe("getBackportTargets", () => {
  it("security fixes target main + all supported stables (general + security-only)", async () => {
    const out = await getBackportTargets.run({
      issueType: "security",
      isRegression: false,
      asOf: "2026-05-16",
    });
    expect(out.targets).toEqual([
      "main",
      "MOODLE_502_STABLE",
      "MOODLE_501_STABLE",
      "MOODLE_500_STABLE",
      "MOODLE_405_STABLE",
    ]);
  });

  it("accessibility fixes follow the same policy as security", async () => {
    const out = await getBackportTargets.run({
      issueType: "accessibility",
      isRegression: false,
      asOf: "2026-05-16",
    });
    expect(out.targets).toEqual([
      "main",
      "MOODLE_502_STABLE",
      "MOODLE_501_STABLE",
      "MOODLE_500_STABLE",
      "MOODLE_405_STABLE",
    ]);
  });

  it("regression bugs target main + every general-support stable only", async () => {
    const out = await getBackportTargets.run({
      issueType: "bug",
      isRegression: true,
      asOf: "2026-05-16",
    });
    expect(out.targets).toEqual(["main", "MOODLE_502_STABLE", "MOODLE_501_STABLE"]);
  });

  it("non-regression bugs target main + latest general-support stable only", async () => {
    const out = await getBackportTargets.run({
      issueType: "bug",
      isRegression: false,
      asOf: "2026-05-16",
    });
    expect(out.targets).toEqual(["main", "MOODLE_502_STABLE"]);
  });

  it("new features target main only", async () => {
    const out = await getBackportTargets.run({
      issueType: "new_feature",
      isRegression: false,
      asOf: "2026-05-16",
    });
    expect(out.targets).toEqual(["main"]);
  });

  it("override arrays bypass the bundled support matrix", async () => {
    const out = await getBackportTargets.run({
      issueType: "security",
      isRegression: false,
      overrideGeneralSupport: ["6.0"],
      overrideSecurityOnly: [],
    });
    expect(out.targets).toEqual(["main", "MOODLE_600_STABLE"]);
  });
});
