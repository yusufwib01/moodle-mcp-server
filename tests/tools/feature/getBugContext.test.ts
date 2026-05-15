import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getBugContext } from "../../../src/tools/feature/getBugContext.js";

describe("getBugContext", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "bug-ctx-")));
    await mkdir(join(root, "mod", "quiz"), { recursive: true });
    await writeFile(
      join(root, "mod", "quiz", "lib.php"),
      `<?php\nfunction quiz_add_instance() { return 1; }\nfunction quiz_update_instance() { return 2; }\n`,
    );
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns instruction, file preview, and functions when filePath provided", async () => {
    const out = await getBugContext.run({ mdlIssue: "MDL-12345", filePath: "mod/quiz/lib.php" });
    expect(out.instruction).toMatch(/jira/i);
    expect(out.mdlIssue).toBe("MDL-12345");
    expect(out.file?.filePath).toBe("mod/quiz/lib.php");
    expect(out.functions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "quiz_add_instance" }),
        expect.objectContaining({ name: "quiz_update_instance" }),
      ]),
    );
  });

  it("works without filePath", async () => {
    const out = await getBugContext.run({ mdlIssue: "MDL-1" });
    expect(out.instruction).toMatch(/jira/i);
    expect(out.file).toBeUndefined();
  });
});
