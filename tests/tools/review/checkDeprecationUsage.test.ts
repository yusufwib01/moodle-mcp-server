import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDeprecationUsage, setDeprecatedJsonPathForTests } from "../../../src/tools/review/checkDeprecationUsage.js";

describe("checkDeprecationUsage", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;
  let jsonPath: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "dep-")));
    await mkdir(join(root, "mod", "quiz"), { recursive: true });
    await writeFile(
      join(root, "mod", "quiz", "lib.php"),
      `<?php\nold_function_a();\nfresh_one();\n`,
    );
    process.env.MOODLE_ROOT = root;
    jsonPath = join(root, "deprecated.json");
    setDeprecatedJsonPathForTests(jsonPath);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    setDeprecatedJsonPathForTests(undefined);
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns notConfigured when the JSON does not exist", async () => {
    const out = await checkDeprecationUsage.run({ filePath: "mod/quiz/lib.php" });
    expect(out.notConfigured).toBe(true);
  });

  it("finds usages when JSON is present", async () => {
    await writeFile(
      jsonPath,
      JSON.stringify({
        items: [{ name: "old_function_a", since: "4.0", note: "use new_function_a" }],
      }),
    );
    const out = await checkDeprecationUsage.run({ filePath: "mod/quiz/lib.php" });
    expect(out.notConfigured).toBeFalsy();
    expect(out.findings?.[0].name).toBe("old_function_a");
    expect(out.findings?.[0].lines).toContain(2);
  });
});
