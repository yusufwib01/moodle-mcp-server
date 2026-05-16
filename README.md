# moodle-mcp-server

MCP server that gives Claude Code persistent context about the Moodle codebase, coding conventions, and review workflows (peer review + integration review).

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

## Design + plan

- Spec: `docs/superpowers/specs/2026-05-16-moodle-mcp-server-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-16-moodle-mcp-server.md`
