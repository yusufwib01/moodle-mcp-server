import { describe, it, expect, vi } from "vitest";
import { findSimilarImplementations } from "../../../src/tools/review/findSimilarImplementations.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    { file: "a.php", line: 1, snippet: "match a" },
    { file: "a.php", line: 5, snippet: "match a again" },
    { file: "b.php", line: 2, snippet: "match b" },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("findSimilarImplementations", () => {
  it("dedupes to first match per file", async () => {
    const out = await findSimilarImplementations.run({ pattern: "match" });
    expect(out.results.map((r) => r.file)).toEqual(["a.php", "b.php"]);
  });
});
