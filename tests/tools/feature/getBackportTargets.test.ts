import { describe, it, expect } from "vitest";
import { getBackportTargets } from "../../../src/tools/feature/getBackportTargets.js";

describe("getBackportTargets", () => {
  it("security fixes target main + all supported stables", async () => {
    const out = await getBackportTargets.run({
      issueType: "security",
      isRegression: false,
      supportedStables: ["405", "404"],
    });
    expect(out.targets).toEqual(["main", "MOODLE_405_STABLE", "MOODLE_404_STABLE"]);
  });

  it("regression bugs target main + all supported stables", async () => {
    const out = await getBackportTargets.run({
      issueType: "bug",
      isRegression: true,
      supportedStables: ["405", "404"],
    });
    expect(out.targets).toEqual(["main", "MOODLE_405_STABLE", "MOODLE_404_STABLE"]);
  });

  it("non-regression bugs target main + latest stable only", async () => {
    const out = await getBackportTargets.run({
      issueType: "bug",
      isRegression: false,
      supportedStables: ["405", "404"],
    });
    expect(out.targets).toEqual(["main", "MOODLE_405_STABLE"]);
  });

  it("new features target main only", async () => {
    const out = await getBackportTargets.run({
      issueType: "new_feature",
      isRegression: false,
      supportedStables: ["405", "404"],
    });
    expect(out.targets).toEqual(["main"]);
  });
});
