# Moodle MCP Server — Design Spec

**Date:** 2026-05-16
**Status:** Approved, ready for implementation plan
**Source:** Brainstorming session, 2026-05-16

## Purpose

Standalone TypeScript MCP server giving Claude Code persistent context about the Moodle codebase, coding conventions, and CLR review workflows. Eliminates manual context dumping each session.

## Goals

- Codebase search & file reading without copy-pasting paths.
- CLR review assistance — surface coding guidelines, deprecation rules, review checklists.
- Coding guidelines always available.
- Jira integration via orchestration (Claude calls Jira MCP + Moodle MCP in tandem).
- Feature implementation: component structure, hooks, API context.
- Bug solving: locate relevant files, trace call paths, surface related code.

## Scope

All seven phases built in one session in order: scaffold, codebase search/read, guidelines, feature/bug, CLR, Jira bridge, Resources.

Out of scope (deferred):
- Populated `components.json` and `deprecated.json` data files. Tools return "not configured" until filled.
- Integration tests against a real Moodle clone.
- Caching layer for repeated ripgrep calls.
- HTTP transport.

## Architecture

**Stack:** TypeScript, Node 20+, `@modelcontextprotocol/sdk`, `zod`. Stdio transport.

**Layout:**
```
moodle-mcp-server/
├── src/
│   ├── index.ts              # Server bootstrap, tool/resource registration
│   ├── config.ts             # MOODLE_ROOT resolution (env + per-call override)
│   ├── lib/
│   │   ├── paths.ts          # Path safety (no traversal outside MOODLE_ROOT)
│   │   ├── ripgrep.ts        # rg wrapper, parse JSON output
│   │   ├── moodle.ts         # Component → path mapping
│   │   └── limits.ts         # Truncation + pagination helpers
│   ├── tools/
│   │   ├── codebase.ts       # Phase 2
│   │   ├── guidelines.ts     # Phase 3
│   │   ├── feature.ts        # Phase 4
│   │   ├── clr.ts            # Phase 5
│   │   └── jira.ts           # Phase 6 (orchestrator hint)
│   └── resources/
│       └── index.ts          # Phase 7 MCP Resources
├── guidelines/               # Hand-stubs for CLR-specific topics
├── tests/                    # Vitest, mocked fs/ripgrep
│   └── fixtures/fake-moodle/ # Minimal Moodle-shaped tree for smoke tests
├── .env.example
├── tsconfig.json
├── package.json
└── README.md
```

**Invariants:**
- All paths resolve via `paths.ts`; reject any path escaping `MOODLE_ROOT`.
- All file/search outputs pass through `limits.ts` (hard cap + pagination hint).
- Every tool input validated by a Zod schema.
- Never write to stdout — corrupts MCP stdio protocol. Diagnostics → stderr.

## Configuration

**`MOODLE_ROOT`** — env var. Default root for every tool. Required at startup; server refuses to start if missing or invalid.

**Per-call override** — every tool accepts optional `root?: string`. Used to query different worktrees (e.g. `stable_502` vs `stable_main`) without restarting the server.

## Tool Inventory

All tools: optional `root?: string`. File-reading tools: optional `offset?: number, limit?: number`.

Default limits: file = 500 lines, search = 20 hits.

### Phase 2 — Codebase

| Tool | Input | Returns |
|------|-------|---------|
| `search_moodle_codebase` | `query`, `filePattern?='*.php'`, `offset?`, `limit?` | `[{file, line, snippet}]` via rg |
| `read_moodle_file` | `filePath`, `offset?`, `limit?` | line-numbered contents, truncation metadata |
| `list_component_files` | `component` (e.g. `mod_quiz`) | `[{path, type}]` |
| `search_function_definition` | `functionName` | `[{file, line, signature}]` — rg `function\s+name\s*\(` |
| `trace_call_path` | `functionName` | `{definitions: [...], callers: [...]}` |
| `get_hooks` | `component?` | parsed entries from `db/hooks.php` + `db/callbacks.php` |

### Phase 3 — Guidelines

Source strategy: hybrid (per Q4-D).
- CLR-specific & project-specific content → hand-stubs under `guidelines/`.
- Moodle-canonical content (e.g. coding style) → pulled from local Moodle clone if present, fallback to stub.

| Tool | Source |
|------|--------|
| `get_coding_guidelines` (`topic?`) | local md + fallback to Moodle clone files |
| `get_deprecation_rules` | local stub |
| `get_upgrade_note_format` | local stub |

Stub files: `phpdoc.md`, `db_queries.md`, `deprecation.md`, `output_api.md`, `behat.md`, `phpunit.md`.

### Phase 4 — Feature & Bug

