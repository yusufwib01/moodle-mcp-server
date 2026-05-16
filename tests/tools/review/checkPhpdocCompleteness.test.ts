import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPhpdocCompleteness } from "../../../src/tools/review/checkPhpdocCompleteness.js";

describe("checkPhpdocCompleteness", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "phpdoc-")));
    await mkdir(join(root, "lib"), { recursive: true });
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("flags functions without preceding PHPDoc", async () => {
    await writeFile(
      join(root, "lib", "test.php"),
      `<?php
/**
 * Documented.
 */
function documented() { return 1; }

function undocumented_one() { return 2; }

class Foo {
    /** documented method */
    public function ok() {}

    public function missing() {}
}
`,
    );
    const out = await checkPhpdocCompleteness.run({ filePath: "lib/test.php" });
    const names = out.findings.map((f) => f.name);
    expect(names).toEqual(["undocumented_one", "missing"]);
    expect(out.findings.find((f) => f.name === "missing")?.kind).toBe("method");
    expect(out.findings.find((f) => f.name === "undocumented_one")?.kind).toBe("function");
  });

  it("reports clean files", async () => {
    await writeFile(
      join(root, "lib", "clean.php"),
      `<?php
/** doc */
function only_one() { return 1; }
`,
    );
    const out = await checkPhpdocCompleteness.run({ filePath: "lib/clean.php" });
    expect(out.findings).toEqual([]);
    expect(out.summary).toContain("All");
  });
});
