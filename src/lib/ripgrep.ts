import { spawn as nodeSpawn } from "node:child_process";
import type { ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { createInterface } from "node:readline";

export class RipgrepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RipgrepError";
  }
}

export interface RipgrepMatch {
  file: string;
  line: number;
  snippet: string;
}

export interface RipgrepOptions {
  pattern: string;
  root: string;
  glob?: string;
  fixedStrings?: boolean;
  timeoutMs?: number;
  spawn?: typeof nodeSpawn;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.MOODLE_MCP_RG_TIMEOUT_MS ?? 10_000);

interface RipgrepEvent {
  type: string;
  data?: {
    path?: { text?: string };
    line_number?: number;
    lines?: { text?: string };
  };
}

export async function runRipgrep(opts: RipgrepOptions): Promise<RipgrepMatch[]> {
  const spawnFn = opts.spawn ?? nodeSpawn;
  const args: string[] = ["--json"];
  if (opts.glob) args.push("--glob", opts.glob);
  if (opts.fixedStrings) args.push("--fixed-strings");
  args.push(opts.pattern);
  args.push(".");

  const proc = spawnFn("rg", args, { cwd: opts.root, stdio: ["ignore", "pipe", "pipe"] }) as unknown as ChildProcessByStdio<null, Readable, Readable>;
  const matches: RipgrepMatch[] = [];
  let stderr = "";

  const rl = createInterface({ input: proc.stdout });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let event: RipgrepEvent;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type !== "match" || !event.data) return;
    const file = (event.data.path?.text ?? "").replace(/^\.\//, "");
    const lineNumber = event.data.line_number ?? 0;
    const text = (event.data.lines?.text ?? "").replace(/\n$/, "");
    matches.push({ file, line: lineNumber, snippet: text });
  });

  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timer: NodeJS.Timeout | undefined;

  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => {
        proc.kill("SIGKILL");
        reject(new RipgrepError(`ripgrep timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on("error", (err) => reject(new RipgrepError(`failed to spawn rg: ${err.message}`)));
      proc.on("close", (code) => {
        if (code === 0 || code === 1) {
          resolve();
        } else {
          reject(new RipgrepError(`rg exited with code ${code}: ${stderr.trim()}`));
        }
      });
    });
  } finally {
    if (timer) clearTimeout(timer);
  }

  return matches;
}

export async function assertRipgrepInstalled(spawn: typeof nodeSpawn = nodeSpawn): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("rg", ["--version"]);
    proc.on("error", () => reject(new RipgrepError(
      "ripgrep (rg) not found on PATH. Install with `brew install ripgrep` or your package manager.",
    )));
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new RipgrepError("rg --version exited non-zero"))));
  });
}
