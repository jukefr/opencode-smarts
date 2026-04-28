# OpenCode Claude Enhancement Pack
Adds Claude Code-style smart/automated features to OpenCode using 100% built-in OpenCode capabilities (no source edits required).

## Features
- Hierarchical AGENTS.md context system (matches Claude Code's CLAUDE.md)
- Custom smart agents: `code-explorer`, `code-reviewer`, `feature-dev`, `ralph-loop`
- Automated workflows: `/smart-commit`, `/smart-pr`, `/code-review`
- Engram memory integration preloaded at session start
- Todo-based task tracking for all multi-step work

## Installation
1. Clone this repo to `/home/user/Documents/src/opencode-claude` (already done)
2. Run install script:
   ```bash
   cd /home/user/Documents/src/opencode-claude
   ./install.sh
   ```
3. Restart OpenCode to apply changes

## Usage
### Project Setup
Copy `templates/project-agents.md` to your project root as `AGENTS.md` and fill in project details.

### Available Agents
| Agent | Trigger | Purpose |
|-------|---------|---------|
| `code-explorer` | "Explore auth flow" | Deep codebase analysis |
| `code-reviewer` | "Review my changes" | Bug/compliance checks |
| `feature-dev` | `/feature-dev "Add X"` | 7-phase feature implementation |
| `ralph-loop` | `/ralph-loop "fix tests" --completion-promise "all pass"` | Autonomous iteration |

### Available Skills
| Skill | Trigger | Purpose |
|-------|---------|---------|
| `smart-commit` | `/smart-commit` | Auto-generate conventional commits |
| `smart-pr` | `/smart-pr` | Auto-create PR from changes |
| `code-review` | `/code-review` | Parallel agent code review |

## Structure
```
opencode-claude/
├── templates/           # AGENTS.md templates
│   ├── global-agents.md   # Global rules (symlinked to ~/.config/opencode/)
│   └── project-agents.md  # Project-specific template
├── agents/              # Custom agent SKILL.md files
│   ├── code-explorer/
│   ├── code-reviewer/
│   ├── feature-dev/
│   └── ralph-loop/
├── skills/              # Workflow SKILL.md files
│   ├── smart-commit/
│   ├── smart-pr/
│   └── code-review/
├── install.sh           # Symlink installer
└── README.md
```
