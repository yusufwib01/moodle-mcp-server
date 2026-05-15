import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot, safeJoin, PathSafetyError } from "../../src/lib/paths.js";

describe("resolveRoot", () => {
  const originalEnv = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "moodle-root-")));
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalEnv === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalEnv;
  });

  it("returns MOODLE_ROOT when no override provided", () => {
    expect(resolveRoot()).toBe(root);
  });

  it("uses the override when provided", async () => {
    const other = await realpath(await mkdtemp(join(tmpdir(), "moodle-root-other-")));
    try {
      expect(resolveRoot(other)).toBe(other);
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });

  it("throws when MOODLE_ROOT is missing and no override is given", () => {
    delete process.env.MOODLE_ROOT;
    expect(() => resolveRoot()).toThrow(PathSafetyError);
  });

  it("throws when the resolved root does not exist", () => {
    expect(() => resolveRoot("/this/does/not/exist/anywhere")).toThrow(PathSafetyError);
  });
});

describe("safeJoin", () => {
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "moodle-safe-")));
    await mkdir(join(root, "lib"), { recursive: true });
    await writeFile(join(root, "lib", "datalib.php"), "<?php\n");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("joins a relative path inside the root", () => {
    expect(safeJoin(root, "lib/datalib.php")).toBe(join(root, "lib", "datalib.php"));
  });

  it("rejects traversal with ..", () => {
    expect(() => safeJoin(root, "../escape.php")).toThrow(PathSafetyError);
  });

  it("rejects absolute paths outside the root", () => {
    expect(() => safeJoin(root, "/etc/passwd")).toThrow(PathSafetyError);
  });

  it("rejects null bytes in the input", () => {
    expect(() => safeJoin(root, "lib/data\u0000lib.php")).toThrow(PathSafetyError);
  });

  it("rejects symlinks that escape the root", async () => {
    const outside = await realpath(await mkdtemp(join(tmpdir(), "moodle-outside-")));
    await writeFile(join(outside, "secret.txt"), "secret");
    await symlink(join(outside, "secret.txt"), join(root, "leak"));
    try {
      expect(() => safeJoin(root, "leak")).toThrow(PathSafetyError);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
