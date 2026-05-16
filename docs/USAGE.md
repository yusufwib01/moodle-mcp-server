# moodle-mcp-server — Usage Guide

A practical walk-through of every tool, grouped by the Moodle workflow it supports. Read this once; then keep it open as a reference while you work in Claude Code.

> Setup lives in [`../README.md`](../README.md). This guide assumes the server is already registered with Claude Code.

---

## Contents

- [Tools at a glance](#tools-at-a-glance)
- [Resources (always-on context)](#resources-always-on-context)
- [Conventions](#conventions)
- [Workflow recipes](#workflow-recipes)
  - [1. Triage session](#1-triage-session)
  - [2. New feature](#2-new-feature)
  - [3. Bug fix](#3-bug-fix)
  - [4. Peer review](#4-peer-review)
  - [5. Integration review](#5-integration-review)
  - [6. Cross-component refactor](#6-cross-component-refactor)
- [Per-tool reference](#per-tool-reference)
- [Tips and gotchas](#tips-and-gotchas)

---

## Tools at a glance

31 tools, grouped by phase.

| Group | Tools |
|-------|-------|
| **Codebase navigation** | `search_moodle_codebase`, `read_moodle_file`, `list_component_files`, `search_function_definition`, `trace_call_path`, `get_hooks`, `find_capability`, `find_lang_string` |
| **Coding conventions** | `get_coding_guidelines`, `get_deprecation_rules`, `get_upgrade_note_format` |
| **Feature dev + bug fix** | `get_feature_scaffold`, `find_similar_feature`, `get_db_schema`, `get_api_usage_examples`, `get_bug_context`, `analyze_patch`, `get_backport_targets`, `get_moodle_releases` |
| **Peer / integration review** | `get_review_checklist`, `check_deprecation_usage`, `get_component_owner`, `find_similar_implementations`, `check_phpdoc_completeness`, `check_privacy_provider` |
| **Jira / workflow** | `get_review_context`, `get_integration_workflow_helpers` |
| **Triage** | `get_triage_checklist`, `get_triage_canned_response`, `suggest_triage_outcome`, `get_triage_context` |

## Resources (always-on context)

These markdown blobs are mounted as MCP resources. Claude can pull them without you naming a tool.

| URI | Purpose |
|-----|---------|
| `moodle://guidelines/coding-style` | Moodle coding style notes |
| `moodle://guidelines/review-checklist` | General review checklist (covers peer + integration review) |
| `moodle://guidelines/deprecation` | Deprecation handling conventions |
| `moodle://guidelines/triage-checklist` | Triage screening flow |

## Conventions

- **`root`** — every codebase tool accepts an optional `root` argument. Default is `MOODLE_ROOT` from the env. Pass it when you need to query a different worktree (e.g. `~/moodles/stable_502/moodle`) without restarting the server. The Moodle source tree lives under `<worktree>/moodle/`, never the worktree root.
- **Pagination** — every list-returning tool accepts `offset` and `limit`. Defaults: file reads 500 lines, search results 20 hits. Truncated results include a `hint` line telling Claude the exact next-call params.
- **Schema-validated input** — bad inputs fail fast with a Zod error. Tool descriptions ship as JSON Schema so Claude's autocomplete sees the constraints.
- **Path safety** — `read_moodle_file` and similar refuse any path that escapes `MOODLE_ROOT` (including symlinks).

---

## Workflow recipes

Each recipe is what you'd actually say to Claude. The bracketed `[...]` lines show the tool calls Claude is expected to make in response.

### 1. Triage session

You're working through the triage queue. Goal: classify each report fast and respond with the right canned message.

#### Quick triage of a freshly reported issue

> "Triage MDL-88401. Recommend an outcome and draft a reply."

```text
[Claude calls get_triage_context("MDL-88401")]
  → returns the 11-question screening checklist + a Jira orchestrator
    instruction telling Claude to fetch the issue.

[Claude calls the Jira MCP to fetch MDL-88401]

[Claude calls suggest_triage_outcome on the issue description]
  → heuristic classifier returns e.g. { primary: { cannedResponse:
    "contributed_plugin", confidence: "high" }, ... }

[Claude calls get_triage_canned_response("contributed_plugin")]
  → returns the canned reply text with [plugin name] / [component]
    placeholders ready to fill in.
```

Claude then prints: "This looks like a third-party plugin report. Suggested action: move to CONTRIB. Draft reply ready — review the bracketed placeholders before posting."

#### Walking the full screening flow manually

> "Show me the triage checklist."

```text
[Claude calls get_triage_checklist]
  → returns the markdown checklist; Claude walks you through it.
```

#### Picking a different canned response by name

> "Give me the `need_more_info` template."

```text
[Claude calls get_triage_canned_response("need_more_info")]
```

#### Listing every available template

> "What canned responses do we have?"

```text
[Claude calls get_triage_canned_response with no template]
  → returns the list: support_request, administrator_contact,
    contributed_plugin, duplicate, unsupported_version, en_fix,
    translation_request, already_possible, triaged_bug,
    triaged_improvement, triaged_security, need_more_info.
```

---

### 2. New feature

You're starting a new mod plugin or adding a feature to an existing component.

#### Bootstrapping a new mod plugin

> "Generate the file skeleton for a new mod plugin called `widget`."

```text
[Claude calls get_feature_scaffold(type="mod", name="widget")]
  → returns files: mod/widget/version.php, mod/widget/lib.php,
    mod/widget/db/install.xml, mod/widget/lang/en/widget.php.
    Each comes with sensible starter content.
```

Plugin types supported: `mod`, `block`, `local`, `report`.

#### Finding how Moodle already does something

> "Show me how Moodle implements grade export."

```text
[Claude calls find_similar_feature(description="grade export csv")]
  → keyword search across the codebase, dedupes by file,
    returns top 20.
```

> "Show me three usages of `$DB->get_records_sql`."

```text
[Claude calls get_api_usage_examples(apiFunction="$DB->get_records_sql",
   maxExamples=3)]
  → returns 3 real call sites with file + line + snippet.
```

#### Understanding a component's structure

> "List every file under `mod_quiz`."

```text
[Claude calls list_component_files(component="mod_quiz")]
```

> "What hooks does `mod_assign` register?"

```text
[Claude calls get_hooks(component="mod_assign")]
  → reads mod/assign/db/hooks.php + db/callbacks.php.
```

#### Inspecting DB schema before writing queries

> "What's the schema of the `quiz_attempts` table?"

```text
[Claude calls get_db_schema(tableName="quiz_attempts")]
  → finds the install.xml, parses the <TABLE NAME="quiz_attempts">
    block, returns fields + keys.
```

#### Finding capabilities and lang strings

> "Where is the `mod/quiz:view` capability declared?"

```text
[Claude calls find_capability(capability="mod/quiz:view")]
```

> "Where is the `pluginname` lang string defined across the codebase?"

```text
[Claude calls find_lang_string(key="pluginname")]
```

#### Conventions

> "How should I format PHPDoc for a new function?"

```text
[Claude calls get_coding_guidelines(topic="phpdoc")]
```

Other topics: `db_queries`, `deprecation`, `output_api`, `behat`,
`phpunit`, `upgrade_notes`, `coding_style`.

---

### 3. Bug fix

You've got an MDL issue and want context fast.

#### One-shot context gather

> "Get me the context for MDL-88401 — affected file is `mod/quiz/lib.php`."

```text
[Claude calls get_bug_context(mdlIssue="MDL-88401",
   filePath="mod/quiz/lib.php")]
  → returns:
    - instruction: telling Claude to also fetch the issue via the
      Jira MCP for the summary/description/components
    - file: first 500 lines of mod/quiz/lib.php with truncation
      metadata
    - functions: every function declared in that file with its line
      number — great for "show me the entry points"
```

#### Tracking a function before changing it

> "Where is `quiz_add_instance` defined and who calls it?"

```text
[Claude calls trace_call_path(functionName="quiz_add_instance")]
  → { definitions: [...], callers: { results: [...], truncated: bool } }
```

> "Just locate `quiz_add_instance`."

```text
[Claude calls search_function_definition(functionName="quiz_add_instance")]
```

#### Looking for similar fixes

> "Find existing implementations matching `private static function` in `classes/`."

```text
[Claude calls find_similar_implementations(pattern="private static function",
   filePattern="**/classes/**/*.php")]
  → keeps the first match per file, paginated.
```

#### Deciding which branches to backport to

> "Which branches should this bug fix land on? It's a regression."

```text
[Claude calls get_backport_targets(issueType="bug", isRegression=true)]
  → uses the bundled release matrix (sourced from moodledev.io/general/releases)
    to compute targets. Override with asOf / overrideGeneralSupport
    if the matrix is out of date.
```

For security or accessibility fixes:

```text
[Claude calls get_backport_targets(issueType="security")]
[Claude calls get_backport_targets(issueType="accessibility")]
  → both target main + every general-support and security-only stable.
```

> "What does Moodle currently support?"

```text
[Claude calls get_moodle_releases]
  → returns the live release matrix with general/security/future/eol
    classification.
```

---

### 4. Peer review

You're reviewing a teammate's patch before it goes to integration.

#### Start with the patch

> "Analyze this diff and tell me which review areas matter."

```text
[Claude calls analyze_patch(diff=<paste git diff>)]
  → returns:
    - files: each file changed with +/- counts + isNew flag
    - components: resolved Moodle components (e.g. mod_quiz, block_html)
    - suggestedChecklists: which review_checklist topics to load
    - suggestedTrackerLabels: ui_change, affects_mobileapp,
      docs_required, third_party, privacy_implementation
```

#### Pull the relevant checklist(s)

> "Show me the security review checklist."

```text
[Claude calls get_review_checklist(type="security")]
```

Topics available: `general`, `db`, `security`, `accessibility`,
`privacy`, `mobile`, `performance`, `documentation`, `git`,
`third_party`. Each lives in `guidelines/review_checklist_<topic>.md`.

#### Spot-check the patch

> "Does `mod/quiz/lib.php` have PHPDoc on every function?"

```text
[Claude calls check_phpdoc_completeness(filePath="mod/quiz/lib.php")]
  → list of functions/methods with no preceding PHPDoc block.
```

> "Does this patch use any deprecated APIs?"

```text
[Claude calls check_deprecation_usage(filePath="mod/quiz/lib.php")]
  → requires data/deprecated.json (currently returns notConfigured if
    the file does not exist).
```

#### Privacy + component checks

> "Does mod_quiz have a privacy provider matching its install.xml tables?"

```text
[Claude calls check_privacy_provider(component="mod_quiz")]
  → cross-checks classes/privacy/provider.php against install.xml
    tables, flags missing add_database_table entries.
```

> "Who maintains mod_quiz?"

```text
[Claude calls get_component_owner(component="mod_quiz")]
  → requires data/components.json (currently returns notConfigured if
    not populated).
```

---

### 5. Integration review

You're reviewing a patch in its final, in-situ state on integration.

#### Pull the full review context

> "Set me up to integrate MDL-88401."

```text
[Claude calls get_review_context(mdlIssue="MDL-88401")]
  → returns:
    - instruction: tells Claude to fetch the issue from the Jira MCP
      and call list_component_files for each affected component
    - reviewChecklist: the general review checklist markdown
    - componentFiles: empty placeholder; Claude fills it after Jira

[Claude calls the Jira MCP]
[Claude calls list_component_files(component=<each affected component>)]
```

Then Claude walks the checklist against the patch in front of you.

#### Verify the integration workflow tooling

> "Remind me of the integration team's git aliases and CIBot info."

```text
[Claude calls get_integration_workflow_helpers]
  → returns:
    - docs: peer-review, integration, component-lead-review URLs
    - tools: CIBot, TOBIC, moodle-userscripts (with URL)
    - gitAliases: integration-reset, integration-diff, integration-wdiff
      (with exact `git config alias.X '...'` examples)
    - timeline: normal / continuous-integration / on-sync periods
    - workflow: the recommended step-by-step integration review flow
```

#### Decide the backport target set

> "Bug fix, not a regression — which stables should I cherry-pick to?"

```text
[Claude calls get_backport_targets(issueType="bug", isRegression=false)]
  → main + the latest general-support stable only.
```

---

### 6. Cross-component refactor

You're touching multiple Moodle components in one patch.

> "Find every PHP file calling `get_fast_modinfo` so I can audit the call sites."

```text
[Claude calls trace_call_path(functionName="get_fast_modinfo")]
```

> "Search for `class privacy\\provider` across the codebase."

```text
[Claude calls search_moodle_codebase(query="class privacy\\\\provider",
   filePattern="*.php")]
```

> "Read just lines 200–250 of `lib/modinfolib.php`."

```text
[Claude calls read_moodle_file(filePath="lib/modinfolib.php",
   offset=199, limit=51)]
```

> "When this lands, what tracker labels should I set?"

```text
[Claude calls analyze_patch(diff=<git diff against main>)]
  → suggestedTrackerLabels covers ui_change / affects_mobileapp /
    docs_required / third_party / privacy_implementation.
```

---

## Per-tool reference

One-line descriptions for the cheat sheet.

### Codebase navigation
- **`search_moodle_codebase(query, filePattern?, offset?, limit?, root?)`** — ripgrep matches with pagination.
- **`read_moodle_file(filePath, offset?, limit?, root?)`** — line-paginated file read.
- **`list_component_files(component, offset?, limit?, root?)`** — recursive file list under a Moodle component.
- **`search_function_definition(functionName, offset?, limit?, root?)`** — locate PHP function definitions.
- **`trace_call_path(functionName, offset?, limit?, root?)`** — definitions + callers.
- **`get_hooks(component?, offset?, limit?, root?)`** — hook callbacks from `db/hooks.php` / `db/callbacks.php`.
- **`find_capability(capability, offset?, limit?, root?)`** — locate capability declarations.
- **`find_lang_string(key, offset?, limit?, root?)`** — locate lang string assignments.

### Coding conventions
- **`get_coding_guidelines(topic?)`** — guideline notes by topic.
- **`get_deprecation_rules()`** — deprecation handling rules.
- **`get_upgrade_note_format()`** — `upgrade.txt` formatting reference.

### Feature dev + bug fix
- **`get_feature_scaffold(type, name)`** — starter file set for a new plugin.
- **`find_similar_feature(description, offset?, limit?, root?)`** — keyword search for existing implementations.
- **`get_db_schema(tableName, root?)`** — parse the `install.xml` definition.
- **`get_api_usage_examples(apiFunction, maxExamples?, root?)`** — real-world snippets.
- **`get_bug_context(mdlIssue, filePath?, root?)`** — Jira orchestrator + file preview + function list.
- **`analyze_patch(diff)`** — affected files + components + suggested checklists + suggested tracker labels.
- **`get_backport_targets(issueType, isRegression?, asOf?, overrideGeneralSupport?, overrideSecurityOnly?)`** — branches per Moodle's backport policy.
- **`get_moodle_releases(asOf?)`** — current Moodle release support matrix.

### Peer / integration review
- **`get_review_checklist(type?)`** — checklist by topic.
- **`check_deprecation_usage(filePath, root?)`** — scan for known-deprecated APIs (needs `data/deprecated.json`).
- **`get_component_owner(component)`** — owner metadata (needs `data/components.json`).
- **`find_similar_implementations(pattern, filePattern?, offset?, limit?, root?)`** — cross-component pattern search.
- **`check_phpdoc_completeness(filePath, root?)`** — list functions/methods missing PHPDoc.
- **`check_privacy_provider(component, root?)`** — verify privacy provider matches DB tables.

### Jira / workflow
- **`get_review_context(mdlIssue)`** — bundle the review checklist + Jira-fetch instruction.
- **`get_integration_workflow_helpers()`** — CIBot, TOBIC, moodle-userscripts, integration git aliases.

### Triage
- **`get_triage_checklist()`** — 11-question screening flow + required fields + outcomes.
- **`get_triage_canned_response(template?)`** — pick a template by name; omit to list templates.
- **`suggest_triage_outcome(description)`** — heuristic classifier — returns outcome + canned response + confidence.
- **`get_triage_context(mdlIssue)`** — bundle the triage checklist + Jira-fetch instruction.

---

## Tips and gotchas

### Pick the right `root`

You have many Moodle worktrees (stable_main, stable_502, MDL-* branches). The default `MOODLE_ROOT` env var sets the global default; pass `root: "/abs/path/to/stable_502/moodle"` to any tool to query a different worktree without restarting the server. **Register the server once** — do not register a separate instance per worktree.

Worktree layout reminder: the Moodle source lives at `<worktree>/moodle/`, not at the worktree root. Always include the `/moodle` suffix in `MOODLE_ROOT` and any `root` override.

### Installing on a fresh machine

```bash
git clone <repo> moodle-mcp-server
cd moodle-mcp-server
./scripts/install.sh /path/to/moodle
```

That script builds + runs `claude mcp add` for you. Or open the cloned dir in Claude Code with `MOODLE_ROOT` exported — the bundled `.mcp.json` registers the server in project scope automatically.

### Pagination

If a result says `truncated: true`, the `hint` field tells Claude the exact next call:

```text
"more results available — call again with offset=20"
```

Default caps: file reads 500 lines; searches 20 hits. Override with `limit`.

### Jira MCP is separate

The server has no Jira credentials. Tools that mention Jira (`get_bug_context`, `get_review_context`, `get_triage_context`) return an orchestrator instruction that tells Claude to call the Jira MCP separately for the actual ticket. Make sure your Jira MCP is also registered with Claude Code.

### "Not configured" responses

`check_deprecation_usage` and `get_component_owner` return `notConfigured: true` until you populate `data/deprecated.json` and `data/components.json` respectively. Schemas:

```json
// data/deprecated.json
{ "items": [{ "name": "old_function_a", "since": "4.0", "note": "use new_function_a" }] }

// data/components.json
{ "components": { "mod_quiz": { "owner": "Tim", "maintainer": "Hedgehog" } } }
```

### Backport matrix staleness

`get_backport_targets` and `get_moodle_releases` both read `src/lib/moodleReleases.ts`. The hardcoded support dates need a manual bump whenever Moodle ships a release or shifts a version between support windows. Use the `overrideGeneralSupport` / `overrideSecurityOnly` params on `get_backport_targets` to test scenarios without editing the file.

### `analyze_patch` accepts raw diff text

Pipe `git diff main...HEAD` (or any unified diff) into the `diff` argument. The tool doesn't care whether the diff comes from git, GitHub, or a pasted email — as long as it's unified diff format with `+++ b/<path>` lines.

### Heuristic, not authoritative

`suggest_triage_outcome` is pattern matching. High-confidence matches are usually right; medium/low-confidence ones still need your judgement. Always confirm with `get_triage_checklist` before closing or escalating.

### Reading large files

Files over 500 lines get truncated by default. `read_moodle_file` returns a `hint` like `more lines available — call again with offset=500`. For the very large core files (`lib/datalib.php`, `lib/dml/moodle_database.php`) consider scoped queries instead: `search_function_definition` or `get_api_usage_examples` rather than reading the whole file.

### Resources vs tools

The four MCP resources (`moodle://guidelines/...`) load automatically into Claude's context. Tools require explicit calls. If you find yourself repeatedly asking for the review checklist in a session, Claude is probably already seeing it via the resource — you can skip the tool call.

### Pre-commit habit

Before sending a patch to peer review, run yourself through this sequence:

1. `analyze_patch` against your branch diff → `suggestedChecklists` + `suggestedTrackerLabels`.
2. `check_phpdoc_completeness` on each modified PHP file.
3. `check_privacy_provider` on each touched component with new DB tables.
4. `get_backport_targets` to confirm your branch set.

That covers most of the trivially mechanical items peer reviewers will catch.
