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

0. **Verify the patch is checked out in the current Moodle worktree before reviewing.**
   - Purpose: confirm the local checkout actually contains the code you're about to review. This is **not** the backport coverage check — that comes from Jira fields in step 7.
   - Resolve the worktree path: use the `root` arg if provided, otherwise the `MOODLE_ROOT` env var, otherwise the current working directory if it looks like a Moodle tree (`config-dist.php` + `version.php` at the root).
   - Run `git -C <worktree> log --oneline --all --grep "$ARGUMENTS" -n 5` to look for commits referencing the MDL issue.
   - Also run `git -C <worktree> branch --list "*$ARGUMENTS*"` to see whether a matching branch was checked out locally.
   - **If neither returns anything**, stop and tell the human:
     ```
     The patch for $ARGUMENTS is not present in <worktree>.

     Pull it with the Moodle Development Kit:

         mdk pull $ARGUMENTS -t

     Then re-run /mdl-review $ARGUMENTS.
     ```
     Do not proceed with the review until the human confirms the patch is pulled.
   - If a branch / commit exists locally, record the branch name and the latest commit SHA — they go into the report header so the reviewer knows which revision was reviewed.
   - Local branches present here have **no bearing on backport coverage**. The set of branches the developer actually shipped lives in the Jira `Pull <branch>` fields and is verified in step 7.

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
7. **Verify backport targets** with `get_backport_targets` using the issue type. **Source of truth = Jira tracker fields**, not the local git repo. Pull the per-branch fields the integrators set on every MDL ticket:
   - `Pull from Repository` / `Pull Main Repository` (master/main branch URL).
   - `Pull Master Branch` (typically `MDL-XXXXX_main` or `MDL-XXXXX_master`).
   - Per-stable fields, e.g. `Pull 502 Branch`, `Pull 501 Branch`, `Pull 500 Branch`, `Pull 405 Branch`.
   - `Pull Master Diff URL` and per-stable diff URLs.
   The set of populated per-stable branch fields is the actual backport coverage. Do **not** infer coverage from `git branch --list` on the local worktree — local checkout state is independent of what the developer published on the tracker.
   Compare the populated tracker branches against `get_backport_targets` output. Flag any required branch missing from the tracker, and call out any extra branch the policy did not request.
8. **Trace risk paths** with `trace_call_path` for every public function the patch modifies — list the callers in the report.
9. **Write the report** to `./reviews/<MDL-num>.md`:

```
# Review — MDL-<num>: <issue summary>

**Reviewer:** Claude
**Date:** YYYY-MM-DD
**Components:** <list>
**Affects version:** <list>
**Worktree:** <absolute path>
**Branch reviewed:** <branch name>
**Commit reviewed:** <sha>
**Patch source:** <Jira attachment URL / linked PR>

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

Source: Jira tracker fields (`Pull <branch>` fields). Local git repo state is informational only.

- Issue type: <bug / regression / security / accessibility / improvement / new_feature>
- Targets per policy: <list from get_backport_targets>
- Branches published on tracker: <list of branches whose `Pull <branch>` field is populated>
- Missing required branches: <list or "none">
- Extra branches beyond policy: <list or "none">

## Suggested tracker labels

<list from analyze_patch>

## Caller impact (from trace_call_path)

For each public function the patch modifies:
- `<function>` — <count> callers across <list of components>. Risk: <low|medium|high>.

## Verdict

Decide each gate from the checklist results above. A "Fail" on any blocker-severity finding closes the gate.

| Gate | Result | Reasoning |
|------|--------|-----------|
| Peer review (passes to Integration review) | **PASS** / **FAIL** | <1-2 sentences citing the checklist rows that drove the decision> |
| Integration review (passes to Push) | **PASS** / **FAIL** / **N/A — peer review failed** | <1-2 sentences> |

**Next round:** <Integration review / Push / Back to developer / Needs reviewer follow-up>

**Recommendation:** **Approve / Request changes / Needs work** — <2-3 sentences>

### Gate rules

- **Peer review PASS** requires: zero blockers AND zero majors in the peer review (17 categories) section.
- **Integration review PASS** requires: peer review PASS AND zero blockers in the integration additions section AND backport targets match policy.
- Any blocker → automatic FAIL for that gate. Majors → FAIL unless explicitly justified inline.
- Minor + nit findings do not block either gate; they go on the "Recommendation" line as follow-ups.
```

10. After writing the file, **print to chat**:
    - Path to the report.
    - A 5-line TL;DR.
    - The **verdict table** (Peer review gate, Integration review gate) with PASS / FAIL per row.
    - The **Next round** line (Integration review / Push / Back to developer / Needs reviewer follow-up).
    - The **Recommendation** line.

Reminder before finishing: confirm to the human "review only — no Jira comments posted, no code edited".
