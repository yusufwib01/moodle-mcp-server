import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rootSchema, paginationSchema, resolveCallRoot } from "../../src/tools/common.js";

describe("rootSchema and paginationSchema", () => {
  it("rootSchema accepts optional absolute string", () => {
    expect(rootSchema.parse(undefined)).toBeUndefined();
    expect(rootSchema.parse("/abs/path")).toBe("/abs/path");
  });

  it("paginationSchema rejects negative offset", () => {
    expect(() => paginationSchema.parse({ offset: -1 })).toThrow();
  });

  it("paginationSchema accepts empty input", () => {
    expect(paginationSchema.parse({})).toEqual({});
  });
});

describe("resolveCallRoot", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let envRoot: string;

  beforeEach(async () => {
    envRoot = await realpath(await mkdtemp(join(tmpdir(), "common-root-")));
    process.env.MOODLE_ROOT = envRoot;
  });

  afterEach(async () => {
    await rm(envRoot, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("falls back to MOODLE_ROOT when override absent", () => {
    expect(resolveCallRoot(undefined)).toBe(envRoot);
  });

  it("uses the override when provided", async () => {
    const other = await realpath(await mkdtemp(join(tmpdir(), "common-other-")));
    try {
      expect(resolveCallRoot(other)).toBe(other);
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });
});
