import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getServerConfig } from "../src/config.js";

describe("getServerConfig", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "config-root-")));
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns the default root from env", () => {
    const cfg = getServerConfig();
    expect(cfg.defaultRoot).toBe(root);
    expect(cfg.ripgrepTimeoutMs).toBeGreaterThan(0);
  });

  it("respects MOODLE_MCP_RG_TIMEOUT_MS when set", () => {
    process.env.MOODLE_MCP_RG_TIMEOUT_MS = "1234";
    try {
      const cfg = getServerConfig();
      expect(cfg.ripgrepTimeoutMs).toBe(1234);
    } finally {
      delete process.env.MOODLE_MCP_RG_TIMEOUT_MS;
    }
  });
});
