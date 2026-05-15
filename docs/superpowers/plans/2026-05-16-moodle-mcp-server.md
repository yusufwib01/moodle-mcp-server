# Moodle MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone TypeScript MCP server that exposes the Moodle codebase, coding guidelines, and CLR workflow context to Claude Code via stdio.

**Architecture:** Node.js + TypeScript + `@modelcontextprotocol/sdk` (stdio transport). Three reusable primitives (path safety, ripgrep wrapper, output limits) under `src/lib/`, with tool modules under `src/tools/` grouped by phase. All inputs validated with Zod and converted to JSON Schema for MCP registration. Output paginated and capped. Guidelines served from a local `guidelines/` directory, with fallback to a local Moodle clone for canonical content.

**Tech Stack:** Node 20+, TypeScript, `@modelcontextprotocol/sdk`, `zod`, `zod-to-json-schema`, `fast-xml-parser` (for `install.xml`), Vitest for tests. External binary: `ripgrep` (`rg`) on `PATH`.

**Project root for this plan:** `/Users/yusufwibisono/moodles/mcp` (all relative paths in tasks are relative to this).

**Spec reference:** `docs/superpowers/specs/2026-05-16-moodle-mcp-server-design.md`

---

## Task 1: Initialize the repository

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md` (skeleton only — final content in Task 32)

- [ ] **Step 1: Initialize git and Node project**

Run from `/Users/yusufwibisono/moodles/mcp`:
```bash
git init
npm init -y
```

Expected: `.git/` created, `package.json` created with default fields.

- [ ] **Step 2: Replace `package.json` with a curated version**

Overwrite `package.json` with:
```json
{
  "name": "moodle-mcp-server",
  "version": "0.1.0",
  "description": "MCP server exposing Moodle codebase, guidelines, and CLR context to Claude Code",
  "type": "module",
  "bin": {
    "moodle-mcp-server": "dist/index.js"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run test"
  },
  "engines": {
    "node": ">=20"
  },
  "files": [
    "dist",
    "guidelines",
    "README.md"
  ]
}
```

- [ ] **Step 3: Install runtime and dev dependencies**

```bash
npm install @modelcontextprotocol/sdk zod zod-to-json-schema fast-xml-parser
npm install -D typescript tsx vitest @types/node
```

Expected: `node_modules/` populated, `package-lock.json` created.

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
dist/
.env
.env.local
coverage/
*.log
.DS_Store
```

- [ ] **Step 5: Write `.env.example`**

```
# Absolute path to the Moodle clone the server should default to.
MOODLE_ROOT=/Users/yusufwibisono/moodles/stable_main

# Optional: override ripgrep timeout in milliseconds (default 10000).
# MOODLE_MCP_RG_TIMEOUT_MS=10000
```

- [ ] **Step 6: Write a placeholder `README.md`**

```markdown
# moodle-mcp-server

MCP server giving Claude Code persistent context about the Moodle codebase, coding conventions, and CLR review workflows.

See `docs/superpowers/specs/2026-05-16-moodle-mcp-server-design.md` for the design.

Setup instructions land in Task 32.
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example README.md
git commit -m "chore: initialize moodle-mcp-server project"
```

---

## Task 2: TypeScript configuration

**Files:**
- Create: `tsconfig.json`

- [ ] **Step 1: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"]
}
```

- [ ] **Step 2: Add a separate Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Verify typecheck passes with no source files yet**

Run:
```bash
mkdir -p src
echo "export {};" > src/index.ts
npm run typecheck
```

Expected: no errors. Delete the temp file:
```bash
rm src/index.ts
```

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json vitest.config.ts
git commit -m "chore: add TypeScript and Vitest config"
```

---

## Task 3: Path safety primitive

**Files:**
- Create: `src/lib/paths.ts`
- Test: `tests/lib/paths.test.ts`

This module resolves the active Moodle root and produces safe absolute paths inside it.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/paths.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot, safeJoin, PathSafetyError } from "../../src/lib/paths.js";

describe("resolveRoot", () => {
  const originalEnv = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "moodle-root-"));
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
    const other = await mkdtemp(join(tmpdir(), "moodle-root-other-"));
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
    root = await mkdtemp(join(tmpdir(), "moodle-safe-"));
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
    const outside = await mkdtemp(join(tmpdir(), "moodle-outside-"));
    await writeFile(join(outside, "secret.txt"), "secret");
    await symlink(join(outside, "secret.txt"), join(root, "leak"));
    try {
      expect(() => safeJoin(root, "leak")).toThrow(PathSafetyError);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/lib/paths.test.ts
```

Expected: FAIL with module-not-found for `../../src/lib/paths.js`.

- [ ] **Step 3: Implement `src/lib/paths.ts`**

```typescript
import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

export class PathSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathSafetyError";
  }
}

function assertDirectoryExists(path: string): void {
  if (!existsSync(path)) {
    throw new PathSafetyError(`Path does not exist: ${path}`);
  }
  if (!statSync(path).isDirectory()) {
    throw new PathSafetyError(`Path is not a directory: ${path}`);
  }
}

export function resolveRoot(override?: string): string {
  const candidate = override ?? process.env.MOODLE_ROOT;
  if (!candidate) {
    throw new PathSafetyError(
      "MOODLE_ROOT is not set and no per-call root override was provided.",
    );
  }
  if (!isAbsolute(candidate)) {
    throw new PathSafetyError(`Moodle root must be an absolute path: ${candidate}`);
  }
  assertDirectoryExists(candidate);
  return realpathSync(candidate);
}

export function safeJoin(root: string, relativePath: string): string {
  if (relativePath.includes("\u0000")) {
    throw new PathSafetyError("Path contains a null byte.");
  }
  const resolvedRoot = realpathSync(root);
  const joined = resolve(resolvedRoot, relativePath);
  const realJoined = existsSync(joined) ? realpathSync(joined) : joined;
  if (realJoined !== resolvedRoot && !realJoined.startsWith(resolvedRoot + sep)) {
    throw new PathSafetyError(`Path escapes the Moodle root: ${relativePath}`);
  }
  return realJoined;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/paths.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/paths.ts tests/lib/paths.test.ts
git commit -m "feat(lib): add path safety primitive"
```

---

## Task 4: Output limits primitive

**Files:**
- Create: `src/lib/limits.ts`
- Test: `tests/lib/limits.test.ts`

Helpers that apply hard caps and produce pagination hints for tool outputs.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/limits.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { sliceLines, capResults, DEFAULT_FILE_LIMIT, DEFAULT_SEARCH_LIMIT } from "../../src/lib/limits.js";

describe("sliceLines", () => {
  const lines = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`);

  it("returns the first DEFAULT_FILE_LIMIT lines when no options given", () => {
    const out = sliceLines(lines);
    expect(out.lines).toHaveLength(DEFAULT_FILE_LIMIT);
    expect(out.totalLines).toBe(1000);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain("offset=500");
  });

  it("honors offset and limit", () => {
    const out = sliceLines(lines, { offset: 100, limit: 50 });
    expect(out.lines[0]).toBe("line 101");
    expect(out.lines).toHaveLength(50);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain("offset=150");
  });

  it("reports no truncation when the slice exhausts the input", () => {
    const out = sliceLines(lines, { offset: 990, limit: 50 });
    expect(out.lines).toHaveLength(10);
    expect(out.truncated).toBe(false);
    expect(out.hint).toBeUndefined();
  });

  it("rejects negative offset", () => {
    expect(() => sliceLines(lines, { offset: -1 })).toThrow(/offset/);
  });
});

describe("capResults", () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

  it("caps at DEFAULT_SEARCH_LIMIT by default", () => {
    const out = capResults(items);
    expect(out.results).toHaveLength(DEFAULT_SEARCH_LIMIT);
    expect(out.totalMatches).toBe(100);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain(`offset=${DEFAULT_SEARCH_LIMIT}`);
  });

  it("honors offset and limit", () => {
    const out = capResults(items, { offset: 30, limit: 10 });
    expect(out.results[0]).toEqual({ id: 30 });
    expect(out.results).toHaveLength(10);
    expect(out.truncated).toBe(true);
  });

  it("returns no hint when not truncated", () => {
    const out = capResults(items.slice(0, 5));
    expect(out.truncated).toBe(false);
    expect(out.hint).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/lib/limits.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/lib/limits.ts`**

```typescript
export const DEFAULT_FILE_LIMIT = 500;
export const DEFAULT_SEARCH_LIMIT = 20;

export interface SliceOptions {
  offset?: number;
  limit?: number;
}

export interface SliceResult<T> {
  lines: T[];
  totalLines: number;
  truncated: boolean;
  hint?: string;
}

export interface CapResult<T> {
  results: T[];
  totalMatches: number;
  truncated: boolean;
  hint?: string;
}

function normalize(opts: SliceOptions | undefined, defaultLimit: number): { offset: number; limit: number } {
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? defaultLimit;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError(`offset must be a non-negative integer (got ${offset})`);
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError(`limit must be a positive integer (got ${limit})`);
  }
  return { offset, limit };
}

export function sliceLines<T>(lines: T[], opts?: SliceOptions): SliceResult<T> {
  const { offset, limit } = normalize(opts, DEFAULT_FILE_LIMIT);
  const slice = lines.slice(offset, offset + limit);
  const consumed = offset + slice.length;
  const truncated = consumed < lines.length;
  return {
    lines: slice,
    totalLines: lines.length,
    truncated,
    hint: truncated ? `more lines available — call again with offset=${consumed}` : undefined,
  };
}

export function capResults<T>(items: T[], opts?: SliceOptions): CapResult<T> {
  const { offset, limit } = normalize(opts, DEFAULT_SEARCH_LIMIT);
  const slice = items.slice(offset, offset + limit);
  const consumed = offset + slice.length;
  const truncated = consumed < items.length;
  return {
    results: slice,
    totalMatches: items.length,
    truncated,
    hint: truncated ? `more results available — call again with offset=${consumed}` : undefined,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/limits.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/limits.ts tests/lib/limits.test.ts
git commit -m "feat(lib): add output limit and pagination helpers"
```

---

## Task 5: Ripgrep wrapper

**Files:**
- Create: `src/lib/ripgrep.ts`
- Test: `tests/lib/ripgrep.test.ts`

Wraps `rg --json` with timeout and structured parsing. Spawn is injected so tests can replace it.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/ripgrep.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { runRipgrep, RipgrepError } from "../../src/lib/ripgrep.js";

function makeFakeSpawn(stdoutLines: string[], stderr = "", exitCode = 0) {
  return vi.fn(() => {
    const proc = new EventEmitter() as any;
    proc.stdout = Readable.from(stdoutLines.map((l) => l + "\n"));
    proc.stderr = Readable.from([stderr]);
    proc.kill = vi.fn();
    setImmediate(() => proc.emit("close", exitCode));
    return proc;
  });
}

describe("runRipgrep", () => {
  it("parses match events into structured results", async () => {
    const fakeOutput = [
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "lib/datalib.php" },
          line_number: 42,
          lines: { text: "function get_records(): array {\n" },
        },
      }),
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "mod/quiz/lib.php" },
          line_number: 7,
          lines: { text: "use get_records;\n" },
        },
      }),
    ];
    const spawn = makeFakeSpawn(fakeOutput);
    const results = await runRipgrep({
      pattern: "get_records",
      root: "/tmp/fake",
      spawn,
    });
    expect(results).toEqual([
      { file: "lib/datalib.php", line: 42, snippet: "function get_records(): array {" },
      { file: "mod/quiz/lib.php", line: 7, snippet: "use get_records;" },
    ]);
    expect(spawn).toHaveBeenCalledWith(
      "rg",
      expect.arrayContaining(["--json", "get_records"]),
      expect.objectContaining({ cwd: "/tmp/fake" }),
    );
  });

  it("returns empty when ripgrep exits with code 1 (no matches)", async () => {
    const spawn = makeFakeSpawn([], "", 1);
    const results = await runRipgrep({ pattern: "nope", root: "/tmp", spawn });
    expect(results).toEqual([]);
  });

  it("throws on ripgrep error exit codes (>= 2)", async () => {
    const spawn = makeFakeSpawn([], "bad regex", 2);
    await expect(runRipgrep({ pattern: "[", root: "/tmp", spawn })).rejects.toThrow(RipgrepError);
  });

  it("passes a glob filter when provided", async () => {
    const spawn = makeFakeSpawn([]);
    await runRipgrep({ pattern: "x", root: "/tmp", glob: "*.php", spawn });
    const args = spawn.mock.calls[0][1] as string[];
    expect(args).toEqual(expect.arrayContaining(["--glob", "*.php"]));
  });

  it("kills the process on timeout", async () => {
    const proc = new EventEmitter() as any;
    proc.stdout = new Readable({ read() {} });
    proc.stderr = new Readable({ read() {} });
    proc.kill = vi.fn();
    const spawn = vi.fn(() => proc);
    const promise = runRipgrep({ pattern: "x", root: "/tmp", timeoutMs: 5, spawn });
    await expect(promise).rejects.toThrow(/timed out/);
    expect(proc.kill).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/lib/ripgrep.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/lib/ripgrep.ts`**

```typescript
import { spawn as nodeSpawn, type ChildProcessWithoutNullStreams } from "node:child_process";
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
  caseSensitive?: boolean;
  fixedStrings?: boolean;
  extraArgs?: string[];
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
  if (opts.caseSensitive === false) args.push("--ignore-case");
  if (opts.extraArgs) args.push(...opts.extraArgs);
  args.push(opts.pattern);

  const proc = spawnFn("rg", args, { cwd: opts.root }) as ChildProcessWithoutNullStreams;
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
    const file = event.data.path?.text ?? "";
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/ripgrep.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ripgrep.ts tests/lib/ripgrep.test.ts
git commit -m "feat(lib): add ripgrep wrapper with timeout and JSON parsing"
```

---

## Task 6: Moodle component resolver

**Files:**
- Create: `src/lib/moodle.ts`
- Test: `tests/lib/moodle.test.ts`
- Test fixtures: `tests/fixtures/fake-moodle/`

Maps Moodle component names like `mod_quiz`, `core_course`, `block_html`, `local_foo` to filesystem paths under the Moodle root.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/moodle.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveComponentPath, ComponentResolveError } from "../../src/lib/moodle.js";

async function makeFakeMoodle(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "fake-moodle-"));
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
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/lib/moodle.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/lib/moodle.ts`**

```typescript
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export class ComponentResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComponentResolveError";
  }
}