| Tool | Behavior |
|------|----------|
| `get_feature_scaffold` (`type`) | static templates for `mod`, `block`, `local`, `report` |
| `find_similar_feature` (`description`) | rg over codebase using extracted keywords |
| `get_db_schema` (`tableName`) | rg `install.xml` files, return the `<TABLE NAME="...">` block |
| `get_api_usage_examples` (`apiFunction`) | rg + 3–5 snippets with context lines |
| `get_bug_context` (`mdlIssue`, `filePath?`) | codebase context + orchestrator instruction for Claude to call Jira MCP |

### Phase 5 — CLR

| Tool | Behavior |
|------|----------|
| `get_clr_checklist` (`type?`) | local md stubs (`general`, `db`, `security`, `accessibility`) |
| `check_deprecation_usage` (`filePath`) | "not configured" until `deprecated.json` populated |
| `get_component_owner` (`component`) | "not configured" until `components.json` populated |
| `find_similar_implementations` (`pattern`) | rg with broader patterns |

### Phase 6 — Jira bridge

| Tool | Behavior |
|------|----------|
| `get_clr_context` (`mdlIssue`) | returns `{instruction: "call jira mcp with mdlIssue", component_files: [...], clr_checklist: "..."}` — Claude orchestrates the Jira call |

Rationale: MCP servers cannot invoke other MCP servers. Composite tool returns codebase half and instructs Claude to fetch the Jira half itself.

### Phase 7 — Resources

Exposed as MCP Resources (always-on context):
- `moodle://guidelines/coding-style`
- `moodle://guidelines/clr-checklist`
- `moodle://guidelines/deprecation`

## Data Flow

```
Claude → MCP stdio → index.ts dispatch → tool handler
  → zod validate input
  → config.resolveRoot(input.root)
  → paths.safeJoin(root, input.filePath)
  → ripgrep.run(...) | fs.readFile(...)
  → limits.cap(output)
  → return MCP response
```

## Subsystem Contracts

**`paths.ts`**
- `resolveRoot(override?: string): string` — env or override, validated.
- `safeJoin(root: string, rel: string): string` — absolute path; throws `McpError(InvalidParams)` if it escapes root (incl. realpath / symlink check) or contains null bytes.

**`ripgrep.ts`**
- Spawns `rg --json`; parses line-by-line.
- 10s timeout (configurable).
- Honors `.gitignore` (`--no-ignore-vcs=false`).
- Startup check: fail fast with install instructions if `rg` missing.

**`limits.ts`**
- File read: returns `{content, totalLines, truncated, hint}` with explicit next-call params.
- Search: returns `{results, totalMatches, truncated, hint}`.
- Hint phrasing: `"more results — call again with offset=20"`.

**Error model**
- All errors → `McpError` with codes: `InvalidParams`, `InternalError`, `NotFound`.
- Friendly messages (e.g. `"File not found at <relpath> in <root>"`).
- Missing/invalid `MOODLE_ROOT` at startup → server refuses to start.

## Testing

Approach: vitest unit tests, mocked fs + ripgrep.

- `tests/lib/paths.test.ts` — traversal rejection, symlink escape, null byte.
- `tests/lib/ripgrep.test.ts` — mocked spawn, JSON parsing, timeout.
- `tests/lib/limits.test.ts` — truncation math, offset/limit.
- `tests/tools/*.test.ts` — one per tool. Mocked dependencies. Verify Zod rejects bad input, output shape, error mapping.
- One smoke test against `tests/fixtures/fake-moodle/` — minimal Moodle-shaped tree (a `mod_quiz` stub, an `install.xml`, a `db/hooks.php`).

CI hook: `npm test` runs vitest + `tsc --noEmit`.

## Build Order

1. Phase 1 — scaffold, deps, `tsconfig.json`, `.env.example`, README skeleton.
2. Phase 2 — `lib/` primitives (paths, ripgrep, limits) + 6 codebase tools + tests.
3. Phase 3 — guidelines tools + 6 stub md files.
4. Phase 4 — feature/bug tools + scaffold templates.
5. Phase 5 — CLR tools (3 "not configured" stubs + 1 working).
6. Phase 6 — `get_clr_context` orchestrator hint.
7. Phase 7 — Resources registration.
8. Wire to `~/.claude/claude.json` (user does this; snippet provided in README).
9. README + final test pass.

## Claude Code Registration

```json
{
  "mcpServers": {
    "moodle-context": {
      "command": "node",
      "args": ["/Users/yusufwibisono/moodles/mcp/moodle-mcp-server/dist/index.js"],
      "env": {
        "MOODLE_ROOT": "/Users/yusufwibisono/moodles/stable_main"
      }
    }
  }
}
```

## Open Questions

None blocking implementation. Future work:
- Populate `components.json` and `deprecated.json` once usage shape is clear.
- Decide on caching strategy after measuring hot-call patterns.
