# opencode-claude

Makes opencode behave like Claude Code — autonomous, tool-heavy, and task-complete.

## What this does

Installs a global config pack into `~/.config/opencode/` that gives opencode:

- **Behavioral backbone** (`AGENTS.md`) — instructs the agent to act autonomously, explore before implementing, track work with `todowrite`, run tests/linters, and only stop when truly done
- **Smart subagents** — specialized agents for exploration, planning, review, and testing that the main agent spawns in parallel
- **Slash commands** — `/feature`, `/fix`, `/review`, `/pr`, `/explore`
- **Reusable skills** — `feature-build`, `bug-fix`, `smart-commit`, `smart-pr`, `code-review`

## Install

```bash
git clone <this-repo> ~/opencode-claude
cd ~/opencode-claude
chmod +x install.sh
./install.sh
```

Then restart opencode.

## Usage

### Slash commands

| Command | What it does |
|---------|-------------|
| `/feature <description>` | Builds a feature end-to-end: explores, plans, implements, tests, lints, reviews |
| `/fix <description>` | Diagnoses root cause, fixes it, verifies with tests |
| `/review` | Reviews current branch changes for bugs, security, quality |
| `/pr` | Commits anything uncommitted and creates a pull request |
| `/explore <question>` | Maps relevant codebase to answer a question |

### Subagents (invoke with @mention or spawned automatically)

| Agent | Purpose |
|-------|---------|
| `@explorer` | Read-only codebase analysis — architecture, patterns, entry points |
| `@planner` | Designs implementation before coding — files to change, order, interfaces |
| `@reviewer` | Code review — correctness, security, quality, test coverage |
| `@tester` | Runs tests, explains failures, recommends fixes |
| `@feature-dev` | Full 7-phase feature implementation |
| `@ralph-loop` | Iterates until a completion promise is satisfied |

### Skills (load on demand)

| Skill | When to use |
|-------|-------------|
| `feature-build` | Detailed feature build checklist |
| `bug-fix` | Systematic debugging workflow |
| `smart-commit` | Generate and create a conventional commit |
| `smart-pr` | Create a PR with auto-generated description |
| `code-review` | Full parallel code review |

## Project setup

Copy `templates/project-agents.md` to your project root as `AGENTS.md`:

```bash
cp ~/opencode-claude/templates/project-agents.md ./AGENTS.md
```

Fill in your test command, lint command, stack, and architecture notes. Commit it. opencode reads this at session start to understand your project.

## opencode.json

The install script creates `~/.config/opencode/opencode.json` only if one doesn't already exist. See `opencode.json` in this repo for a reference config with:
- Safe permission defaults (blocks `rm -rf`, force-push to main, DROP DATABASE)
- Context7 MCP server pre-configured (disabled by default — enable when needed)

To enable Context7 (free library docs lookup):
```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "enabled": true
    }
  }
}
```

## How it works

The `global-agents.md` is symlinked to `~/.config/opencode/AGENTS.md` and loaded into every session. It tells the agent to:
1. Explore before implementing
2. Track multi-step work with `todowrite`
3. Spawn parallel subagents for independent tasks
4. Verify completion with tests and linters
5. Only report done when all of the above are satisfied

The subagents (`explorer`, `planner`, `reviewer`, `tester`) are configured with tight permissions — they can only do what their role requires. The orchestrating agents (`build` via AGENTS.md, `feature-dev`) have full permissions to spawn and coordinate.

## Uninstall

```bash
rm ~/.config/opencode/AGENTS.md
rm -rf ~/.config/opencode/agents/
rm -rf ~/.config/opencode/skills/
rm -rf ~/.config/opencode/commands/
```
