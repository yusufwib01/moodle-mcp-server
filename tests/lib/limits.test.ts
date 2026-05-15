import { describe, it, expect } from "vitest";
import { sliceLines, capResults, DEFAULT_FILE_LIMIT, DEFAULT_SEARCH_LIMIT } from "../../src/lib/limits.js";

describe("sliceLines", () => {
  const lines = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`);

  it("returns the first DEFAULT_FILE_LIMIT lines when no options given", () => {
    const out = sliceLines(lines);
    expect(out.lines).toHaveLength(DEFAULT_FILE_LIMIT);
    expect(out.totalLines).toBe(1000);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain("offset=500");
  });

  it("honors offset and limit", () => {
    const out = sliceLines(lines, { offset: 100, limit: 50 });
    expect(out.lines[0]).toBe("line 101");
    expect(out.lines).toHaveLength(50);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain("offset=150");
  });

  it("reports no truncation when the slice exhausts the input", () => {
    const out = sliceLines(lines, { offset: 990, limit: 50 });
    expect(out.lines).toHaveLength(10);
    expect(out.truncated).toBe(false);
    expect(out.hint).toBeUndefined();
  });

  it("rejects negative offset", () => {
    expect(() => sliceLines(lines, { offset: -1 })).toThrow(/offset/);
  });
});

describe("capResults", () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

  it("caps at DEFAULT_SEARCH_LIMIT by default", () => {
    const out = capResults(items);
    expect(out.results).toHaveLength(DEFAULT_SEARCH_LIMIT);
    expect(out.totalMatches).toBe(100);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain(`offset=${DEFAULT_SEARCH_LIMIT}`);
  });

  it("honors offset and limit", () => {
    const out = capResults(items, { offset: 30, limit: 10 });
    expect(out.results[0]).toEqual({ id: 30 });
    expect(out.results).toHaveLength(10);
    expect(out.truncated).toBe(true);
  });

  it("returns no hint when not truncated", () => {
    const out = capResults(items.slice(0, 5));
    expect(out.truncated).toBe(false);
    expect(out.hint).toBeUndefined();
  });
});
