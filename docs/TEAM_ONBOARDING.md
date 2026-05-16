# Team onboarding — moodle-mcp-server

One-time setup so you can use `/mdl-triage`, `/mdl-bugfix`, `/mdl-newfeature`, and `/mdl-review` from Claude Code against your local Moodle clones.

Time required: ~15 minutes.

---

## 0. Prerequisites

You need all of these installed and reachable on `PATH`:

| Tool | Install (macOS) | Why |
|------|-----------------|-----|
| Node.js 20+ | `brew install node` | Runs the MCP server |
| ripgrep | `brew install ripgrep` | All codebase searches go through `rg` |
| git | (already installed) | Used by the review command to inspect the worktree |
| [Claude Code](https://claude.com/claude-code) | Per the official installer | Hosts the MCP server and the slash commands |
| [mdk](https://github.com/FMCorz/mdk) | Per its README | Pulls patches from the Moodle tracker |

Already-have list — check each:

```bash
node --version          # >= 20
rg --version
claude --version
mdk --version
```

You also need a working Moodle checkout — the standard `MDK`-style layout where the actual Moodle source lives at `<worktree>/moodle/`:

```text
~/moodles/
├── stable_main/moodle/
├── stable_502/moodle/
└── MDL-XXXXX_main/moodle/
```

---

## 1. Register the MCPs Claude Code will chain

The Moodle workflow commands chain **this** MCP with **your Jira** MCP. You register the Jira MCP yourself with your Atlassian account.

### Atlassian (Jira) — read access to the Moodle tracker

```bash
claude mcp add atlassian --transport sse https://mcp.atlassian.com/v1/sse
```

You will be prompted to log in to your Atlassian account in a browser. The slash commands here **read** Jira issues; they never write back.

### Figma (optional, for `/mdl-newfeature`)

Skip unless the issues you'll work on link Figma designs.

```bash
claude mcp add figma --transport sse https://mcp.figma.com/v1/sse
```

(Or whichever transport your Figma org provides.)

---

## 2. Clone + install moodle-mcp-server

```bash
git clone git@github.com:<org>/moodle-mcp-server.git ~/code/moodle-mcp-server
cd ~/code/moodle-mcp-server
./scripts/install.sh /path/to/your/moodle/checkout
```

For example:

```bash
./scripts/install.sh /Users/<you>/moodles/stable_main/moodle
```

`install.sh` does four things:

1. Verifies you have `node`, `npm`, `claude`, and `rg`.
2. Runs `npm install` and `npm run build`.
3. Calls `claude mcp add moodle-context --scope user -e MOODLE_ROOT=<path> -- node <repo>/dist/index.js`. Idempotent — re-runs replace the existing registration.
4. Copies the four `mdl-*.md` slash commands into `~/.claude/commands/`.

Verify:

```bash
claude mcp list
```

You should see `moodle-context` and `atlassian` (and optionally `figma`).

---

## 3. Shell alias for re-runs

Each time the upstream repo changes or you want to retarget `MOODLE_ROOT`, you re-run the installer. Add an alias so it's a single word:

```bash
echo 'alias moodle-mcp-setup='\''~/code/moodle-mcp-server/scripts/install.sh "$PWD"'\''' >> ~/.zshrc
source ~/.zshrc
```

Now `moodle-mcp-setup` uses the current working directory as `MOODLE_ROOT`. Usage:

```bash
cd ~/moodles/stable_main/moodle
moodle-mcp-setup
```

If you use `bash` instead of `zsh`, append the same line to `~/.bashrc`.

---

## 4. Optional — free-form aliases

The slash commands work out of the box: `/mdl-triage MDL-12345`, `/mdl-bugfix MDL-12345`, etc.

If you prefer typing `triage: MDL-12345`, append the snippet from `commands/CLAUDE_MD_SNIPPET.md` to your global Claude Code config:

```bash
cat ~/code/moodle-mcp-server/commands/CLAUDE_MD_SNIPPET.md
# copy the inner ```markdown block into ~/.claude/CLAUDE.md
```

Create `~/.claude/CLAUDE.md` first if it doesn't exist.

---

## 5. Smoke test

Restart Claude Code so it picks up the new MCP registration + commands. Then try:

```text
/mdl-triage MDL-88401
```

If everything is wired correctly, Claude will:

1. Call the moodle-context `get_triage_context` tool.
2. Read MDL-88401 from the Atlassian MCP.
3. Print a drafted reply (never posts to Jira).

Other smoke checks:

```text
/mdl-review MDL-88401
```

```text
"Read mod/quiz/lib.php"
"Find the get_fast_modinfo function"
"What hooks does mod_assign register?"
```

---

## 6. Working with multiple Moodle worktrees

You only register the MCP **once**. Pass the worktree per call via the tool's `root` argument, or switch your shell into the worktree before re-running `moodle-mcp-setup`:

```bash
cd ~/moodles/MDL-87554_main/moodle
moodle-mcp-setup     # re-points MOODLE_ROOT at this worktree
```

The default `MOODLE_ROOT` is what you set last. Individual tool calls can override it by passing `root="/abs/path/to/another/worktree/moodle"`.

---

## 7. Updating

When the upstream repo changes:

```bash
cd ~/code/moodle-mcp-server
git pull
moodle-mcp-setup     # rebuilds + re-registers + refreshes slash commands
```

The installer is idempotent, so re-running is the canonical update path.

---

## 8. Hard rules baked into every command

Every Moodle workflow slash command obeys these — they are not optional:

- **READ Jira only.** Never POST, PUT, comment, change fields, or transition status.
- **No test execution.** No automatic `phpunit` or `behat` runs. Regression analysis is LLM reasoning over related test files.
- **Bug fix and new feature commands edit files and commit.** Triage and review commands do not edit Moodle code.
- **Review reports land in `./reviews/<MDL-num>.md`** in your current working directory. Triage drafts print to chat.

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `MCP server moodle-context already exists in user config` | Re-run `moodle-mcp-setup`; the latest installer removes the existing registration before adding. |
| `ripgrep (rg) not found on PATH` | `brew install ripgrep` (or your distro's package). |
| `MOODLE_ROOT is not set` | You ran `install.sh` without a path argument and without exporting `MOODLE_ROOT`. Pass the path explicitly. |
| Slash commands missing | Re-run `moodle-mcp-setup` — it copies the latest `mdl-*.md` into `~/.claude/commands/`. Restart Claude Code afterwards. |
| Jira reads fail | Re-authenticate the Atlassian MCP. The Moodle commands won't run without it. |
| `mdl-review` keeps saying "patch not present" | Run `mdk pull <MDL> -t` inside the worktree, then re-run the review. |
| Reviewing wrong revision | `cd` into the worktree that has the right branch checked out before invoking the command. The verdict report's header shows the branch + SHA it reviewed. |

---

## 10. Who to ping

| Question | Owner |
|----------|-------|
| MCP server changes | Yusuf (and whoever the repo lists as code owner) |
| Moodle review policy disputes | Moodle integration team / your component lead |
| Tracker / Jira access | Your Atlassian admin |
