---
description: Review a Moodle MDL issue — both peer + integration, write a report.
argument-hint: MDL-XXXXX
---

Review workflow for **$ARGUMENTS** — covers peer review **and** integration review.

## Hard rules

- **READ Jira only.** Never POST or PUT.
- **Do not edit any code in the Moodle worktree.** Review only.
- Report goes to `./reviews/<MDL-num>.md` in the current working directory. Create the `reviews/` directory if it does not exist.

## Steps

1. Pull the issue from the Atlassian MCP (read only). Capture:
   - Summary, description.
   - Reporter, assignee.
   - Affects version, fix version.
   - Component(s).
   - Tracker labels.
   - Linked patches / branches / pull requests.
   - Existing comments (for context — do not reply on the ticket).
2. Call `get_review_context` with `mdlIssue="$ARGUMENTS"` to load the general review checklist.
3. If a diff / patch / branch is referenced:
   - Fetch it via the Atlassian MCP attachment URL or the linked Git repo.
   - Run `analyze_patch` on the unified diff. Capture `files`, `components`, `suggestedChecklists`, `suggestedTrackerLabels`.
4. Pull every suggested checklist via `get_review_checklist` (one call per type). Always include `general`. Always include checklists relevant to the affected file types (`db`, `security`, `accessibility`, `privacy`, `mobile`, `performance`, `documentation`, `git`, `third_party`).
5. For each affected component:
   - `list_component_files` to inventory the area.
   - `read_moodle_file` for each changed file.
   - `check_phpdoc_completeness` on each modified PHP file.
   - `check_privacy_provider` if the patch adds or modifies DB tables.
   - `check_deprecation_usage` if `data/deprecated.json` is populated.
6. **Map findings to checklist items** for both phases:
   - Peer review (the 17 categories).
   - Integration review additions (target branch, backwards compat, in-situ impact, workflow state, maintainer).
7. **Verify backport targets** with `get_backport_targets` using the issue type. Compare against the branch list the patch actually covers. Flag any missing branch.
8. **Trace risk paths** with `trace_call_path` for every public function the patch modifies — list the callers in the report.
9. **Write the report** to `./reviews/<MDL-num>.md`:

```
# Review — MDL-<num>: <issue summary>

**Reviewer:** Claude
**Date:** YYYY-MM-DD
**Components:** <list>
**Affects version:** <list>
**Patch:** <link / sha / branch name>

## TL;DR

<3-5 line verdict>

## Patch summary

<1 paragraph: what the change does and why>

## Checklist results

### Peer review

| Category | Result | Notes |
|----------|--------|-------|
| 1. Syntax | Pass / Fail / N/A | <one line> |
| 2. Output | Pass / Fail / N/A | ... |
| ... | ... | ... |
| 17. Overall | ... | ... |

### Integration review additions

| Item | Result | Notes |
|------|--------|-------|
| Target branch validation | ... | ... |
| Backwards compatibility | ... | ... |
| In-situ impact | ... | ... |
| Workflow state | ... | ... |
| Maintainer assignment | ... | ... |

## Findings

| Severity | File:Line | Issue | Suggested action |
|----------|-----------|-------|------------------|
| blocker | <file>:<line> | ... | ... |
| major | ... | ... | ... |
| minor | ... | ... | ... |
| nit | ... | ... | ... |

## Backport target verification

- Issue type: <bug / regression / security / accessibility / improvement / new_feature>
- Targets per policy: <list from get_backport_targets>
- Branches in patch: <list>
- Missing: <list or "none">

## Suggested tracker labels

<list from analyze_patch>

## Caller impact (from trace_call_path)

For each public function the patch modifies:
- `<function>` — <count> callers across <list of components>. Risk: <low|medium|high>.

## Recommendation

**Approve / Request changes / Needs work** — <2-3 sentences>
```

10. After writing the file, **print to chat**:
    - Path to the report.
    - A 5-line TL;DR.
    - The "Recommendation" line.

Reminder before finishing: confirm to the human "review only — no Jira comments posted, no code edited".
