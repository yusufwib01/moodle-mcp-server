---
description: Design and implement a new Moodle feature — brainstorm, plan, then code.
argument-hint: MDL-XXXXX
---

New feature workflow for **$ARGUMENTS**.

## Hard rules

- **READ Jira only.** Never POST or PUT.
- You may edit files and commit. Each task in the implementation plan ends in a commit.
- **Do not run any tests.** No `phpunit`, no `behat`. Regression analysis is LLM-only.

## Steps

1. **Pull requirements** from the Atlassian MCP (read only):
   - Summary, description, acceptance criteria.
   - Affects version + target version.
   - Attached Figma URL(s) and design mockups.
   - Linked / related MDL issues.
2. **Figma inspection** — if the ticket links a Figma file or component:
   - Invoke the `figma:figma-implement-design` skill (or read via `use_figma`) to extract the design context, tokens, and component structure.
   - If multiple Figma links exist, ask which is canonical before continuing.
3. **Brainstorm + clarify** — invoke the `superpowers:brainstorming` skill. Ask one question at a time. Cover at minimum:
   - Scope boundaries (what is in, what is out).
   - UX edge cases (empty state, error state, permission denied).
   - Settings exposure (site-level vs course-level).
   - Mobile-app impact (does this need a `affects_mobileapp` label?).
   - Privacy implications (any new tables storing user data?).
   - Accessibility (keyboard, screen reader, contrast).
4. **Pattern search** — find Moodle precedents before designing new patterns:
   - `find_similar_feature` with keywords from the spec.
   - `get_api_usage_examples` for each Moodle API you plan to lean on.
   - `get_hooks` if the feature should expose hooks for plugins.
   - `get_feature_scaffold` if it is a new plugin (mod / block / local / report).
5. **Write the design spec** to `docs/superpowers/specs/<YYYY-MM-DD>-mdl-<num>-<short-name>.md`. Include: goal, scope, non-goals, architecture, data model, API surface, accessibility, mobile impact, privacy, open questions.
6. **Get approval** on the spec before any code. Wait for explicit "yes" from the human.
7. **Write the implementation plan** via the `superpowers:writing-plans` skill. Save to `docs/superpowers/plans/<YYYY-MM-DD>-mdl-<num>-<short-name>.md`. Bite-sized tasks with explicit file paths and commits.
8. **Execute the plan inline** via `superpowers:executing-plans` (or `subagent-driven-development` if the plan is large). Each task ends in a commit.
9. **Regression reasoning during implementation** (LLM only — no shell):
   - For any existing function you touch: `trace_call_path` + read callers.
   - Inspect adjacent components for shared APIs / events.
   - Read the related test suites (`<component>/tests/*_test.php`, `tests/behat/*.feature`) and reason about whether they still hold.
   - Inspect `db/services.php` if web services are involved — breaking the mobile app via signature change is the most common regression.
10. **Documentation hygiene** as part of the work:
    - Run `check_phpdoc_completeness` on each new PHP file.
    - Update `<component>/upgrade.txt` for behaviour or schema changes (`get_upgrade_note_format` for the convention).
    - Add lang strings and reference them with `get_string()`.
    - Apply `check_privacy_provider` if new tables exist.
11. **Backport scope** — call `get_backport_targets` with the right `issueType` so the human knows which branches the work targets.

## Output to chat

After each phase print a short summary. Final summary at the end:

```
MDL-<num> — <feature name>

Spec: <path>
Plan: <path>

Implementation:
- Tasks completed: <count>
- Files added: <count>
- Files modified: <count>

Regression check (LLM reasoning only):
- Callers reviewed: <count>
- Tests inspected: <list>
- Risks: <bullets>

Documentation:
- upgrade.txt updated: <yes/no>
- Lang strings added: <count>
- Privacy provider updated: <yes/no/n_a>

Tracker labels suggested:
- <list from analyze_patch>

Backport targets: <list from get_backport_targets>
```

Reminder before finishing: confirm to the human "no tests were executed — manual verification required, and the spec/plan are still under your review".