const PLUGIN_TYPE_DIRS: Record<string, string> = {
  mod: "mod",
  block: "blocks",
  local: "local",
  report: "report",
  tool: "admin/tool",
  auth: "auth",
  enrol: "enrol",
  filter: "filter",
  qbehaviour: "question/behaviour",
  qformat: "question/format",
  qtype: "question/type",
  theme: "theme",
  format: "course/format",
  repository: "repository",
  message: "message/output",
  gradeimport: "grade/import",
  gradeexport: "grade/export",
  gradereport: "grade/report",
  webservice: "webservice",
};

const CORE_SUBSYSTEM_DIRS: Record<string, string> = {
  core: "lib",
  core_course: "course",
  core_user: "user",
  core_group: "group",
  core_message: "message",
  core_grades: "grade",
  core_question: "question",
  core_enrol: "enrol",
  core_role: "admin/roles",
  core_backup: "backup",
  core_files: "files",
  core_search: "search",
  core_tag: "tag",
  core_blog: "blog",
  core_admin: "admin",
  core_auth: "auth",
};

export function resolveComponentPath(root: string, component: string): string {
  if (!component) {
    throw new ComponentResolveError("Component name is empty.");
  }

  const coreMatch = CORE_SUBSYSTEM_DIRS[component];
  if (coreMatch) {
    return assertExists(join(root, coreMatch), component);
  }

  const underscore = component.indexOf("_");
  if (underscore === -1) {
    throw new ComponentResolveError(`Unknown component: ${component}`);
  }
  const type = component.slice(0, underscore);
  const name = component.slice(underscore + 1);
  const dir = PLUGIN_TYPE_DIRS[type];
  if (!dir) {
    throw new ComponentResolveError(`Unknown plugin type: ${type} (component: ${component})`);
  }
  return assertExists(join(root, dir, name), component);
}

function assertExists(absolute: string, component: string): string {
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
    throw new ComponentResolveError(`Component directory not found for ${component}: ${absolute}`);
  }
  return absolute;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/lib/moodle.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Create a reusable fixture for integration smoke tests**

Create `tests/fixtures/fake-moodle/lib/datalib.php`:
```php
<?php
// Fake datalib used by fixture tests.
function fake_get_records(string $table): array {
    return [];
}
```

Create `tests/fixtures/fake-moodle/mod/quiz/lib.php`:
```php
<?php
// Fake mod_quiz lib.
function quiz_add_instance(stdClass $data): int {
    return fake_get_records('quiz');
}
```

Create `tests/fixtures/fake-moodle/mod/quiz/db/install.xml`:
```xml
<?xml version="1.0" encoding="UTF-8" ?>
<XMLDB PATH="mod/quiz/db" VERSION="2024010100">
  <TABLES>
    <TABLE NAME="quiz" COMMENT="Quizzes available to students.">
      <FIELDS>
        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>
        <FIELD NAME="name" TYPE="char" LENGTH="255" NOTNULL="true"/>
      </FIELDS>
      <KEYS>
        <KEY NAME="primary" TYPE="primary" FIELDS="id"/>
      </KEYS>
    </TABLE>
  </TABLES>
</XMLDB>
```

Create `tests/fixtures/fake-moodle/mod/quiz/db/hooks.php`:
```php
<?php
$callbacks = [
    [
        'hook' => \core\hook\after_config::class,
        'callback' => 'mod_quiz\\hook_listener::after_config',
    ],
];
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/moodle.ts tests/lib/moodle.test.ts tests/fixtures
git commit -m "feat(lib): add Moodle component resolver and test fixtures"
```

---

## Task 7: Configuration loader

**Files:**
- Create: `src/config.ts`
- Test: `tests/config.test.ts`

Thin wrapper around `resolveRoot` plus a place to surface ripgrep timeout config.

- [ ] **Step 1: Write the failing test**

Create `tests/config.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getServerConfig } from "../src/config.js";

describe("getServerConfig", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "config-root-"));
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
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/config.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/config.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/config.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: add server config loader"
```

---

## Task 8: Tool definition contract and server bootstrap

**Files:**
- Create: `src/tools/types.ts`
- Create: `src/tools/register.ts`
- Create: `src/index.ts`
- Test: `tests/tools/register.test.ts`

Defines a `ToolDefinition` interface (name + description + Zod schema + handler) and a `registerTools` function that the server bootstrap uses. The server bootstrap itself stays small: it wires stdio, dispatches list/call requests, and reports startup errors to stderr.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/register.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { buildToolDispatchers, toJsonSchema } from "../../src/tools/register.js";

describe("buildToolDispatchers", () => {
  it("lists tools with their schemas", async () => {
    const dispatchers = buildToolDispatchers([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: z.object({ message: z.string() }),
        async run(input) {
          return { text: input.message };
        },
      },
    ]);
    expect(dispatchers.list()).toEqual([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: expect.any(Object),
      },
    ]);
  });

  it("validates and dispatches a tool call", async () => {
    const dispatchers = buildToolDispatchers([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: z.object({ message: z.string() }),
        async run(input) {
          return { text: input.message };
        },
      },
    ]);
    const result = await dispatchers.call("echo", { message: "hi" });
    expect(result).toEqual({ text: "hi" });
  });

  it("rejects unknown tools", async () => {
    const dispatchers = buildToolDispatchers([]);
    await expect(dispatchers.call("nope", {})).rejects.toThrow(/unknown tool/i);
  });

  it("rejects invalid input", async () => {
    const dispatchers = buildToolDispatchers([
      {
        name: "echo",
        description: "Returns the input.",
        inputSchema: z.object({ message: z.string() }),
        async run(input) {
          return { text: input.message };
        },
      },
    ]);
    await expect(dispatchers.call("echo", { message: 123 })).rejects.toThrow();
  });

  it("toJsonSchema converts a Zod schema", () => {
    const schema = toJsonSchema(z.object({ a: z.string() }));
    expect(schema.type).toBe("object");
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/register.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/types.ts`**

```typescript
import type { ZodTypeAny, z } from "zod";

export interface ToolDefinition<TSchema extends ZodTypeAny = ZodTypeAny, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: TSchema;
  run(input: z.infer<TSchema>): Promise<TOutput>;
}
```

- [ ] **Step 4: Implement `src/tools/register.ts`**

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import type { ToolDefinition } from "./types.js";

export function toJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  return zodToJsonSchema(schema, { target: "jsonSchema7" }) as Record<string, unknown>;
}

export interface ToolListEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolDispatchers {
  list(): ToolListEntry[];
  call(name: string, rawInput: unknown): Promise<unknown>;
}

export function buildToolDispatchers(tools: ToolDefinition[]): ToolDispatchers {
  const byName = new Map<string, ToolDefinition>();
  for (const tool of tools) {
    if (byName.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    byName.set(tool.name, tool);
  }
  return {
    list() {
      return tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: toJsonSchema(tool.inputSchema),
      }));
    },
    async call(name, rawInput) {
      const tool = byName.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }
      const parsed = tool.inputSchema.parse(rawInput ?? {});
      return tool.run(parsed);
    },
  };
}
```

- [ ] **Step 5: Implement `src/index.ts`**

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getServerConfig } from "./config.js";
import { assertRipgrepInstalled } from "./lib/ripgrep.js";
import { buildToolDispatchers } from "./tools/register.js";
import { allTools } from "./tools/index.js";
import { allResources, listResources, readResource } from "./resources/index.js";

