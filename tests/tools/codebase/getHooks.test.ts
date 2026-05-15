import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getHooks } from "../../../src/tools/codebase/getHooks.js";

describe("getHooks", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "hooks-")));
    await mkdir(join(root, "mod", "quiz", "db"), { recursive: true });
    await writeFile(
      join(root, "mod", "quiz", "db", "hooks.php"),
      `<?php\n$callbacks = [\n  ['hook' => 'core\\\\hook\\\\after_config', 'callback' => 'mod_quiz\\\\listener::after_config'],\n];\n`,
    );
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns the raw hooks.php contents for a single component", async () => {
    const out = await getHooks.run({ component: "mod_quiz" });
    expect(out.entries?.[0].file).toBe("mod/quiz/db/hooks.php");
    expect(out.entries?.[0].content).toContain("after_config");
  });

  it("returns an empty list when no hooks file exists for the component", async () => {
    await mkdir(join(root, "mod", "lesson", "db"), { recursive: true });
    const out = await getHooks.run({ component: "mod_lesson" });
    expect(out.entries).toEqual([]);
  });
});
