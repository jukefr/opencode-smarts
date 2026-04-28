#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
AGENTS_DIR="$OPENCODE_CONFIG_DIR/agents"
SKILLS_DIR="$OPENCODE_CONFIG_DIR/skills"
COMMANDS_DIR="$OPENCODE_CONFIG_DIR/commands"
PLUGINS_DIR="$OPENCODE_CONFIG_DIR/plugins"

echo "Installing opencode-smarts..."
echo ""

# Create config dirs
mkdir -p "$AGENTS_DIR" "$SKILLS_DIR" "$COMMANDS_DIR" "$PLUGINS_DIR"

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

# Plugins
for plugin_file in "$REPO_DIR/plugins"/*; do
  [ -f "$plugin_file" ] || continue
  plugin_name=$(basename "$plugin_file")
  ln -sf "$plugin_file" "$PLUGINS_DIR/$plugin_name"
  echo "✓ plugin: $plugin_name"
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

# TUI configuration — add our plugin to the plugins array
TUI_FILE="$OPENCODE_CONFIG_DIR/tui.json"
if [ ! -f "$TUI_FILE" ]; then
  # Create tui.json with our plugin
  echo '{
  "plugin": [
    "model-recommender"
  ]
}' > "$TUI_FILE"
  echo "✓ tui.json created with model-recommender plugin"
else
  # Add our plugin to existing array if not already present
  if command -v jq &>/dev/null; then
    # Check if model-recommender is already in the plugins array
    if jq -e '.plugin[] | select(. == "model-recommender")' "$TUI_FILE" > /dev/null; then
      echo "✓ model-recommender already in tui.json"
    else
      # Add model-recommender to the plugins array
      UPDATED=$(jq '.plugin += ["model-recommender"]' "$TUI_FILE")
      echo "$UPDATED" > "$TUI_FILE"
      echo "✓ Added model-recommender to tui.json"
    fi
  else
    echo "⚠ jq not found — please manually add 'model-recommender' to the plugin array in $TUI_FILE"
  fi
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