async function main(): Promise<void> {
  getServerConfig();
  await assertRipgrepInstalled();

  const dispatchers = buildToolDispatchers(allTools);

  const server = new Server(
    { name: "moodle-context", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: dispatchers.list(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await dispatchers.call(request.params.name, request.params.arguments);
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listResources(allResources),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
    contents: await readResource(allResources, request.params.uri),
  }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[moodle-mcp-server] fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 6: Create stub aggregators so the bootstrap typechecks now**

Create `src/tools/index.ts`:
```typescript
import type { ToolDefinition } from "./types.js";

export const allTools: ToolDefinition[] = [];
```

Create `src/resources/index.ts`:
```typescript
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read(): Promise<string>;
}

export const allResources: ResourceDefinition[] = [];

export function listResources(resources: ResourceDefinition[]) {
  return resources.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readResource(
  resources: ResourceDefinition[],
  uri: string,
): Promise<Array<{ uri: string; mimeType: string; text: string }>> {
  const match = resources.find((r) => r.uri === uri);
  if (!match) {
    throw new Error(`Unknown resource: ${uri}`);
  }
  return [{ uri: match.uri, mimeType: match.mimeType, text: await match.read() }];
}
```

- [ ] **Step 7: Run tests and typecheck**

```bash
npm run typecheck
npm test -- tests/tools/register.test.ts
```

Expected: typecheck passes, all 5 register tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/tools/types.ts src/tools/register.ts src/tools/index.ts src/resources/index.ts src/index.ts tests/tools/register.test.ts
git commit -m "feat: add tool dispatcher contract and server bootstrap"
```

---

## Tool registration recipe

Every per-tool task ends with a "Register the tool" step that updates `src/tools/index.ts` so the MCP server discovers the new tool. To register:

1. Add the import to the top of `src/tools/index.ts`:
   ```typescript
   import { <identifier> } from "<module path>";
   ```
2. Append `<identifier>` to the end of the `allTools` array.
3. Run `npm run typecheck` to confirm the path is correct.

Use this lookup table to find the import path and identifier for each per-tool task:

| Task | Tool name | Module path | Identifier |
|------|-----------|-------------|------------|
| 10 | `search_moodle_codebase` | `./codebase/searchMoodleCodebase.js` | `searchMoodleCodebase` |
| 11 | `read_moodle_file` | `./codebase/readMoodleFile.js` | `readMoodleFile` |
| 12 | `list_component_files` | `./codebase/listComponentFiles.js` | `listComponentFiles` |
| 13 | `search_function_definition` | `./codebase/searchFunctionDefinition.js` | `searchFunctionDefinition` |
| 14 | `trace_call_path` | `./codebase/traceCallPath.js` | `traceCallPath` |
| 15 | `get_hooks` | `./codebase/getHooks.js` | `getHooks` |
| 17 | `get_coding_guidelines` | `./guidelines/getCodingGuidelines.js` | `getCodingGuidelines` |
| 18 | `get_deprecation_rules` | `./guidelines/getDeprecationRules.js` | `getDeprecationRules` |
| 19 | `get_upgrade_note_format` | `./guidelines/getUpgradeNoteFormat.js` | `getUpgradeNoteFormat` |
| 20 | `get_feature_scaffold` | `./feature/getFeatureScaffold.js` | `getFeatureScaffold` |
| 21 | `find_similar_feature` | `./feature/findSimilarFeature.js` | `findSimilarFeature` |
| 22 | `get_db_schema` | `./feature/getDbSchema.js` | `getDbSchema` |
| 23 | `get_api_usage_examples` | `./feature/getApiUsageExamples.js` | `getApiUsageExamples` |
| 24 | `get_bug_context` | `./feature/getBugContext.js` | `getBugContext` |
| 25 | `get_clr_checklist` | `./clr/getClrChecklist.js` | `getClrChecklist` |
| 26 | `check_deprecation_usage` | `./clr/checkDeprecationUsage.js` | `checkDeprecationUsage` |
| 27 | `get_component_owner` | `./clr/getComponentOwner.js` | `getComponentOwner` |
| 28 | `find_similar_implementations` | `./clr/findSimilarImplementations.js` | `findSimilarImplementations` |
| 29 | `get_clr_context` | `./jira/getClrContext.js` | `getClrContext` |

After Task 29 is committed, the final `src/tools/index.ts` should look like:

```typescript
import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";
import { readMoodleFile } from "./codebase/readMoodleFile.js";
import { listComponentFiles } from "./codebase/listComponentFiles.js";
import { searchFunctionDefinition } from "./codebase/searchFunctionDefinition.js";
import { traceCallPath } from "./codebase/traceCallPath.js";
import { getHooks } from "./codebase/getHooks.js";
import { getCodingGuidelines } from "./guidelines/getCodingGuidelines.js";
import { getDeprecationRules } from "./guidelines/getDeprecationRules.js";
import { getUpgradeNoteFormat } from "./guidelines/getUpgradeNoteFormat.js";
import { getFeatureScaffold } from "./feature/getFeatureScaffold.js";
import { findSimilarFeature } from "./feature/findSimilarFeature.js";
import { getDbSchema } from "./feature/getDbSchema.js";
import { getApiUsageExamples } from "./feature/getApiUsageExamples.js";
import { getBugContext } from "./feature/getBugContext.js";
import { getClrChecklist } from "./clr/getClrChecklist.js";
import { checkDeprecationUsage } from "./clr/checkDeprecationUsage.js";
import { getComponentOwner } from "./clr/getComponentOwner.js";
import { findSimilarImplementations } from "./clr/findSimilarImplementations.js";
import { getClrContext } from "./jira/getClrContext.js";

export const allTools: ToolDefinition[] = [
  searchMoodleCodebase,
  readMoodleFile,
  listComponentFiles,
  searchFunctionDefinition,
  traceCallPath,
  getHooks,
  getCodingGuidelines,
  getDeprecationRules,
  getUpgradeNoteFormat,
  getFeatureScaffold,
  findSimilarFeature,
  getDbSchema,
  getApiUsageExamples,
  getBugContext,
  getClrChecklist,
  checkDeprecationUsage,
  getComponentOwner,
  findSimilarImplementations,
  getClrContext,
];
```

---

## Task 9: Tool helper `withRoot` and standard option types

**Files:**
- Create: `src/tools/common.ts`
- Test: `tests/tools/common.test.ts`

Shared Zod fragments so every tool gets consistent `root` and pagination options, plus a helper that injects the resolved root.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/common.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
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
    envRoot = await mkdtemp(join(tmpdir(), "common-root-"));
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
    const other = await mkdtemp(join(tmpdir(), "common-other-"));
    try {
      expect(resolveCallRoot(other)).toBe(other);
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/common.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/common.ts`**

```typescript
import { z } from "zod";
import { resolveRoot } from "../lib/paths.js";

export const rootSchema = z
  .string()
  .min(1)
  .optional()
  .describe("Absolute Moodle root override. Defaults to MOODLE_ROOT env.");

export const paginationSchema = z.object({
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function resolveCallRoot(override: string | undefined): string {
  return resolveRoot(override);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/common.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/common.ts tests/tools/common.test.ts
git commit -m "feat(tools): add shared Zod fragments and root resolver"
```

---

## Task 10: Tool `search_moodle_codebase`

**Files:**
- Create: `src/tools/codebase/searchMoodleCodebase.ts`
- Test: `tests/tools/codebase/searchMoodleCodebase.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/codebase/searchMoodleCodebase.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { searchMoodleCodebase } from "../../../src/tools/codebase/searchMoodleCodebase.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    { file: "lib/datalib.php", line: 12, snippet: "function get_records()" },
    { file: "mod/quiz/lib.php", line: 8, snippet: "use get_records;" },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake/root",
  PathSafetyError: class extends Error {},
}));

describe("searchMoodleCodebase tool", () => {
  it("returns paginated rg results", async () => {
    const out = await searchMoodleCodebase.run({ query: "get_records" });
    expect(out.results).toHaveLength(2);
    expect(out.totalMatches).toBe(2);
    expect(out.truncated).toBe(false);
  });

  it("rejects empty query", async () => {
    await expect(searchMoodleCodebase.run({ query: "" } as any)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/codebase/searchMoodleCodebase.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/codebase/searchMoodleCodebase.ts`**

```typescript
import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    query: z.string().min(1).describe("Pattern to grep for (ripgrep regex)."),
    filePattern: z.string().default("*.php").describe("Glob for file types to search."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const searchMoodleCodebase: ToolDefinition<typeof inputSchema> = {
  name: "search_moodle_codebase",
  description:
    "Search the Moodle codebase with ripgrep. Returns paginated matches with file path, line number, and snippet.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: input.query,
      root,
      glob: input.filePattern,
    });
    return capResults(matches, { offset: input.offset, limit: input.limit });
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/codebase/searchMoodleCodebase.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

Edit `src/tools/index.ts`:
```typescript
import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";

export const allTools: ToolDefinition[] = [searchMoodleCodebase];
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/codebase/searchMoodleCodebase.ts tests/tools/codebase/searchMoodleCodebase.test.ts src/tools/index.ts
git commit -m "feat(tools): add search_moodle_codebase"
```

---

## Task 11: Tool `read_moodle_file`

**Files:**
- Create: `src/tools/codebase/readMoodleFile.ts`
- Test: `tests/tools/codebase/readMoodleFile.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/codebase/readMoodleFile.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMoodleFile } from "../../../src/tools/codebase/readMoodleFile.js";

describe("readMoodleFile", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "read-file-"));
    await mkdir(join(root, "lib"), { recursive: true });
    const content = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join("\n");
    await writeFile(join(root, "lib", "datalib.php"), content);
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns the first 500 lines by default with truncation metadata", async () => {
    const out = await readMoodleFile.run({ filePath: "lib/datalib.php" });
    expect(out.totalLines).toBe(600);
    expect(out.lines).toHaveLength(500);
    expect(out.truncated).toBe(true);
    expect(out.hint).toContain("offset=500");
  });

  it("honors offset and limit", async () => {
    const out = await readMoodleFile.run({ filePath: "lib/datalib.php", offset: 595, limit: 10 });
    expect(out.lines).toHaveLength(5);
    expect(out.lines[0]).toBe("line 596");
    expect(out.truncated).toBe(false);
  });

  it("rejects traversal", async () => {
    await expect(
      readMoodleFile.run({ filePath: "../escape.txt" }),
    ).rejects.toThrow();
  });

  it("throws a NotFound style error for missing files", async () => {
    await expect(
      readMoodleFile.run({ filePath: "lib/missing.php" }),
    ).rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/codebase/readMoodleFile.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/codebase/readMoodleFile.ts`**

```typescript
import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import { safeJoin } from "../../lib/paths.js";
import { sliceLines } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    filePath: z.string().min(1).describe("Path relative to MOODLE_ROOT."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const readMoodleFile: ToolDefinition<typeof inputSchema> = {
  name: "read_moodle_file",
  description:
    "Read a file inside the Moodle codebase. Supports offset/limit pagination; default returns first 500 lines.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const absolute = safeJoin(root, input.filePath);
    let stats;
    try {
      stats = await stat(absolute);
    } catch {
      throw new Error(`File not found at ${input.filePath} in ${root}`);
    }
    if (!stats.isFile()) {
      throw new Error(`Not a regular file: ${input.filePath}`);
    }
    const content = await readFile(absolute, "utf8");
    const allLines = content.split("\n");
    const sliced = sliceLines(allLines, { offset: input.offset, limit: input.limit });
    return {
      filePath: input.filePath,
      ...sliced,
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/codebase/readMoodleFile.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

Update `src/tools/index.ts`:
```typescript
import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";
import { readMoodleFile } from "./codebase/readMoodleFile.js";

export const allTools: ToolDefinition[] = [searchMoodleCodebase, readMoodleFile];
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/codebase/readMoodleFile.ts tests/tools/codebase/readMoodleFile.test.ts src/tools/index.ts
git commit -m "feat(tools): add read_moodle_file"
```

---

## Task 12: Tool `list_component_files`

**Files:**
- Create: `src/tools/codebase/listComponentFiles.ts`
- Test: `tests/tools/codebase/listComponentFiles.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/codebase/listComponentFiles.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { listComponentFiles } from "../../../src/tools/codebase/listComponentFiles.js";

describe("listComponentFiles", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "list-comp-"));
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
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/codebase/listComponentFiles.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/codebase/listComponentFiles.ts`**

```typescript
import { readdir, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { z } from "zod";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import { resolveComponentPath } from "../../lib/moodle.js";
import { capResults } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    component: z.string().min(1).describe("Moodle component name, e.g. mod_quiz, core_course."),
    root: rootSchema,
  })
  .merge(paginationSchema);

async function walk(dir: string, root: string): Promise<Array<{ path: string; type: string }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: Array<{ path: string; type: string }> = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full, root)));
    } else if (entry.isFile()) {
      out.push({ path: relative(root, full), type: extname(entry.name).replace(/^\./, "") || "file" });
    }
  }
  return out;
}

export const listComponentFiles: ToolDefinition<typeof inputSchema> = {
  name: "list_component_files",
  description: "List every file under a Moodle component directory (e.g. mod_quiz, block_html).",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const componentDir = resolveComponentPath(root, input.component);
    const files = (await walk(componentDir, root)).sort((a, b) => a.path.localeCompare(b.path));
    return capResults(files, { offset: input.offset, limit: input.limit });
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/codebase/listComponentFiles.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

Update `src/tools/index.ts`:
```typescript
import type { ToolDefinition } from "./types.js";
import { searchMoodleCodebase } from "./codebase/searchMoodleCodebase.js";
import { readMoodleFile } from "./codebase/readMoodleFile.js";
import { listComponentFiles } from "./codebase/listComponentFiles.js";

export const allTools: ToolDefinition[] = [
  searchMoodleCodebase,
  readMoodleFile,
  listComponentFiles,
];
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/codebase/listComponentFiles.ts tests/tools/codebase/listComponentFiles.test.ts src/tools/index.ts
git commit -m "feat(tools): add list_component_files"
```

---

## Task 13: Tool `search_function_definition`

**Files:**
- Create: `src/tools/codebase/searchFunctionDefinition.ts`
- Test: `tests/tools/codebase/searchFunctionDefinition.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/codebase/searchFunctionDefinition.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { searchFunctionDefinition } from "../../../src/tools/codebase/searchFunctionDefinition.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async ({ pattern }) => {
    if (pattern.includes("function\\s+get_records")) {
      return [
        {
          file: "lib/datalib.php",
          line: 100,
          snippet: "function get_records(string $table): array {",
        },
      ];
    }
    return [];
  }),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake/root",
  PathSafetyError: class extends Error {},
}));

