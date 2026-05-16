---
description: Triage a Moodle MDL issue — classify, draft a reply, do not post.
argument-hint: MDL-XXXXX
---

Triage Moodle issue **$ARGUMENTS**.

## Hard rules

- **READ Jira only.** Never POST or PUT via the Atlassian MCP. No comments, no field changes, no status transitions. Draft only.
- Output: a drafted reply for the human to review. Print to chat. Never auto-post.

## Steps

1. Call `get_triage_context` with `mdlIssue="$ARGUMENTS"` to pull the screening checklist and the Jira-fetch instruction.
2. Fetch the issue from the Atlassian MCP (Jira) using a **read** operation only. Pull:
   - Summary
   - Description
   - Reporter
   - Affects version(s)
   - Component(s)
   - Current labels
   - Existing comments (for context — do not reply on the ticket)
3. Call `suggest_triage_outcome` with the issue description.
4. Walk the triage checklist (already in context from step 1) and reconcile against the heuristic suggestion.
5. Decide on one outcome:
   - Close as Not a bug
   - Close as Duplicate
   - Close as Fixed
   - Close as Deferred
   - Triaged (accept into backlog)
   - Triaging in progress (need more info)
6. Pull the matching template via `get_triage_canned_response` if one applies.
7. Fill the bracketed placeholders in the canned response with the real values from the ticket.

## Output to chat

Print exactly this structure:

```
MDL-<num> — <one-line summary>

Outcome: <decision>
Confidence: <high|medium|low>
Reasoning: <2-3 sentences>

Required tracker field changes (apply manually):
- <field>: <new value>
- ...

Draft reply (copy/paste to Jira):
---
<filled-in canned response>
---
```

Reminder before finishing: confirm to the human "drafted only — nothing posted to Jira".
