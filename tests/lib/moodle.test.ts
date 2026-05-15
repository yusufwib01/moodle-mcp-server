import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveComponentPath, ComponentResolveError } from "../../src/lib/moodle.js";

async function makeFakeMoodle(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "fake-moodle-")));
  await mkdir(join(root, "mod", "quiz"), { recursive: true });
  await mkdir(join(root, "blocks", "html"), { recursive: true });
  await mkdir(join(root, "local", "foo"), { recursive: true });
  await mkdir(join(root, "course"), { recursive: true });
  await mkdir(join(root, "lib"), { recursive: true });
  await writeFile(join(root, "mod", "quiz", "lib.php"), "<?php\n");
  await writeFile(join(root, "blocks", "html", "block_html.php"), "<?php\n");
  await writeFile(join(root, "local", "foo", "version.php"), "<?php\n");
  return root;
}

describe("resolveComponentPath", () => {
  it("resolves mod_* to mod/<name>", async () => {
    const root = await makeFakeMoodle();
    try {
      expect(resolveComponentPath(root, "mod_quiz")).toBe(join(root, "mod", "quiz"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves block_* to blocks/<name>", async () => {
    const root = await makeFakeMoodle();
    try {
      expect(resolveComponentPath(root, "block_html")).toBe(join(root, "blocks", "html"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves local_* to local/<name>", async () => {
    const root = await makeFakeMoodle();
    try {
      expect(resolveComponentPath(root, "local_foo")).toBe(join(root, "local", "foo"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves core_course to course/", async () => {
    const root = await makeFakeMoodle();
    try {
      expect(resolveComponentPath(root, "core_course")).toBe(join(root, "course"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves bare core to lib/", async () => {
    const root = await makeFakeMoodle();
    try {
      expect(resolveComponentPath(root, "core")).toBe(join(root, "lib"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("throws ComponentResolveError on unknown plugin types", async () => {
    const root = await makeFakeMoodle();
    try {
      expect(() => resolveComponentPath(root, "xyz_foo")).toThrow(ComponentResolveError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("throws when the resolved directory does not exist", async () => {
    const root = await makeFakeMoodle();
    try {
      expect(() => resolveComponentPath(root, "mod_nonexistent")).toThrow(ComponentResolveError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