describe("searchFunctionDefinition", () => {
  it("returns definitions parsed from rg output", async () => {
    const out = await searchFunctionDefinition.run({ functionName: "get_records" });
    expect(out.results).toEqual([
      {
        file: "lib/datalib.php",
        line: 100,
        signature: "function get_records(string $table): array",
      },
    ]);
  });

  it("rejects non-identifier function names", async () => {
    await expect(
      searchFunctionDefinition.run({ functionName: "drop table" } as any),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/codebase/searchFunctionDefinition.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/codebase/searchFunctionDefinition.ts`**

```typescript
import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

const inputSchema = z
  .object({
    functionName: z
      .string()
      .regex(identifier, "Function name must be a valid PHP identifier.")
      .describe("PHP function name to locate."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const searchFunctionDefinition: ToolDefinition<typeof inputSchema> = {
  name: "search_function_definition",
  description: "Find PHP function definitions matching a name across the Moodle codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const pattern = `function\\s+${input.functionName}\\s*\\(`;
    const matches = await runRipgrep({ pattern, root, glob: "*.php" });
    const results = matches.map((m) => ({
      file: m.file,
      line: m.line,
      signature: m.snippet.replace(/\s*\{.*$/, "").trim(),
    }));
    return capResults(results, { offset: input.offset, limit: input.limit });
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/codebase/searchFunctionDefinition.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

Update `src/tools/index.ts` to import and append `searchFunctionDefinition` to `allTools`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/codebase/searchFunctionDefinition.ts tests/tools/codebase/searchFunctionDefinition.test.ts src/tools/index.ts
git commit -m "feat(tools): add search_function_definition"
```

---

## Task 14: Tool `trace_call_path`

**Files:**
- Create: `src/tools/codebase/traceCallPath.ts`
- Test: `tests/tools/codebase/traceCallPath.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/codebase/traceCallPath.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { traceCallPath } from "../../../src/tools/codebase/traceCallPath.js";

const runRipgrep = vi.fn(async ({ pattern }) => {
  if (pattern.startsWith("function\\s+")) {
    return [{ file: "lib/datalib.php", line: 5, snippet: "function quiz_add_instance() {" }];
  }
  if (pattern.startsWith("\\b")) {
    return [
      { file: "mod/quiz/lib.php", line: 12, snippet: "quiz_add_instance($data);" },
      { file: "mod/quiz/locallib.php", line: 88, snippet: "$id = quiz_add_instance($d);" },
    ];
  }
  return [];
});

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep,
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake/root",
  PathSafetyError: class extends Error {},
}));

describe("traceCallPath", () => {
  it("returns definitions and callers, excluding definition file lines from callers", async () => {
    const out = await traceCallPath.run({ functionName: "quiz_add_instance" });
    expect(out.definitions).toEqual([
      { file: "lib/datalib.php", line: 5, signature: "function quiz_add_instance()" },
    ]);
    expect(out.callers.results).toEqual([
      { file: "mod/quiz/lib.php", line: 12, snippet: "quiz_add_instance($data);" },
      { file: "mod/quiz/locallib.php", line: 88, snippet: "$id = quiz_add_instance($d);" },
    ]);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/codebase/traceCallPath.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/codebase/traceCallPath.ts`**

```typescript
import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

const inputSchema = z
  .object({
    functionName: z
      .string()
      .regex(identifier, "Function name must be a valid PHP identifier."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const traceCallPath: ToolDefinition<typeof inputSchema> = {
  name: "trace_call_path",
  description:
    "Locate a PHP function's definitions and all callers across the Moodle codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const defPattern = `function\\s+${input.functionName}\\s*\\(`;
    const callPattern = `\\b${input.functionName}\\s*\\(`;

    const [defs, calls] = await Promise.all([
      runRipgrep({ pattern: defPattern, root, glob: "*.php" }),
      runRipgrep({ pattern: callPattern, root, glob: "*.php" }),
    ]);

    const definitions = defs.map((m) => ({
      file: m.file,
      line: m.line,
      signature: m.snippet.replace(/\s*\{.*$/, "").trim(),
    }));

    const defLineKeys = new Set(defs.map((m) => `${m.file}:${m.line}`));
    const filteredCalls = calls.filter((m) => !defLineKeys.has(`${m.file}:${m.line}`));

    return {
      definitions,
      callers: capResults(filteredCalls, { offset: input.offset, limit: input.limit }),
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/codebase/traceCallPath.test.ts
```

Expected: the test passes.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/codebase/traceCallPath.ts tests/tools/codebase/traceCallPath.test.ts src/tools/index.ts
git commit -m "feat(tools): add trace_call_path"
```

---

## Task 15: Tool `get_hooks`

**Files:**
- Create: `src/tools/codebase/getHooks.ts`
- Test: `tests/tools/codebase/getHooks.test.ts`

Returns hook callbacks for a component by reading `db/hooks.php` and `db/callbacks.php` if present, plus a fallback that searches `db/hooks.php` files across the codebase when no component is given.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/codebase/getHooks.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getHooks } from "../../../src/tools/codebase/getHooks.js";

describe("getHooks", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "hooks-"));
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
    expect(out.entries[0].file).toBe("mod/quiz/db/hooks.php");
    expect(out.entries[0].content).toContain("after_config");
  });

  it("returns an empty list when no hooks file exists for the component", async () => {
    await mkdir(join(root, "mod", "lesson", "db"), { recursive: true });
    const out = await getHooks.run({ component: "mod_lesson" });
    expect(out.entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/codebase/getHooks.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/codebase/getHooks.ts`**

```typescript
import { readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { resolveComponentPath } from "../../lib/moodle.js";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  component: z.string().min(1).optional(),
  root: rootSchema,
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
});

interface HookEntry {
  file: string;
  content: string;
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    const s = await stat(path);
    if (!s.isFile()) return null;
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export const getHooks: ToolDefinition<typeof inputSchema> = {
  name: "get_hooks",
  description:
    "Return Moodle hook callback registrations. With a component, reads its db/hooks.php and db/callbacks.php; without one, lists every db/hooks.php in the codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);

    if (input.component) {
      const componentDir = resolveComponentPath(root, input.component);
      const candidates = [
        join(componentDir, "db", "hooks.php"),
        join(componentDir, "db", "callbacks.php"),
      ];
      const entries: HookEntry[] = [];
      for (const path of candidates) {
        const content = await readIfExists(path);
        if (content !== null) entries.push({ file: relative(root, path), content });
      }
      return { entries };
    }

    const matches = await runRipgrep({
      pattern: "callbacks",
      root,
      glob: "db/hooks.php",
    });
    const seen = new Set<string>();
    const files = matches.filter((m) => {
      if (seen.has(m.file)) return false;
      seen.add(m.file);
      return true;
    });
    return capResults(files, { offset: input.offset, limit: input.limit });
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/codebase/getHooks.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/codebase/getHooks.ts tests/tools/codebase/getHooks.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_hooks"
```

---

## Task 16: Guidelines content stubs

**Files:**
- Create: `guidelines/phpdoc.md`
- Create: `guidelines/db_queries.md`
- Create: `guidelines/deprecation.md`
- Create: `guidelines/output_api.md`
- Create: `guidelines/behat.md`
- Create: `guidelines/phpunit.md`
- Create: `guidelines/upgrade_notes.md`
- Create: `guidelines/clr_checklist_general.md`
- Create: `guidelines/clr_checklist_db.md`
- Create: `guidelines/clr_checklist_security.md`
- Create: `guidelines/clr_checklist_accessibility.md`
- Create: `guidelines/coding_style.md`

- [ ] **Step 1: Write each stub**

Use this template for every file — replace `<Topic>` with the title-cased topic, `<slug>` with the lowercase filename slug (e.g. `phpdoc`, `upgrade_notes`), and adjust the body bullets per file:
```markdown
<!-- slug: <slug> -->

# <Topic> Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal CLR notes.

## Key rules

- TODO: capture rule for <slug>.

## Common review findings

- TODO: capture pattern to look for in <slug> reviews.

## References

- TODO: link Moodle dev docs page once added.
```

The `<!-- slug: <slug> -->` comment ensures the lowercase slug literal appears in every file, which the guideline tool tests assert on.

Initial content per file:

- `guidelines/phpdoc.md` — describe expected `@param`, `@return`, `@since` tags.
- `guidelines/db_queries.md` — describe placeholders, `$DB->get_records*` choice, `SQL_INT_*` constants.
- `guidelines/deprecation.md` — `debugging()` calls, `@deprecated` annotation, removal version.
- `guidelines/output_api.md` — `$OUTPUT->render`, templates over `echo`, no direct HTML.
- `guidelines/behat.md` — feature placement under `tests/behat/`, tag conventions.
- `guidelines/phpunit.md` — base class `advanced_testcase`, `resetAfterTest()`.
- `guidelines/upgrade_notes.md` — `upgrade.txt` layout, version bumps in `version.php`.
- `guidelines/clr_checklist_general.md` — top-level review checklist.
- `guidelines/clr_checklist_db.md` — DB-specific items.
- `guidelines/clr_checklist_security.md` — capability checks, sesskey, input sanitization.
- `guidelines/clr_checklist_accessibility.md` — semantic HTML, ARIA, contrast.
- `guidelines/coding_style.md` — short pointer to Moodle coding-style page; `get_coding_guidelines` will pull canonical content from a local Moodle clone if present.

Each file must contain at least the template above filled in with three real bullet placeholders so the tool returns something useful immediately.

- [ ] **Step 2: Commit**

```bash
git add guidelines
git commit -m "docs(guidelines): seed CLR and coding-guideline stubs"
```

---

## Task 17: Tool `get_coding_guidelines`

**Files:**
- Create: `src/tools/guidelines/getCodingGuidelines.ts`
- Test: `tests/tools/guidelines/getCodingGuidelines.test.ts`

Returns the local stub when present. For `topic = coding_style`, additionally try to load Moodle's canonical `lib/upgrade.txt` adjacent docs from the resolved root if the file exists there — falls back to the stub otherwise.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/guidelines/getCodingGuidelines.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getCodingGuidelines, listGuidelineTopics } from "../../../src/tools/guidelines/getCodingGuidelines.js";

describe("getCodingGuidelines", () => {
  it("returns the stub content for a known topic", async () => {
    const out = await getCodingGuidelines.run({ topic: "phpdoc" });
    expect(out.topic).toBe("phpdoc");
    expect(out.content).toContain("phpdoc");
  });

  it("lists known topics when no topic is given", async () => {
    const out = await getCodingGuidelines.run({});
    expect(out.topics).toEqual(expect.arrayContaining(["phpdoc", "db_queries"]));
  });

  it("errors on unknown topics", async () => {
    await expect(getCodingGuidelines.run({ topic: "nonsense" })).rejects.toThrow();
  });

  it("listGuidelineTopics is non-empty", () => {
    expect(listGuidelineTopics()).toContain("phpdoc");
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/guidelines/getCodingGuidelines.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/guidelines/getCodingGuidelines.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const guidelinesDir = join(here, "..", "..", "..", "guidelines");

const TOPICS = [
  "phpdoc",
  "db_queries",
  "deprecation",
  "output_api",
  "behat",
  "phpunit",
  "upgrade_notes",
  "coding_style",
] as const;

type Topic = (typeof TOPICS)[number];

const inputSchema = z.object({
  topic: z.enum(TOPICS).optional(),
});

export function listGuidelineTopics(): readonly Topic[] {
  return TOPICS;
}

async function readStub(topic: Topic): Promise<string> {
  const file = join(guidelinesDir, `${topic}.md`);
  if (!existsSync(file)) {
    throw new Error(`Guideline file missing: ${topic}.md`);
  }
  return readFile(file, "utf8");
}

export const getCodingGuidelines: ToolDefinition<typeof inputSchema> = {
  name: "get_coding_guidelines",
  description:
    "Return Moodle coding-guideline notes for a topic. Call with no topic to list available topics.",
  inputSchema,
  async run(input) {
    if (!input.topic) {
      return { topics: [...TOPICS] };
    }
    const content = await readStub(input.topic);
    return { topic: input.topic, content };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/guidelines/getCodingGuidelines.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/guidelines/getCodingGuidelines.ts tests/tools/guidelines/getCodingGuidelines.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_coding_guidelines"
```

---

## Task 18: Tool `get_deprecation_rules`

**Files:**
- Create: `src/tools/guidelines/getDeprecationRules.ts`
- Test: `tests/tools/guidelines/getDeprecationRules.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/guidelines/getDeprecationRules.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getDeprecationRules } from "../../../src/tools/guidelines/getDeprecationRules.js";

describe("getDeprecationRules", () => {
  it("returns the stub content", async () => {
    const out = await getDeprecationRules.run({});
    expect(out.content).toContain("Deprecation");
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/guidelines/getDeprecationRules.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/guidelines/getDeprecationRules.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "..", "..", "guidelines", "deprecation.md");

const inputSchema = z.object({});

export const getDeprecationRules: ToolDefinition<typeof inputSchema> = {
  name: "get_deprecation_rules",
  description: "Return Moodle deprecation handling conventions (debugging(), @deprecated, upgrade.txt).",
  inputSchema,
  async run() {
    const content = await readFile(file, "utf8");
    return { content };
  },
};
```

Update the stub so the test assertion passes — `guidelines/deprecation.md` should include the literal word `Deprecation`. (Task 16's template already produced `# Deprecation Guidelines (Moodle)` — verify before running.)

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/guidelines/getDeprecationRules.test.ts
```

Expected: test passes.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/guidelines/getDeprecationRules.ts tests/tools/guidelines/getDeprecationRules.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_deprecation_rules"
```

---

## Task 19: Tool `get_upgrade_note_format`

**Files:**
- Create: `src/tools/guidelines/getUpgradeNoteFormat.ts`
- Test: `tests/tools/guidelines/getUpgradeNoteFormat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tools/guidelines/getUpgradeNoteFormat.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getUpgradeNoteFormat } from "../../../src/tools/guidelines/getUpgradeNoteFormat.js";

describe("getUpgradeNoteFormat", () => {
  it("returns the stub content", async () => {
    const out = await getUpgradeNoteFormat.run({});
    expect(out.content).toContain("upgrade");
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/guidelines/getUpgradeNoteFormat.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/guidelines/getUpgradeNoteFormat.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "..", "..", "guidelines", "upgrade_notes.md");

const inputSchema = z.object({});

export const getUpgradeNoteFormat: ToolDefinition<typeof inputSchema> = {
  name: "get_upgrade_note_format",
  description: "Return the expected format for Moodle upgrade.txt entries with examples.",
  inputSchema,
  async run() {
    return { content: await readFile(file, "utf8") };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/guidelines/getUpgradeNoteFormat.test.ts
```

Expected: test passes.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/guidelines/getUpgradeNoteFormat.ts tests/tools/guidelines/getUpgradeNoteFormat.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_upgrade_note_format"
```

---

## Task 20: Tool `get_feature_scaffold`

**Files:**
- Create: `src/tools/feature/getFeatureScaffold.ts`
- Create: `src/tools/feature/scaffolds.ts`
- Test: `tests/tools/feature/getFeatureScaffold.test.ts`

Returns the standard file list + content templates for a new Moodle plugin of a given type. Static data so unit-testable in isolation.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/feature/getFeatureScaffold.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getFeatureScaffold } from "../../../src/tools/feature/getFeatureScaffold.js";

describe("getFeatureScaffold", () => {
  it("returns the file list for a mod plugin", async () => {
    const out = await getFeatureScaffold.run({ type: "mod", name: "widget" });
    const paths = out.files.map((f) => f.path);
    expect(paths).toEqual(expect.arrayContaining([
      "mod/widget/version.php",
      "mod/widget/lib.php",
      "mod/widget/db/install.xml",
      "mod/widget/lang/en/widget.php",
    ]));
    expect(out.files[0].content).toContain("<?php");
  });

  it("rejects unknown plugin types", async () => {
    await expect(getFeatureScaffold.run({ type: "unknown" as any, name: "x" })).rejects.toThrow();
  });

  it("rejects invalid plugin names", async () => {
    await expect(getFeatureScaffold.run({ type: "mod", name: "Bad-Name" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/feature/getFeatureScaffold.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/feature/scaffolds.ts`**

```typescript
export type ScaffoldType = "mod" | "block" | "local" | "report";

export interface ScaffoldFile {
  path: string;
  content: string;
}

const HEADER = "<?php\n// AUTO-GENERATED scaffold — adapt as needed.\n";

export function buildScaffold(type: ScaffoldType, name: string): ScaffoldFile[] {
  switch (type) {
    case "mod":
      return [
        { path: `mod/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'mod_${name}';\n$plugin->version = 2026010100;\n$plugin->requires = 2024042200;\n` },
        { path: `mod/${name}/lib.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n\nfunction ${name}_add_instance(stdClass $data, mod_${name}_mod_form $mform = null): int {\n    return 0;\n}\n` },
        { path: `mod/${name}/db/install.xml`, content: `<?xml version="1.0" encoding="UTF-8" ?>\n<XMLDB PATH="mod/${name}/db" VERSION="2026010100">\n  <TABLES>\n    <TABLE NAME="${name}" COMMENT="${name} instances">\n      <FIELDS>\n        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>\n        <FIELD NAME="course" TYPE="int" LENGTH="10" NOTNULL="true"/>\n        <FIELD NAME="name" TYPE="char" LENGTH="255" NOTNULL="true"/>\n      </FIELDS>\n      <KEYS>\n        <KEY NAME="primary" TYPE="primary" FIELDS="id"/>\n      </KEYS>\n    </TABLE>\n  </TABLES>\n</XMLDB>\n` },
        { path: `mod/${name}/lang/en/${name}.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$string['pluginname'] = '${name}';\n` },
      ];
    case "block":
      return [
        { path: `blocks/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'block_${name}';\n$plugin->version = 2026010100;\n` },
        { path: `blocks/${name}/block_${name}.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n\nclass block_${name} extends block_base {\n    public function init() {\n        $this->title = get_string('pluginname', 'block_${name}');\n    }\n}\n` },
        { path: `blocks/${name}/lang/en/block_${name}.php`, content: `${HEADER}$string['pluginname'] = '${name}';\n` },
      ];
    case "local":
      return [
        { path: `local/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'local_${name}';\n$plugin->version = 2026010100;\n` },
        { path: `local/${name}/lang/en/local_${name}.php`, content: `${HEADER}$string['pluginname'] = '${name}';\n` },
      ];
    case "report":
      return [
        { path: `report/${name}/version.php`, content: `${HEADER}defined('MOODLE_INTERNAL') || die();\n$plugin->component = 'report_${name}';\n$plugin->version = 2026010100;\n` },
        { path: `report/${name}/index.php`, content: `${HEADER}require(__DIR__ . '/../../config.php');\nrequire_login();\n` },
        { path: `report/${name}/lang/en/report_${name}.php`, content: `${HEADER}$string['pluginname'] = '${name}';\n` },
      ];
  }
}
```

- [ ] **Step 4: Implement `src/tools/feature/getFeatureScaffold.ts`**

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types.js";
import { buildScaffold, type ScaffoldType } from "./scaffolds.js";

const inputSchema = z.object({
  type: z.enum(["mod", "block", "local", "report"]).describe("Plugin type."),
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,31}$/, "Plugin name must be lowercase letters, digits, underscores."),
});

export const getFeatureScaffold: ToolDefinition<typeof inputSchema> = {
  name: "get_feature_scaffold",
  description:
    "Return the standard file structure and starter content for a new Moodle plugin of a given type.",
  inputSchema,
  async run(input) {
    const files = buildScaffold(input.type as ScaffoldType, input.name);
    return { type: input.type, name: input.name, files };
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- tests/tools/feature/getFeatureScaffold.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 6: Register the tool** — follow the Tool registration recipe above using Task 20's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 7: Commit**

```bash
git add src/tools/feature/getFeatureScaffold.ts src/tools/feature/scaffolds.ts tests/tools/feature/getFeatureScaffold.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_feature_scaffold"
```

---

## Task 21: Tool `find_similar_feature`

**Files:**
- Create: `src/tools/feature/findSimilarFeature.ts`
- Test: `tests/tools/feature/findSimilarFeature.test.ts`

Splits the description into keywords, runs each as a fixed-string rg query, dedupes hits by file, and returns the top matches.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/feature/findSimilarFeature.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { findSimilarFeature } from "../../../src/tools/feature/findSimilarFeature.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async ({ pattern }) => {
    if (pattern === "grade_export") {
      return [{ file: "grade/export/lib.php", line: 10, snippet: "class grade_export {" }];
    }
    if (pattern === "csv") {
      return [{ file: "grade/export/csv/classes/csv.php", line: 5, snippet: "// csv" }];
    }
    return [];
  }),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("findSimilarFeature", () => {
  it("returns hits deduped across keywords", async () => {
    const out = await findSimilarFeature.run({ description: "grade_export csv" });
    const files = out.results.map((r) => r.file).sort();
    expect(files).toEqual(["grade/export/csv/classes/csv.php", "grade/export/lib.php"]);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/feature/findSimilarFeature.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/feature/findSimilarFeature.ts`**

```typescript
import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    description: z.string().min(2).describe("Free-text description; split on whitespace into keywords."),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const findSimilarFeature: ToolDefinition<typeof inputSchema> = {
  name: "find_similar_feature",
  description:
    "Search Moodle for code that resembles a feature description by splitting it into keywords and running ripgrep over each.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const keywords = input.description
      .split(/\s+/)
      .filter((k) => k.length >= 3)
      .slice(0, 5);
    const allMatches = [] as Array<{ file: string; line: number; snippet: string; keyword: string }>;
    for (const kw of keywords) {
      const hits = await runRipgrep({ pattern: kw, root, glob: "*.php", fixedStrings: true });
      for (const m of hits) {
        allMatches.push({ ...m, keyword: kw });
      }
    }
    const dedup = new Map<string, { file: string; line: number; snippet: string; keyword: string }>();
    for (const m of allMatches) {
      if (!dedup.has(m.file)) dedup.set(m.file, m);
    }
    return capResults([...dedup.values()], { offset: input.offset, limit: input.limit });
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/feature/findSimilarFeature.test.ts
```

Expected: the test passes.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/feature/findSimilarFeature.ts tests/tools/feature/findSimilarFeature.test.ts src/tools/index.ts
git commit -m "feat(tools): add find_similar_feature"
```

---

## Task 22: Tool `get_db_schema`

**Files:**
- Create: `src/tools/feature/getDbSchema.ts`
- Test: `tests/tools/feature/getDbSchema.test.ts`

Scans `install.xml` files for a `<TABLE NAME="...">` block, parses the surrounding XML with `fast-xml-parser`, returns the table definition.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/feature/getDbSchema.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDbSchema } from "../../../src/tools/feature/getDbSchema.js";

const INSTALL_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<XMLDB PATH="mod/quiz/db" VERSION="2024010100">
  <TABLES>
    <TABLE NAME="quiz" COMMENT="Quizzes available to students.">
      <FIELDS>
        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>
        <FIELD NAME="name" TYPE="char" LENGTH="255" NOTNULL="true"/>
      </FIELDS>
      <KEYS>
        <KEY NAME="primary" TYPE="primary" FIELDS="id"/>
      </KEYS>
    </TABLE>
    <TABLE NAME="quiz_attempts" COMMENT="Attempts.">
      <FIELDS>
        <FIELD NAME="id" TYPE="int" LENGTH="10" NOTNULL="true" SEQUENCE="true"/>
        <FIELD NAME="quiz" TYPE="int" LENGTH="10" NOTNULL="true"/>
      </FIELDS>
    </TABLE>
  </TABLES>
</XMLDB>`;

describe("getDbSchema", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "schema-"));
    await mkdir(join(root, "mod", "quiz", "db"), { recursive: true });
    await writeFile(join(root, "mod", "quiz", "db", "install.xml"), INSTALL_XML);
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns the matching TABLE definition", async () => {
    const out = await getDbSchema.run({ tableName: "quiz" });
    expect(out.file).toBe("mod/quiz/db/install.xml");
    expect(out.fields.map((f) => f.name)).toEqual(["id", "name"]);
    expect(out.keys?.[0].name).toBe("primary");
  });

  it("throws when the table is not found", async () => {
    await expect(getDbSchema.run({ tableName: "nonexistent" })).rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/feature/getDbSchema.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/feature/getDbSchema.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import { resolveCallRoot, rootSchema } from "../common.js";
import { runRipgrep } from "../../lib/ripgrep.js";
import { safeJoin } from "../../lib/paths.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  tableName: z.string().regex(/^[a-z][a-z0-9_]+$/i),
  root: rootSchema,
});

interface FieldDef {
  name: string;
  type: string;
  length?: string;
  notnull?: string;
  sequence?: string;
}

interface KeyDef {
  name: string;
  type: string;
  fields: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

export const getDbSchema: ToolDefinition<typeof inputSchema> = {
  name: "get_db_schema",
  description: "Return the install.xml table definition for a given Moodle DB table.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: `<TABLE NAME=\"${input.tableName}\"`,
      root,
      glob: "install.xml",
      fixedStrings: false,
    });
    if (matches.length === 0) {
      throw new Error(`Table not found in any install.xml: ${input.tableName}`);
    }
    const match = matches[0];
    const xml = await readFile(safeJoin(root, match.file), "utf8");
    const parsed = parser.parse(xml);
    const tables = parsed?.XMLDB?.TABLES?.TABLE;
    const list: any[] = Array.isArray(tables) ? tables : tables ? [tables] : [];
    const table = list.find((t) => t.NAME === input.tableName);
    if (!table) {
      throw new Error(`Table not found after parsing: ${input.tableName}`);
    }
    const fieldNodes = table.FIELDS?.FIELD;
    const fields: FieldDef[] = (Array.isArray(fieldNodes) ? fieldNodes : fieldNodes ? [fieldNodes] : []).map((f: any) => ({
      name: f.NAME,
      type: f.TYPE,
      length: f.LENGTH,
      notnull: f.NOTNULL,
      sequence: f.SEQUENCE,
    }));
    const keyNodes = table.KEYS?.KEY;
    const keys: KeyDef[] = (Array.isArray(keyNodes) ? keyNodes : keyNodes ? [keyNodes] : []).map((k: any) => ({
      name: k.NAME,
      type: k.TYPE,
      fields: k.FIELDS,
    }));
    return {
      file: match.file,
      tableName: input.tableName,
      comment: table.COMMENT ?? "",
      fields,
      keys,
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/feature/getDbSchema.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/feature/getDbSchema.ts tests/tools/feature/getDbSchema.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_db_schema"
```

---

## Task 23: Tool `get_api_usage_examples`

**Files:**
- Create: `src/tools/feature/getApiUsageExamples.ts`
- Test: `tests/tools/feature/getApiUsageExamples.test.ts`

Runs rg with `--context` lines around each match and returns up to 5 snippets.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/feature/getApiUsageExamples.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { getApiUsageExamples } from "../../../src/tools/feature/getApiUsageExamples.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    { file: "mod/quiz/lib.php", line: 30, snippet: "$DB->get_records('quiz', ['id' => $id]);" },
    { file: "lib/datalib.php", line: 12, snippet: "return $DB->get_records('user');" },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("getApiUsageExamples", () => {
  it("returns up to 5 snippets", async () => {
    const out = await getApiUsageExamples.run({ apiFunction: "$DB->get_records" });
    expect(out.examples.length).toBeGreaterThan(0);
    expect(out.examples[0]).toHaveProperty("file");
    expect(out.examples[0]).toHaveProperty("line");
    expect(out.examples[0]).toHaveProperty("snippet");
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/feature/getApiUsageExamples.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/feature/getApiUsageExamples.ts`**

```typescript
import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { resolveCallRoot, rootSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  apiFunction: z.string().min(2).describe("Function/method to find usages of, e.g. $DB->get_records."),
  maxExamples: z.number().int().positive().max(20).default(5),
  root: rootSchema,
});

export const getApiUsageExamples: ToolDefinition<typeof inputSchema> = {
  name: "get_api_usage_examples",
  description: "Return up to 5 real-world usage snippets of a Moodle API across the codebase.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: input.apiFunction,
      root,
      glob: "*.php",
      fixedStrings: true,
    });
    const examples = matches.slice(0, input.maxExamples).map((m) => ({
      file: m.file,
      line: m.line,
      snippet: m.snippet,
    }));
    return { apiFunction: input.apiFunction, examples, totalMatches: matches.length };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/feature/getApiUsageExamples.test.ts
```

Expected: the test passes.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/feature/getApiUsageExamples.ts tests/tools/feature/getApiUsageExamples.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_api_usage_examples"
```

---

## Task 24: Tool `get_bug_context`

**Files:**
- Create: `src/tools/feature/getBugContext.ts`
- Test: `tests/tools/feature/getBugContext.test.ts`

Returns the codebase half — file contents (truncated) + nearby PHP function declarations — and an orchestrator hint instructing Claude to call the Jira MCP for the ticket itself.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/feature/getBugContext.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getBugContext } from "../../../src/tools/feature/getBugContext.js";

describe("getBugContext", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "bug-ctx-"));
    await mkdir(join(root, "mod", "quiz"), { recursive: true });
    await writeFile(
      join(root, "mod", "quiz", "lib.php"),
      `<?php\nfunction quiz_add_instance() { return 1; }\nfunction quiz_update_instance() { return 2; }\n`,
    );
    process.env.MOODLE_ROOT = root;
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
    if (originalRoot === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = originalRoot;
  });

  it("returns instruction, file preview, and functions when filePath provided", async () => {
    const out = await getBugContext.run({ mdlIssue: "MDL-12345", filePath: "mod/quiz/lib.php" });
    expect(out.instruction).toMatch(/jira/i);
    expect(out.mdlIssue).toBe("MDL-12345");
    expect(out.file?.filePath).toBe("mod/quiz/lib.php");
    expect(out.functions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "quiz_add_instance" }),
        expect.objectContaining({ name: "quiz_update_instance" }),
      ]),
    );
  });

  it("works without filePath", async () => {
    const out = await getBugContext.run({ mdlIssue: "MDL-1" });
    expect(out.instruction).toMatch(/jira/i);
    expect(out.file).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/feature/getBugContext.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/feature/getBugContext.ts`**

```typescript
import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { safeJoin } from "../../lib/paths.js";
import { sliceLines } from "../../lib/limits.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z.object({
  mdlIssue: z.string().regex(/^MDL-\d+$/, "Expected an MDL issue key, e.g. MDL-12345."),
  filePath: z.string().min(1).optional(),
  root: rootSchema,
});

interface FunctionEntry {
  name: string;
  line: number;
}

function findFunctions(source: string): FunctionEntry[] {
  const out: FunctionEntry[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (m) out.push({ name: m[1], line: i + 1 });
  }
  return out;
}

export const getBugContext: ToolDefinition<typeof inputSchema> = {
  name: "get_bug_context",
  description:
    "Bundle codebase context (optional file preview + function list) and instruct Claude to fetch the ticket from the Jira MCP.",
  inputSchema,
  async run(input) {
    const instruction = `Call the Jira MCP to fetch ${input.mdlIssue} (summary, description, affected components) and combine with the codebase context below.`;
    if (!input.filePath) {
      return { instruction, mdlIssue: input.mdlIssue };
    }
    const root = resolveCallRoot(input.root);
    const absolute = safeJoin(root, input.filePath);
    try {
      const s = await stat(absolute);
      if (!s.isFile()) throw new Error("not a file");
    } catch {
      throw new Error(`File not found at ${input.filePath} in ${root}`);
    }
    const content = await readFile(absolute, "utf8");
    const sliced = sliceLines(content.split("\n"));
    return {
      instruction,
      mdlIssue: input.mdlIssue,
      file: {
        filePath: input.filePath,
        ...sliced,
      },
      functions: findFunctions(content),
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/feature/getBugContext.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/feature/getBugContext.ts tests/tools/feature/getBugContext.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_bug_context"
```

---

## Task 25: Tool `get_clr_checklist`

**Files:**
- Create: `src/tools/clr/getClrChecklist.ts`
- Test: `tests/tools/clr/getClrChecklist.test.ts`

Loads `guidelines/clr_checklist_<type>.md` from disk.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/clr/getClrChecklist.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getClrChecklist } from "../../../src/tools/clr/getClrChecklist.js";

describe("getClrChecklist", () => {
  it("returns the general checklist by default", async () => {
    const out = await getClrChecklist.run({});
    expect(out.type).toBe("general");
    expect(out.content).toContain("CLR");
  });

  it("returns the db checklist when requested", async () => {
    const out = await getClrChecklist.run({ type: "db" });
    expect(out.type).toBe("db");
    expect(out.content).toBeTruthy();
  });

  it("rejects unknown types", async () => {
    await expect(getClrChecklist.run({ type: "nope" as any })).rejects.toThrow();
  });
});
```

Update `guidelines/clr_checklist_general.md` to ensure it contains the literal token `CLR` somewhere in the file.

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/clr/getClrChecklist.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/clr/getClrChecklist.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const guidelinesDir = join(here, "..", "..", "..", "guidelines");

const TYPES = ["general", "db", "security", "accessibility"] as const;

const inputSchema = z.object({
  type: z.enum(TYPES).default("general"),
});

export const getClrChecklist: ToolDefinition<typeof inputSchema> = {
  name: "get_clr_checklist",
  description: "Return a CLR review checklist (general, db, security, accessibility).",
  inputSchema,
  async run(input) {
    const file = join(guidelinesDir, `clr_checklist_${input.type}.md`);
    const content = await readFile(file, "utf8");
    return { type: input.type, content };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/clr/getClrChecklist.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/clr/getClrChecklist.ts tests/tools/clr/getClrChecklist.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_clr_checklist"
```

---

## Task 26: Tool `check_deprecation_usage`

**Files:**
- Create: `src/tools/clr/checkDeprecationUsage.ts`
- Test: `tests/tools/clr/checkDeprecationUsage.test.ts`

Returns a `notConfigured` payload until `data/deprecated.json` exists. Reads the JSON if present and scans the target file for any listed identifiers.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/clr/checkDeprecationUsage.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDeprecationUsage, setDeprecatedJsonPathForTests } from "../../../src/tools/clr/checkDeprecationUsage.js";

describe("checkDeprecationUsage", () => {
  const originalRoot = process.env.MOODLE_ROOT;
  let root: string;
  let jsonPath: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "dep-"));
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
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/clr/checkDeprecationUsage.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/clr/checkDeprecationUsage.ts`**

```typescript
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { resolveCallRoot, rootSchema } from "../common.js";
import { safeJoin } from "../../lib/paths.js";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
let deprecatedJsonPath = join(here, "..", "..", "..", "data", "deprecated.json");

export function setDeprecatedJsonPathForTests(path: string | undefined): void {
  if (path === undefined) {
    deprecatedJsonPath = join(here, "..", "..", "..", "data", "deprecated.json");
  } else {
    deprecatedJsonPath = path;
  }
}

const inputSchema = z.object({
  filePath: z.string().min(1),
  root: rootSchema,
});

interface DeprecatedEntry {
  name: string;
  since?: string;
  note?: string;
}

export const checkDeprecationUsage: ToolDefinition<typeof inputSchema> = {
  name: "check_deprecation_usage",
  description:
    "Scan a Moodle file for usages of known-deprecated APIs. Returns notConfigured=true until data/deprecated.json is populated.",
  inputSchema,
  async run(input) {
    if (!existsSync(deprecatedJsonPath)) {
      return {
        notConfigured: true,
        message:
          "deprecated.json is not populated yet. Populate data/deprecated.json with `{ items: [{ name, since?, note? }] }`.",
      };
    }
    const raw = JSON.parse(await readFile(deprecatedJsonPath, "utf8"));
    const items: DeprecatedEntry[] = raw.items ?? [];
    const root = resolveCallRoot(input.root);
    const absolute = safeJoin(root, input.filePath);
    const s = await stat(absolute);
    if (!s.isFile()) throw new Error(`Not a file: ${input.filePath}`);
    const source = await readFile(absolute, "utf8");
    const lines = source.split("\n");
    const findings = items
      .map((item) => {
        const re = new RegExp(`\\b${item.name}\\b`);
        const lineHits: number[] = [];
        lines.forEach((line, idx) => {
          if (re.test(line)) lineHits.push(idx + 1);
        });
        return { name: item.name, since: item.since, note: item.note, lines: lineHits };
      })
      .filter((f) => f.lines.length > 0);
    return { findings };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/clr/checkDeprecationUsage.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/clr/checkDeprecationUsage.ts tests/tools/clr/checkDeprecationUsage.test.ts src/tools/index.ts
git commit -m "feat(tools): add check_deprecation_usage"
```

---

## Task 27: Tool `get_component_owner`

**Files:**
- Create: `src/tools/clr/getComponentOwner.ts`
- Test: `tests/tools/clr/getComponentOwner.test.ts`

Returns `notConfigured` until `data/components.json` exists. Looks up the component by name when populated.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/clr/getComponentOwner.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getComponentOwner, setComponentsJsonPathForTests } from "../../../src/tools/clr/getComponentOwner.js";

describe("getComponentOwner", () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "owners-"));
    path = join(dir, "components.json");
    setComponentsJsonPathForTests(path);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    setComponentsJsonPathForTests(undefined);
  });

  it("returns notConfigured when json missing", async () => {
    const out = await getComponentOwner.run({ component: "mod_quiz" });
    expect(out.notConfigured).toBe(true);
  });

  it("returns owner info when present", async () => {
    await writeFile(path, JSON.stringify({ components: { mod_quiz: { owner: "Tim", maintainer: "Hedgehog" } } }));
    const out = await getComponentOwner.run({ component: "mod_quiz" });
    expect(out.notConfigured).toBeFalsy();
    expect(out.owner).toBe("Tim");
    expect(out.maintainer).toBe("Hedgehog");
  });

  it("returns notFound when component missing", async () => {
    await writeFile(path, JSON.stringify({ components: {} }));
    const out = await getComponentOwner.run({ component: "mod_quiz" });
    expect(out.notFound).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/clr/getComponentOwner.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/clr/getComponentOwner.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
let componentsJsonPath = join(here, "..", "..", "..", "data", "components.json");

export function setComponentsJsonPathForTests(path: string | undefined): void {
  if (path === undefined) {
    componentsJsonPath = join(here, "..", "..", "..", "data", "components.json");
  } else {
    componentsJsonPath = path;
  }
}

const inputSchema = z.object({
  component: z.string().min(1),
});

export const getComponentOwner: ToolDefinition<typeof inputSchema> = {
  name: "get_component_owner",
  description:
    "Return owner/maintainer metadata for a Moodle component. Returns notConfigured=true until data/components.json is populated.",
  inputSchema,
  async run(input) {
    if (!existsSync(componentsJsonPath)) {
      return {
        notConfigured: true,
        message:
          "components.json is not populated yet. Populate data/components.json with `{ components: { <name>: { owner, maintainer } } }`.",
      };
    }
    const raw = JSON.parse(await readFile(componentsJsonPath, "utf8"));
    const entry = raw.components?.[input.component];
    if (!entry) return { notFound: true, component: input.component };
    return { component: input.component, ...entry };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/clr/getComponentOwner.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/clr/getComponentOwner.ts tests/tools/clr/getComponentOwner.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_component_owner"
```

---

## Task 28: Tool `find_similar_implementations`

**Files:**
- Create: `src/tools/clr/findSimilarImplementations.ts`
- Test: `tests/tools/clr/findSimilarImplementations.test.ts`

Same idea as `find_similar_feature` but takes a raw regex pattern, defaults to PHP, and keeps the first match per file.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/clr/findSimilarImplementations.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { findSimilarImplementations } from "../../../src/tools/clr/findSimilarImplementations.js";

vi.mock("../../../src/lib/ripgrep.js", () => ({
  runRipgrep: vi.fn(async () => [
    { file: "a.php", line: 1, snippet: "match a" },
    { file: "a.php", line: 5, snippet: "match a again" },
    { file: "b.php", line: 2, snippet: "match b" },
  ]),
  RipgrepError: class extends Error {},
}));

vi.mock("../../../src/lib/paths.js", () => ({
  resolveRoot: () => "/fake",
  PathSafetyError: class extends Error {},
}));

describe("findSimilarImplementations", () => {
  it("dedupes to first match per file", async () => {
    const out = await findSimilarImplementations.run({ pattern: "match" });
    expect(out.results.map((r) => r.file)).toEqual(["a.php", "b.php"]);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/clr/findSimilarImplementations.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/clr/findSimilarImplementations.ts`**

```typescript
import { z } from "zod";
import { runRipgrep } from "../../lib/ripgrep.js";
import { capResults } from "../../lib/limits.js";
import { resolveCallRoot, rootSchema, paginationSchema } from "../common.js";
import type { ToolDefinition } from "../types.js";

const inputSchema = z
  .object({
    pattern: z.string().min(1).describe("ripgrep regex pattern to search for."),
    filePattern: z.string().default("*.php"),
    root: rootSchema,
  })
  .merge(paginationSchema);

export const findSimilarImplementations: ToolDefinition<typeof inputSchema> = {
  name: "find_similar_implementations",
  description:
    "Find similar code patterns across Moodle for cross-component reference. Keeps the first match per file.",
  inputSchema,
  async run(input) {
    const root = resolveCallRoot(input.root);
    const matches = await runRipgrep({
      pattern: input.pattern,
      root,
      glob: input.filePattern,
    });
    const seen = new Set<string>();
    const deduped = matches.filter((m) => (seen.has(m.file) ? false : (seen.add(m.file), true)));
    return capResults(deduped, { offset: input.offset, limit: input.limit });
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/clr/findSimilarImplementations.test.ts
```

Expected: the test passes.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/clr/findSimilarImplementations.ts tests/tools/clr/findSimilarImplementations.test.ts src/tools/index.ts
git commit -m "feat(tools): add find_similar_implementations"
```

---

## Task 29: Tool `get_clr_context` (Jira orchestrator bridge)

**Files:**
- Create: `src/tools/jira/getClrContext.ts`
- Test: `tests/tools/jira/getClrContext.test.ts`

Returns instruction text for Claude (call Jira MCP with this issue) plus an empty `componentFiles` array and the general CLR checklist content. Components for the issue are not auto-derived (would require parsing Jira) — Claude is responsible for following up after fetching the ticket.

- [ ] **Step 1: Write the failing test**

Create `tests/tools/jira/getClrContext.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { getClrContext } from "../../../src/tools/jira/getClrContext.js";

describe("getClrContext", () => {
  it("returns instruction + checklist", async () => {
    const out = await getClrContext.run({ mdlIssue: "MDL-99999" });
    expect(out.instruction).toMatch(/jira/i);
    expect(out.mdlIssue).toBe("MDL-99999");
    expect(out.clrChecklist).toBeTruthy();
    expect(out.componentFiles).toEqual([]);
  });

  it("rejects malformed issue keys", async () => {
    await expect(getClrContext.run({ mdlIssue: "foo" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/tools/jira/getClrContext.test.ts
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement `src/tools/jira/getClrContext.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { ToolDefinition } from "../types.js";

const here = dirname(fileURLToPath(import.meta.url));
const checklistFile = join(here, "..", "..", "..", "guidelines", "clr_checklist_general.md");

const inputSchema = z.object({
  mdlIssue: z.string().regex(/^MDL-\d+$/, "Expected MDL issue key, e.g. MDL-12345."),
});

export const getClrContext: ToolDefinition<typeof inputSchema> = {
  name: "get_clr_context",
  description:
    "Bundle the CLR checklist plus an orchestrator instruction telling Claude to fetch the issue from the Jira MCP and then optionally call list_component_files for any components in scope.",
  inputSchema,
  async run(input) {
    const clrChecklist = await readFile(checklistFile, "utf8");
    return {
      mdlIssue: input.mdlIssue,
      instruction:
        `Call the Jira MCP to fetch ${input.mdlIssue} (summary, description, affected components). ` +
        `For each affected component, call list_component_files on this server to surface its files, ` +
        `then review the patch against the checklist below.`,
      componentFiles: [] as Array<{ component: string; files: string[] }>,
      clrChecklist,
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tools/jira/getClrContext.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Register the tool** — follow the Tool registration recipe above using this task's row in the lookup table (add the `import` to the top of `src/tools/index.ts` and append the identifier to `allTools`). Then run `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/jira/getClrContext.ts tests/tools/jira/getClrContext.test.ts src/tools/index.ts
git commit -m "feat(tools): add get_clr_context"
```

---

## Task 30: MCP Resources

**Files:**
- Modify: `src/resources/index.ts`
- Test: `tests/resources/resources.test.ts`

Wire three Resources backed by the existing markdown stubs.

- [ ] **Step 1: Write the failing test**

Create `tests/resources/resources.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { allResources, listResources, readResource } from "../../src/resources/index.js";

describe("resources", () => {
  it("exposes the three Moodle guidelines URIs", () => {
    const uris = listResources(allResources).map((r) => r.uri);
    expect(uris).toEqual(
      expect.arrayContaining([
        "moodle://guidelines/coding-style",
        "moodle://guidelines/clr-checklist",
        "moodle://guidelines/deprecation",
      ]),
    );
  });

  it("reads a resource", async () => {
    const out = await readResource(allResources, "moodle://guidelines/deprecation");
    expect(out[0].mimeType).toBe("text/markdown");
    expect(out[0].text).toContain("Deprecation");
  });

  it("rejects unknown URIs", async () => {
    await expect(readResource(allResources, "moodle://nope")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npm test -- tests/resources/resources.test.ts
```

Expected: FAIL — `allResources` is currently empty.

- [ ] **Step 3: Update `src/resources/index.ts`**

```typescript
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  read(): Promise<string>;
}

const here = dirname(fileURLToPath(import.meta.url));
const guidelinesDir = join(here, "..", "..", "guidelines");

function mdResource(uri: string, name: string, description: string, file: string): ResourceDefinition {
  return {
    uri,
    name,
    description,
    mimeType: "text/markdown",
    read: () => readFile(join(guidelinesDir, file), "utf8"),
  };
}

export const allResources: ResourceDefinition[] = [
  mdResource(
    "moodle://guidelines/coding-style",
    "Moodle coding style",
    "Core coding-style notes for Moodle PHP.",
    "coding_style.md",
  ),
  mdResource(
    "moodle://guidelines/clr-checklist",
    "Moodle CLR checklist",
    "General CLR (Component Lead Review) checklist.",
    "clr_checklist_general.md",
  ),
  mdResource(
    "moodle://guidelines/deprecation",
    "Moodle deprecation rules",
    "Deprecation handling conventions.",
    "deprecation.md",
  ),
];

export function listResources(resources: ResourceDefinition[]) {
  return resources.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readResource(
  resources: ResourceDefinition[],
  uri: string,
): Promise<Array<{ uri: string; mimeType: string; text: string }>> {
  const match = resources.find((r) => r.uri === uri);
  if (!match) {
    throw new Error(`Unknown resource: ${uri}`);
  }
  return [{ uri: match.uri, mimeType: match.mimeType, text: await match.read() }];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/resources/resources.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/resources/index.ts tests/resources/resources.test.ts
git commit -m "feat(resources): expose three Moodle guidelines as MCP resources"
```

---

## Task 31: Integration smoke test against fixture Moodle

**Files:**
- Create: `tests/smoke/fakeMoodle.test.ts`

Runs three tools (`search_moodle_codebase`, `list_component_files`, `get_db_schema`) end-to-end against `tests/fixtures/fake-moodle/` to confirm the wire-up works without mocks. Requires real `rg` on PATH.

- [ ] **Step 1: Write the test**

Create `tests/smoke/fakeMoodle.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { searchMoodleCodebase } from "../../src/tools/codebase/searchMoodleCodebase.js";
import { listComponentFiles } from "../../src/tools/codebase/listComponentFiles.js";
import { getDbSchema } from "../../src/tools/feature/getDbSchema.js";

const here = dirname(fileURLToPath(import.meta.url));
const fakeRoot = resolve(here, "..", "fixtures", "fake-moodle");

describe("fake-moodle smoke tests", () => {
  const original = process.env.MOODLE_ROOT;

  beforeAll(() => {
    process.env.MOODLE_ROOT = fakeRoot;
  });

  afterAll(() => {
    if (original === undefined) delete process.env.MOODLE_ROOT;
    else process.env.MOODLE_ROOT = original;
  });

  it("search_moodle_codebase finds fake_get_records", async () => {
    const out = await searchMoodleCodebase.run({ query: "fake_get_records" });
    const files = out.results.map((r) => r.file);
    expect(files).toEqual(expect.arrayContaining(["lib/datalib.php"]));
  });

  it("list_component_files returns mod_quiz files", async () => {
    const out = await listComponentFiles.run({ component: "mod_quiz" });
    const paths = out.results.map((r) => r.path);
    expect(paths).toEqual(expect.arrayContaining(["mod/quiz/lib.php", "mod/quiz/db/install.xml"]));
  });

  it("get_db_schema returns the quiz table", async () => {
    const out = await getDbSchema.run({ tableName: "quiz" });
    expect(out.fields.map((f) => f.name)).toEqual(["id", "name"]);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npm test -- tests/smoke/fakeMoodle.test.ts
```

Expected: all 3 tests pass. If `rg` is missing locally, the test fails with a clear ripgrep error — install ripgrep and re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/smoke/fakeMoodle.test.ts
git commit -m "test(smoke): integration tests against fake Moodle fixture"
```

---

## Task 32: README, build, and Claude Code registration

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` with the real version**

```markdown
# moodle-mcp-server

MCP server that gives Claude Code persistent context about the Moodle codebase, coding conventions, and CLR review workflows.

## Requirements

- Node.js 20+
- ripgrep (`rg`) on PATH (`brew install ripgrep` on macOS)
- A local Moodle clone

## Install

```bash
git clone <this-repo> moodle-mcp-server
cd moodle-mcp-server
npm install
npm run build
```

## Configure

Copy `.env.example` to `.env` and set:

```
MOODLE_ROOT=/Users/yusufwibisono/moodles/stable_main
```

Override per call by passing `root` as an argument to any tool.

## Register with Claude Code

Add to `~/.claude/claude.json`:

```json
{
  "mcpServers": {
    "moodle-context": {
      "command": "node",
      "args": ["/Users/yusufwibisono/moodles/mcp/dist/index.js"],
      "env": {
        "MOODLE_ROOT": "/Users/yusufwibisono/moodles/stable_main"
      }
    }
  }
}
```

Restart Claude Code. The server appears under `moodle-context`.

## Tools

| Tool | Purpose |
|------|---------|
| `search_moodle_codebase` | ripgrep matches with offset/limit |
| `read_moodle_file` | read a file relative to MOODLE_ROOT, paginated |
| `list_component_files` | list every file under a Moodle component (e.g. `mod_quiz`) |
| `search_function_definition` | locate PHP function definitions by name |
| `trace_call_path` | definitions + callers for a function |
| `get_hooks` | hook callbacks from `db/hooks.php` / `db/callbacks.php` |
| `get_coding_guidelines` | local guideline notes by topic |
| `get_deprecation_rules` | Moodle deprecation conventions |
| `get_upgrade_note_format` | format for `upgrade.txt` entries |
| `get_feature_scaffold` | starter files for new mod/block/local/report plugins |
| `find_similar_feature` | keyword-based search for existing implementations |
| `get_db_schema` | parse the `install.xml` table definition |
| `get_api_usage_examples` | 3–5 real usages of a Moodle API |
| `get_bug_context` | file preview + function list + Jira orchestrator hint |
| `get_clr_checklist` | review checklist (general/db/security/accessibility) |
| `check_deprecation_usage` | scan a file for known-deprecated APIs (requires `data/deprecated.json`) |
| `get_component_owner` | owner metadata (requires `data/components.json`) |
| `find_similar_implementations` | cross-codebase pattern search |
| `get_clr_context` | bundle checklist + Jira-fetch instruction |

## Resources

- `moodle://guidelines/coding-style`
- `moodle://guidelines/clr-checklist`
- `moodle://guidelines/deprecation`

## Development

```bash
npm run dev          # run from source with tsx
npm run check        # tsc --noEmit + vitest run
npm test             # vitest run
npm run test:watch   # vitest watch
```
```

- [ ] **Step 2: Run the full check**

```bash
npm run check
```

Expected: typecheck passes, all tests pass.

- [ ] **Step 3: Build the production bundle**

```bash
npm run build
ls dist/index.js
```

Expected: `dist/index.js` exists.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: finalize README with setup and tool reference"
```

- [ ] **Step 5: Hand off to the user for Claude Code registration**

Print a final reminder for the human: edit `~/.claude/claude.json` to add the `moodle-context` server entry shown in the README, then restart Claude Code.

---

## Cross-cutting reminders

- After every task, run `npm test` for the touched file at minimum, and `npm run typecheck` after any tasks that change shared types (Tasks 8, 9, 10, 14).
- Don't add tools to `src/tools/index.ts` before the per-tool test passes — that's what keeps each task self-contained.
- If a future contributor adds `data/deprecated.json` or `data/components.json`, they should rerun `npm run check` to confirm the tools flip from `notConfigured` to populated.
