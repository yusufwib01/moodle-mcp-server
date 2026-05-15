import { describe, it, expect, vi } from "vitest";
import { traceCallPath } from "../../../src/tools/codebase/traceCallPath.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async ({ pattern }: { pattern: string }) => {
    if (pattern.startsWith("function\\s+")) {
      return [{ file: "lib/datalib.php", line: 5, snippet: "function quiz_add_instance() {" }];
    }
    if (pattern.startsWith("\\b")) {
      return [
        { file: "mod/quiz/lib.php", line: 12, snippet: "quiz_add_instance($data);" },
        { file: "mod/quiz/locallib.php", line: 88, snippet: "$id = quiz_add_instance($d);" },
      ];
    }
    return [];
  }),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake/root",
  PathSafetyError: class extends Error {},
}));

describe("traceCallPath", () => {
  it("returns definitions and callers, excluding definition file lines from callers", async () => {
    const out = await traceCallPath.run({ functionName: "quiz_add_instance" });
    expect(out.definitions).toEqual([
      { file: "lib/datalib.php", line: 5, signature: "function quiz_add_instance()" },
    ]);
    expect(out.callers.results).toEqual([
      { file: "mod/quiz/lib.php", line: 12, snippet: "quiz_add_instance($data);" },
      { file: "mod/quiz/locallib.php", line: 88, snippet: "$id = quiz_add_instance($d);" },
    ]);
  });
});
