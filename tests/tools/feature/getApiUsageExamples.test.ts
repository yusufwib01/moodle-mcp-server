import { describe, it, expect, vi } from "vitest";
import { getApiUsageExamples } from "../../../src/tools/feature/getApiUsageExamples.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    { file: "mod/quiz/lib.php", line: 30, snippet: "$DB->get_records('quiz', ['id' => $id]);" },
    { file: "lib/datalib.php", line: 12, snippet: "return $DB->get_records('user');" },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("getApiUsageExamples", () => {
  it("returns up to 5 snippets", async () => {
    const out = await getApiUsageExamples.run({ apiFunction: "$DB->get_records" });
    expect(out.examples.length).toBeGreaterThan(0);
    expect(out.examples[0]).toHaveProperty("file");
    expect(out.examples[0]).toHaveProperty("line");
    expect(out.examples[0]).toHaveProperty("snippet");
  });
});
