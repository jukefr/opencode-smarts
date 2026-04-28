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
  # Create tui.json with our plugin using relative path
  echo '{
  "plugin": [
    "./plugins/model-recommender.tsx"
  ]
}' > "$TUI_FILE"
  echo "✓ tui.json created with model-recommender plugin (relative path)"
else
  # Add our plugin to existing array if not already present
  if command -v jq &>/dev/null; then
    # Check if model-recommender is already in the plugins array (as relative path)
    if jq -e '.plugin[] | select(. == "./plugins/model-recommender.tsx")' "$TUI_FILE" > /dev/null; then
      echo "✓ model-recommender already in tui.json"
    else
      # Add model-recommender to the plugins array as relative path
      UPDATED=$(jq '.plugin += ["./plugins/model-recommender.tsx"]' "$TUI_FILE")
      echo "$UPDATED" > "$TUI_FILE"
      echo "✓ Added model-recommender to tui.json (relative path)"
    fi
  else
    echo "⚠ jq not found — please manually add './plugins/model-recommender.tsx' to the plugin array in $TUI_FILE"
  fi
fi

# ── Engram (persistent memory MCP for AI agents) ─────────────────────────────
echo ""
install_engram() {
  if command -v engram &>/dev/null; then
    echo "✓ engram already installed"
    return 0
  fi
  echo "  engram not found, installing..."
  if command -v brew &>/dev/null; then
    if brew install gentleman-programming/tap/engram; then
      return 0
    fi
  fi
  if command -v go &>/dev/null; then
    if go install github.com/Gentleman-Programming/engram@latest; then
      return 0
    fi
  fi
  return 1
}

if install_engram; then
  if engram setup opencode; then
    echo "✓ engram plugin installed (auto-starts server, injects memory into every session)"
  else
    echo "⚠ engram setup opencode failed — run it manually after install"
  fi
else
  echo "⚠ Could not install engram automatically"
  echo "  Install from: https://github.com/Gentleman-Programming/engram"
fi

# ── Graphify (codebase knowledge graphs) ─────────────────────────────────────
echo ""
install_graphify() {
  if command -v graphify &>/dev/null; then
    echo "✓ graphify already installed"
    return 0
  fi
  echo "  graphify not found, installing..."
  if command -v uv &>/dev/null; then
    if uv tool install graphifyy; then
      return 0
    fi
  fi
  if command -v pip &>/dev/null; then
    if pip install graphifyy; then
      return 0
    fi
  fi
  if command -v pip3 &>/dev/null; then
    if pip3 install graphifyy; then
      return 0
    fi
  fi
  return 1
}

if install_graphify; then
  # Run graphify install to register the skill file, then remove its dumb plugin
  graphify install --platform opencode 2>/dev/null || true
  rm -f "$OPENCODE_CONFIG_DIR/plugins/graphify.js" 2>/dev/null || true
  rm -rf .opencode/ 2>/dev/null || true
  echo "✓ graphify ready (skill registered, dumb plugin removed)"
else
  echo "⚠ Could not install graphify automatically"
  echo "  Install from: https://github.com/safishamsi/graphify"
fi

echo ""
echo "Done. Restart opencode to apply changes."
echo ""
echo "Plugin commands:"
echo "  /set-aa-key       — set Artificial Analysis API key for model recommendations"
echo "  /refresh-models   — force-refresh model recommendations"
echo ""
echo "Subagents (invoke with @ or spawned automatically):"
echo "  @explorer, @planner, @reviewer, @tester, @feature-dev"
