import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { runRipgrep, RipgrepError } from "../../src/lib/ripgrep.js";

function makeFakeSpawn(stdoutLines: string[], stderr = "", exitCode = 0) {
  return vi.fn(() => {
    const proc = new EventEmitter() as any;
    proc.stdout = Readable.from(stdoutLines.map((l) => l + "\n"));
    proc.stderr = Readable.from([stderr]);
    proc.kill = vi.fn();
    setImmediate(() => proc.emit("close", exitCode));
    return proc;
  });
}

describe("runRipgrep", () => {
  it("parses match events into structured results", async () => {
    const fakeOutput = [
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "lib/datalib.php" },
          line_number: 42,
          lines: { text: "function get_records(): array {\n" },
        },
      }),
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "mod/quiz/lib.php" },
          line_number: 7,
          lines: { text: "use get_records;\n" },
        },
      }),
    ];
    const spawn = makeFakeSpawn(fakeOutput);
    const results = await runRipgrep({
      pattern: "get_records",
      root: "/tmp/fake",
      spawn,
    });
    expect(results).toEqual([
      { file: "lib/datalib.php", line: 42, snippet: "function get_records(): array {" },
      { file: "mod/quiz/lib.php", line: 7, snippet: "use get_records;" },
    ]);
    expect(spawn).toHaveBeenCalledWith(
      "rg",
      expect.arrayContaining(["--json", "get_records"]),
      expect.objectContaining({ cwd: "/tmp/fake" }),
    );
  });

  it("returns empty when ripgrep exits with code 1 (no matches)", async () => {
    const spawn = makeFakeSpawn([], "", 1);
    const results = await runRipgrep({ pattern: "nope", root: "/tmp", spawn });
    expect(results).toEqual([]);
  });

  it("throws on ripgrep error exit codes (>= 2)", async () => {
    const spawn = makeFakeSpawn([], "bad regex", 2);
    await expect(runRipgrep({ pattern: "[", root: "/tmp", spawn })).rejects.toThrow(RipgrepError);
  });

  it("passes a glob filter when provided", async () => {
    const spawn = makeFakeSpawn([]);
    await runRipgrep({ pattern: "x", root: "/tmp", glob: "*.php", spawn });
    const args = spawn.mock.calls[0][1] as string[];
    expect(args).toEqual(expect.arrayContaining(["--glob", "*.php"]));
  });

  it("kills the process on timeout", async () => {
    const proc = new EventEmitter() as any;
    proc.stdout = new Readable({ read() {} });
    proc.stderr = new Readable({ read() {} });
    proc.kill = vi.fn();
    const spawn = vi.fn(() => proc);
    const promise = runRipgrep({ pattern: "x", root: "/tmp", timeoutMs: 5, spawn });
    await expect(promise).rejects.toThrow(/timed out/);
    expect(proc.kill).toHaveBeenCalled();
  });
});
