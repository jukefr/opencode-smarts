#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
AGENTS_DIR="$OPENCODE_CONFIG_DIR/agents"
SKILLS_DIR="$OPENCODE_CONFIG_DIR/skills"

echo "Installing opencode-claude components..."

# Create OpenCode config dirs if not exist
mkdir -p "$AGENTS_DIR" "$SKILLS_DIR"

# Symlink global AGENTS.md
ln -sf "$REPO_DIR/templates/global-agents.md" "$OPENCODE_CONFIG_DIR/AGENTS.md"
echo "✅ Linked global AGENTS.md to $OPENCODE_CONFIG_DIR/AGENTS.md"

# Symlink agent .md files to agents directory
for agent_file in "$REPO_DIR/agents"/*.md; do
  if [ -f "$agent_file" ]; then
    agent_name=$(basename "$agent_file")
    ln -sf "$agent_file" "$AGENTS_DIR/$agent_name"
    echo "✅ Linked agent: $agent_name"
  fi
done

# Symlink workflow skills (each skill dir contains SKILL.md)
for skill_dir in "$REPO_DIR/skills"/*/; do
  if [ -d "$skill_dir" ]; then
    skill_name=$(basename "$skill_dir")
    ln -sf "$skill_dir" "$SKILLS_DIR/$skill_name"
    echo "✅ Linked skill: $skill_name"
  fi
done

echo ""
echo "Installation complete. Restart OpenCode to apply all changes."
