import { describe, it, expect, vi } from "vitest";
import { searchMoodleCodebase } from "../../../src/tools/codebase/searchMoodleCodebase.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    { file: "lib/datalib.php", line: 12, snippet: "function get_records()" },
    { file: "mod/quiz/lib.php", line: 8, snippet: "use get_records;" },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake/root",
  PathSafetyError: class extends Error {},
}));

describe("searchMoodleCodebase tool", () => {
  it("returns paginated rg results", async () => {
    const out = await searchMoodleCodebase.run({ query: "get_records" });
    expect(out.results).toHaveLength(2);
    expect(out.totalMatches).toBe(2);
    expect(out.truncated).toBe(false);
  });

  it("rejects empty query via input schema", () => {
    expect(() => searchMoodleCodebase.inputSchema.parse({ query: "" })).toThrow();
  });
});
