import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listComponentFiles } from "../../../src/tools/codebase/listComponentFiles.js";

describe("listComponentFiles", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "list-comp-")));
    await mkdir(join(root, "mod", "quiz", "db"), { recursive: true });
    await mkdir(join(root, "mod", "quiz", "classes"), { recursive: true });
    await writeFile(join(root, "mod", "quiz", "lib.php"), "");
    await writeFile(join(root, "mod", "quiz", "version.php"), "");
    await writeFile(join(root, "mod", "quiz", "db", "install.xml"), "");
    await writeFile(join(root, "mod", "quiz", "classes", "thing.php"), "");
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("lists files recursively under a component", async () => {
    const out = await listComponentFiles.run({ component: "mod_quiz" });
    const paths = out.results.map((r) => r.path).sort();
    expect(paths).toEqual(
      [
        "mod/quiz/classes/thing.php",
        "mod/quiz/db/install.xml",
        "mod/quiz/lib.php",
        "mod/quiz/version.php",
      ].sort(),
    );
  });

  it("rejects unknown components", async () => {
    await expect(listComponentFiles.run({ component: "mod_unknown" })).rejects.toThrow();
  });
});
