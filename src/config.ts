import { resolveRoot } from "./lib/paths.js";

export interface ServerConfig {
  defaultRoot: string;
  ripgrepTimeoutMs: number;
}

export function getServerConfig(): ServerConfig {
  const defaultRoot = resolveRoot();
  const raw = process.env.MOODLE_MCP_RG_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : 10_000;
  const ripgrepTimeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
  return { defaultRoot, ripgrepTimeoutMs };
}
