<!-- slug: triage_checklist -->

# Moodle Issue Triage Checklist

Source: https://moodledev.io/general/development/process/triage

## Screening — close vs investigate

Walk through these 11 questions in order. First match decides the outcome.

1. **Support request?** — close as `Not a bug`. Direct user to the forums.
2. **Mistaken for support desk?** — close as `Not a bug`. Refer them to their site administrators.
3. **Previously reported?** — close as `Duplicate`. Link to the original issue.
4. **Affects unsupported versions only?** — close as `Fixed` (if fixed in current) or `Not a bug` (if never reproducible on supported).
5. **Documentation gap?** — fix the docs page, close the issue.
6. **Language string issue?** — close as `Deferred`. Point at the translation process.
7. **Usability issue?** — add the `Usability` component and keep open.
8. **Caused by a 3rd-party plugin?** — move to the CONTRIB project, or close as `Not a bug` if it's the plugin's responsibility.
9. **Plugin-candidate feature?** — add `addon_candidate` label, keep open.
10. **Rational problem?** — if it's unclear what the user wants, ask for a sandbox reproduction.
11. **Replicable?** — if you can't reproduce, request error messages, screenshots, full environment details.

## Confirmation — required tracker fields

When the issue is real and stays open, set/verify:

- **Security level** — flag immediately if a vulnerability is disclosed.
- **Summary** — clear, action-oriented problem statement.
- **Issue Type** — Bug / Improvement / New Feature / Task / Epic / Subtask.
- **Priority** — comparative importance; improvements default to Minor or Major.
- **Component(s)** — primary search variable; multiple components allowed.
- **Affects version** — one or more released supported versions. Exceptions:
  - Main-branch-only bug → put next version (the upcoming release).
  - Unrelated new feature → `Future dev`.
- **Labels** — use standard labels only. Add `patch` if a fix is proposed. Add `addon_candidate` for plugin-suitable features.

## Outcomes summary

| Outcome | When | Status / Resolution |
|---------|------|---------------------|
| Closed: Not a bug | Support, misunderstanding, 3rd-party plugin issue | Closed / Not a bug |
| Closed: Duplicate | Already tracked under another MDL | Closed / Duplicate, with link |
| Closed: Fixed | Resolved in current supported versions | Closed / Fixed |
| Closed: Deferred | Language / translation requests | Closed / Deferred |
| Triaged | Real, accepted, in backlog | Open, `triaged` label set |
| Triaging in progress | Waiting on reporter for clarification | Open, awaiting reporter |
| Sent to Peer review | Patch posted, ready to be reviewed | Open, in peer review queue |

## Follow-up

- Add the `patch` label when a fix is submitted.
- Update **Affects version** if the bug also reproduces on a newer supported release.
- Identify and link duplicates / related issues.
- Remove inactive assignees; encourage community engagement instead.
- Close unresolved triage threads after 30 days of inactivity.

## Triage priority order

1. Security issues — drive count to zero.
2. High-priority blockers / criticals.
3. Partner-reported issues.
4. Patched issues awaiting triage so peer review can start.
5. Developer-reported issues.
6. Recent community-reported bugs.
