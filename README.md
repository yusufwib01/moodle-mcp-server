# moodle-mcp-server

MCP server that gives Claude Code persistent context about the Moodle codebase, coding conventions, and review workflows (peer review + integration review).

## Requirements

- Node.js 20+
- ripgrep (`rg`) on PATH (`brew install ripgrep` on macOS)
- A local Moodle clone

## Install + register (quick path)

```bash
git clone <this-repo> moodle-mcp-server
cd moodle-mcp-server
./scripts/install.sh /path/to/your/moodle
```

The script installs deps, builds, then runs `claude mcp add` for you under user scope. Restart Claude Code afterwards. Verify with `claude mcp list`.

Re-run any time you bump the code or want to point the server at a different `MOODLE_ROOT` — the script is idempotent (removes the existing registration first).

## Multiple Moodle worktrees

Register **once**. Tools accept an optional `root` argument per call, so the same server serves every worktree on this machine. Pass an absolute path:

```
Read mod/quiz/lib.php under /Users/me/moodles/stable_502
→ Claude calls read_moodle_file(filePath="mod/quiz/lib.php",
                                root="/Users/me/moodles/stable_502")
```

`MOODLE_ROOT` is just the default when no `root` is supplied.

## Project-scope auto-registration

The repo ships a `.mcp.json` at the root. When you open this directory in Claude Code, it offers to load the `moodle-context` server in project scope. Set `MOODLE_ROOT` in your shell env first — `.mcp.json` reads it via `${MOODLE_ROOT}` expansion.

```bash
export MOODLE_ROOT=/Users/yusufwibisono/moodles/stable_main
```

Project scope is great for trying the repo on a new machine without touching user config.

## Manual registration (low-level)

If you prefer running the CLI yourself:

```bash
claude mcp add moodle-context \
  --scope user \
  -e MOODLE_ROOT=/path/to/your/moodle \
  -- node "$(pwd)/dist/index.js"
```

Remove with `claude mcp remove moodle-context`. List with `claude mcp list`.

## Configure (env file)

`.env.example` documents the env vars the server reads at startup:

```
MOODLE_ROOT=/Users/yusufwibisono/moodles/stable_main
# MOODLE_MCP_RG_TIMEOUT_MS=10000
```

The server only reads its env. The `claude mcp add ... -e` flag is what actually injects values when Claude Code spawns the process.

## Tools

| Tool | Purpose |
|------|---------|
| `search_moodle_codebase` | ripgrep matches with offset/limit |
| `read_moodle_file` | read a file relative to MOODLE_ROOT, paginated |
| `list_component_files` | list every file under a Moodle component (e.g. `mod_quiz`) |
| `search_function_definition` | locate PHP function definitions by name |
| `trace_call_path` | definitions + callers for a function |
| `get_hooks` | hook callbacks from `db/hooks.php` / `db/callbacks.php` |
| `find_capability` | locate Moodle capability declarations across `db/access.php` |
| `find_lang_string` | locate `$string['key']` definitions across `lang/en/*.php` |
| `get_coding_guidelines` | local guideline notes by topic |
| `get_deprecation_rules` | Moodle deprecation conventions |
| `get_upgrade_note_format` | format for `upgrade.txt` entries |
| `get_feature_scaffold` | starter files for new mod/block/local/report plugins |
| `find_similar_feature` | keyword-based search for existing implementations |
| `get_db_schema` | parse the `install.xml` table definition |
| `get_api_usage_examples` | 3–5 real usages of a Moodle API |
| `get_bug_context` | file preview + function list + Jira orchestrator hint |
| `analyze_patch` | parse unified diff, return affected files + components + suggested review checklists + suggested tracker labels |
| `get_backport_targets` | recommend branches a fix should land on per Moodle's backport policy (security + accessibility hit all supported stables; bug fixes follow the general-support window) |
| `get_moodle_releases` | current Moodle release support matrix sourced from moodledev.io/general/releases |
| `get_review_checklist` | Moodle review checklist (general / db / security / accessibility / privacy / mobile / performance / documentation / git / third_party) — covers peer review and integration review |
| `check_deprecation_usage` | scan a file for known-deprecated APIs (requires `data/deprecated.json`) |
| `get_component_owner` | owner metadata (requires `data/components.json`) |
| `find_similar_implementations` | cross-codebase pattern search |
| `check_phpdoc_completeness` | list functions/methods missing a PHPDoc block in a file |
| `check_privacy_provider` | verify a component's Privacy API provider matches its DB tables |
| `get_review_context` | bundle review checklist + Jira-fetch instruction |
| `get_integration_workflow_helpers` | references: CIBot, TOBIC, moodle-userscripts, integration git aliases |
| `get_triage_checklist` | Moodle issue triage checklist (11-question screening flow, required fields, outcomes) |
| `get_triage_canned_response` | reusable tracker reply templates (support_request, duplicate, contributed_plugin, unsupported_version, en_fix, translation_request, already_possible, triaged_bug, triaged_improvement, triaged_security, need_more_info, administrator_contact) |
| `suggest_triage_outcome` | heuristic classifier for an issue description — suggests outcome + canned response |
| `get_triage_context` | bundle triage checklist + Jira-fetch instruction for an MDL issue |

## Resources

- `moodle://guidelines/coding-style`
- `moodle://guidelines/review-checklist`
- `moodle://guidelines/deprecation`
- `moodle://guidelines/triage-checklist`

## Development

```bash
npm run dev          # run from source with tsx
npm run check        # tsc --noEmit + vitest run
npm test             # vitest run
npm run test:watch   # vitest watch
```

## Usage

- Detailed workflow recipes + per-tool reference: [`docs/USAGE.md`](docs/USAGE.md)

## Design + plan

- Spec: `docs/superpowers/specs/2026-05-16-moodle-mcp-server-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-16-moodle-mcp-server.md`
