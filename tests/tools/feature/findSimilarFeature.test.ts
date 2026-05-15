import { describe, it, expect, vi } from "vitest";
import { findSimilarFeature } from "../../../src/tools/feature/findSimilarFeature.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async ({ pattern }: { pattern: string }) => {
    if (pattern === "grade_export") {
      return [{ file: "grade/export/lib.php", line: 10, snippet: "class grade_export {" }];
    }
    if (pattern === "csv") {
      return [{ file: "grade/export/csv/classes/csv.php", line: 5, snippet: "// csv" }];
    }
    return [];
  }),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("findSimilarFeature", () => {
  it("returns hits deduped across keywords", async () => {
    const out = await findSimilarFeature.run({ description: "grade_export csv" });
    const files = out.results.map((r) => r.file).sort();
    expect(files).toEqual(["grade/export/csv/classes/csv.php", "grade/export/lib.php"]);
  });
});
