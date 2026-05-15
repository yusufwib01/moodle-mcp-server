import { describe, it, expect, vi } from "vitest";
import { findLangString } from "../../../src/tools/codebase/findLangString.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    {
      file: "mod/quiz/lang/en/quiz.php",
      line: 12,
      snippet: "$string['pluginname'] = 'Quiz';",
    },
    {
      file: "lang/en/moodle.php",
      line: 800,
      snippet: "$string['pluginname'] = 'Plugin name';",
    },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("findLangString", () => {
  it("locates $string['key'] assignments across lang files", async () => {
    const out = await findLangString.run({ key: "pluginname" });
    expect(out.results).toHaveLength(2);
    expect(out.results[0].file).toBe("mod/quiz/lang/en/quiz.php");
  });

  it("rejects empty key via schema", () => {
    expect(() => findLangString.inputSchema.parse({ key: "" })).toThrow();
  });
});
