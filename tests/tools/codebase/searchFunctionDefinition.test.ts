import { describe, it, expect, vi } from "vitest";
import { searchFunctionDefinition } from "../../../src/tools/codebase/searchFunctionDefinition.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async ({ pattern }) => {
    if (pattern.includes("function\\s+get_records")) {
      return [
        {
          file: "lib/datalib.php",
          line: 100,
          snippet: "function get_records(string $table): array {",
        },
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

describe("searchFunctionDefinition", () => {
  it("returns definitions parsed from rg output", async () => {
    const out = await searchFunctionDefinition.run({ functionName: "get_records" });
    expect(out.results).toEqual([
      {
        file: "lib/datalib.php",
        line: 100,
        signature: "function get_records(string $table): array",
      },
    ]);
  });

  it("rejects non-identifier function names via schema", () => {
    expect(() => searchFunctionDefinition.inputSchema.parse({ functionName: "drop table" })).toThrow();
  });
});
