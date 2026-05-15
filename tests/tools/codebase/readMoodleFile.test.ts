import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMoodleFile } from "../../../src/tools/codebase/readMoodleFile.js";

describe("readMoodleFile", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "read-file-")));
    await mkdir(join(root, "lib"), { recursive: true });
    const content = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join("\n");
    await writeFile(join(root, "lib", "datalib.php"), content);
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns the first 500 lines by default with truncation metadata", async () => {
    const out = await readMoodleFile.run({ filePath: "lib/datalib.php" });
    expect(out.totalLines).toBe(600);
    expect(out.lines).toHaveLength(500);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain("offset=500");
  });

  it("honors offset and limit", async () => {
    const out = await readMoodleFile.run({ filePath: "lib/datalib.php", offset: 595, limit: 10 });
    expect(out.lines).toHaveLength(5);
    expect(out.lines[0]).toBe("line 596");
    expect(out.truncated).toBe(false);
  });

  it("rejects traversal", async () => {
    await expect(
      readMoodleFile.run({ filePath: "../escape.txt" }),
    ).rejects.toThrow();
  });

  it("throws a NotFound style error for missing files", async () => {
    await expect(
      readMoodleFile.run({ filePath: "lib/missing.php" }),
    ).rejects.toThrow(/not found/i);
  });
});
