import { describe, it, expect, vi } from "vitest";
import { findCapability } from "../../../src/tools/codebase/findCapability.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    {
      file: "mod/quiz/db/access.php",
      line: 42,
      snippet: "    'mod/quiz:view' => array(",
    },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("findCapability", () => {
  it("locates capability declarations in db/access.php files", async () => {
    const out = await findCapability.run({ capability: "mod/quiz:view" });
    expect(out.results).toEqual([
      { file: "mod/quiz/db/access.php", line: 42, snippet: "    'mod/quiz:view' => array(" },
    ]);
  });

  it("rejects empty capability name via schema", () => {
    expect(() => findCapability.inputSchema.parse({ capability: "" })).toThrow();
  });
});
