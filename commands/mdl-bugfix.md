---
description: Analyze and fix a Moodle bug — autonomous edits + commit, no test runs.
argument-hint: MDL-XXXXX
---

Bug fix workflow for **$ARGUMENTS**.

## Hard rules

- **READ Jira only.** Never POST or PUT.
- You may edit files and create a git commit. Edit only what the fix requires.
- **Do not run any tests.** No `phpunit`, no `behat`, no shellouts. Regression analysis is LLM-only — read the related test files and reason about whether the fix could break their assertions.

## Steps

1. Pull MDL context: call `get_bug_context` with `mdlIssue="$ARGUMENTS"`. If the ticket description names a file, pass it as `filePath`.
2. Fetch the issue from the Atlassian MCP (read only). Pull summary, description, steps to reproduce, attached patches/screenshots, affects version, component.
3. Locate the buggy code:
   - `search_function_definition` for any function the description names.
   - `trace_call_path` to understand entry points.
   - `search_moodle_codebase` for broader text matches.
   - `read_moodle_file` to inspect the suspect file(s).
4. Identify the root cause. State it in one paragraph in the chat.
5. Plan the minimal fix — name the file(s) and the lines to change.
6. **Regression reasoning** (LLM only — no shell):
   - For every function you intend to edit, run `trace_call_path` and list each caller.
   - Read the relevant tests:
     - `<component>/tests/*_test.php` (PHPUnit)
     - `<component>/tests/behat/*.feature` (Behat)
   - Reason: would your change violate any assertion or step? Capture risks.
   - Inspect sibling files in the same component for shared state / cached values that might be invalidated.
   - List every risk explicitly, even small ones.
7. Apply the edits.
8. Run `check_phpdoc_completeness` on each modified PHP file. Fix any missing PHPDoc blocks introduced by the change.
9. Check deprecation hygiene: `check_deprecation_usage` on the file if `data/deprecated.json` is configured.
10. Stage and commit:
    - Subject: `MDL-<num> <component>: <imperative subject>`
    - Body: short why + reference to the ticket.
    - **Never** force-push, never skip hooks.

## Output to chat

Print exactly this structure:

```
MDL-<num> — <one-line summary of the bug>

Root cause:
<1 paragraph>

Fix applied:
<1-2 sentences>

Files changed:
- <path>:<line ranges>

Regression check (LLM reasoning only):
- Callers reviewed: <count>
- Tests reviewed: <list of PHPUnit + Behat files>
- Risks: <bullet list with severity tags>
- Mitigations applied: <bullet list>

Commit: <sha> <subject>
```

Reminder before finishing: confirm to the human "no tests were executed — manual verification required".
