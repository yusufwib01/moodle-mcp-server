#!/usr/bin/env bash
# Install or refresh the moodle-context MCP server in Claude Code (user scope).
# Usage:
#   ./scripts/install.sh                       # uses $MOODLE_ROOT from env
#   ./scripts/install.sh /path/to/moodle       # explicit root override
#   MOODLE_ROOT=/path/to/moodle ./scripts/install.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_NAME="moodle-context"
DIST_ENTRY="${PROJECT_ROOT}/dist/index.js"

ROOT_OVERRIDE="${1:-${MOODLE_ROOT:-}}"

err() { printf '\033[31m[install]\033[0m %s\n' "$*" >&2; }
log() { printf '\033[36m[install]\033[0m %s\n' "$*"; }

# 1. Required tooling
for bin in node npm claude rg; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    err "missing required tool: $bin"
    case "$bin" in
      rg) err "install ripgrep: brew install ripgrep" ;;
      claude) err "install Claude Code: https://claude.com/claude-code" ;;
      *) err "install $bin and re-run" ;;
    esac
    exit 1
  fi
done

# 2. MOODLE_ROOT
if [[ -z "$ROOT_OVERRIDE" ]]; then
  err "MOODLE_ROOT not set. Pass a path as the first argument or export MOODLE_ROOT."
  exit 1
fi
if [[ ! -d "$ROOT_OVERRIDE" ]]; then
  err "MOODLE_ROOT does not exist: $ROOT_OVERRIDE"
  exit 1
fi
log "MOODLE_ROOT = $ROOT_OVERRIDE"

# 3. Build
cd "$PROJECT_ROOT"
log "installing npm deps"
npm install --silent
log "compiling TypeScript"
npm run build --silent

if [[ ! -f "$DIST_ENTRY" ]]; then
  err "build did not produce $DIST_ENTRY"
  exit 1
fi

# 4. Re-register (idempotent — remove any existing, then add)
log "removing any existing $SERVER_NAME registration (ignored if absent)"
claude mcp remove "$SERVER_NAME" --scope user >/dev/null 2>&1 || true
claude mcp remove "$SERVER_NAME" >/dev/null 2>&1 || true

log "registering $SERVER_NAME with Claude Code (user scope)"
claude mcp add "$SERVER_NAME" \
  --scope user \
  -e "MOODLE_ROOT=$ROOT_OVERRIDE" \
  -- node "$DIST_ENTRY"

# 5. Install slash commands
COMMANDS_SRC="${PROJECT_ROOT}/commands"
COMMANDS_DEST="${HOME}/.claude/commands"
mkdir -p "$COMMANDS_DEST"
for f in "$COMMANDS_SRC"/mdl-*.md; do
  [[ -f "$f" ]] || continue
  cp "$f" "$COMMANDS_DEST/"
  log "installed $(basename "$f") -> $COMMANDS_DEST/"
done

# 6. CLAUDE.md alias hint
GLOBAL_CLAUDE_MD="${HOME}/.claude/CLAUDE.md"
if ! grep -q "Moodle MDL workflows" "$GLOBAL_CLAUDE_MD" 2>/dev/null; then
  log ""
  log "to enable free-form prompts like 'triage: MDL-12345', append the block in"
  log "  $COMMANDS_SRC/CLAUDE_MD_SNIPPET.md"
  log "to $GLOBAL_CLAUDE_MD"
  log ""
fi

log "done. restart Claude Code to pick up the new registration."
log "verify with: claude mcp list"
log "available slash commands: /mdl-triage /mdl-bugfix /mdl-newfeature /mdl-review"
