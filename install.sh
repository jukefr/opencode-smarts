#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
AGENTS_DIR="$OPENCODE_CONFIG_DIR/agents"
SKILLS_DIR="$OPENCODE_CONFIG_DIR/skills"
COMMANDS_DIR="$OPENCODE_CONFIG_DIR/commands"

echo "Installing opencode-claude..."
echo ""

# Create config dirs
mkdir -p "$AGENTS_DIR" "$SKILLS_DIR" "$COMMANDS_DIR"

# Global AGENTS.md
ln -sf "$REPO_DIR/templates/global-agents.md" "$OPENCODE_CONFIG_DIR/AGENTS.md"
echo "✓ AGENTS.md → $OPENCODE_CONFIG_DIR/AGENTS.md"

# Agents
for agent_file in "$REPO_DIR/agents"/*.md; do
  [ -f "$agent_file" ] || continue
  agent_name=$(basename "$agent_file")
  ln -sf "$agent_file" "$AGENTS_DIR/$agent_name"
  echo "✓ agent: $agent_name"
done

# Skills (symlink each skill directory — opencode looks for skills/<name>/SKILL.md)
for skill_dir in "$REPO_DIR/skills"/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  ln -sfn "$skill_dir" "$SKILLS_DIR/$skill_name"
  echo "✓ skill: $skill_name"
done

# Commands
for cmd_file in "$REPO_DIR/commands"/*.md; do
  [ -f "$cmd_file" ] || continue
  cmd_name=$(basename "$cmd_file")
  ln -sf "$cmd_file" "$COMMANDS_DIR/$cmd_name"
  echo "✓ command: /$( basename "$cmd_name" .md)"
done

# opencode.json — merge our settings into existing config, or install fresh
CONFIG_FILE="$OPENCODE_CONFIG_DIR/opencode.json"
if [ ! -f "$CONFIG_FILE" ]; then
  cp "$REPO_DIR/opencode.json" "$CONFIG_FILE"
  echo "✓ opencode.json created"
elif command -v jq &>/dev/null; then
  # Deep merge: our template provides defaults, existing values win on conflict.
  # This adds our `permission` block and `mcp.context7` without touching anything else.
  MERGED=$(jq -s '
    .[0] as $tmpl |
    .[1] as $existing |
    $tmpl * $existing
  ' "$REPO_DIR/opencode.json" "$CONFIG_FILE")
  echo "$MERGED" > "$CONFIG_FILE"
  echo "✓ opencode.json merged (permission + mcp.context7 added)"
else
  echo "⚠ jq not found — skipping opencode.json merge (manually add contents of $REPO_DIR/opencode.json)"
fi

echo ""
echo "Done. Restart opencode to apply changes."
echo ""
echo "Commands available after restart:"
echo "  /feature <description>  — build a feature end-to-end"
echo "  /fix <description>      — diagnose and fix a bug"
echo "  /review                 — review current branch changes"
echo "  /pr                     — create a pull request"
echo "  /explore <question>     — explore the codebase"
echo ""
echo "Subagents you can invoke with @:"
echo "  @explorer   — codebase analysis"
echo "  @planner    — implementation design"
echo "  @reviewer   — code review"
echo "  @tester     — run and interpret tests"
echo "  @feature-dev — full feature workflow"
