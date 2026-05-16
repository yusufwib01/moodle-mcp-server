# Global CLAUDE.md snippet — Moodle MDL workflows

Append this block to **`~/.claude/CLAUDE.md`** (create the file if it does not exist) so Claude Code recognises free-form `<workflow>: MDL-XXXX` prompts as aliases for the corresponding slash command.

```markdown
## Moodle MDL workflows

When the user types one of these free-form prompts, invoke the matching slash command immediately:

- "triage: MDL-XXXXX" → run `/mdl-triage MDL-XXXXX`
- "bugfix: MDL-XXXXX" → run `/mdl-bugfix MDL-XXXXX`
- "newfeature: MDL-XXXXX" → run `/mdl-newfeature MDL-XXXXX`
- "review: MDL-XXXXX" → run `/mdl-review MDL-XXXXX`

These commands chain the moodle-context MCP with the Atlassian (Jira) MCP.

**Hard rule for every Moodle workflow:** READ Jira via the Atlassian MCP — never POST, PUT, or otherwise mutate the ticket. No comments, no field changes, no status transitions. Draft replies / reports only.
```

That single block is enough — the four slash commands themselves encode the detailed workflow.
