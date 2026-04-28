# opencode-smarts

Makes [opencode](https://opencode.ai) behave like an autonomous coding assistant — git-aware, task-complete, and optimized for complex workflows.

## What it does

Installs a global config pack into `~/.config/opencode/` that gives opencode:

- **Behavioral rules** (`AGENTS.md`) — the agent explores before implementing, tracks work with `todowrite`, always creates a git branch before writing code, commits with conventional commits, offers a PR when done, and only stops when tests and linters pass
- **Auto project detection** (plugin) — on every session start, scans the project for `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`, etc. and creates/updates a project `AGENTS.md` with the detected stack and commands
- **Custom primary agent** (`build`) — overrides the default build agent with explicit step-by-step instructions for the full git workflow
- **Specialized subagents** — `@explorer`, `@planner`, `@reviewer`, `@tester` that get spawned automatically for parallel work
- **Slash commands** — `/feature`, `/fix`, `/review`, `/pr`, `/explore`
- **Skills** — reusable instruction sets loaded on demand: `feature-build`, `bug-fix`, `smart-commit`, `smart-pr`, `code-review`
- **Safe permissions** — blocks `rm -rf`, force-push to main, `DROP TABLE/DATABASE` by default
- **Context7 MCP** — library docs lookup, enabled by default

## Install

```bash
git clone <this-repo> ~/opencode-smarts
cd ~/opencode-smarts
chmod +x install.sh
./install.sh
```

Restart opencode after installing.

Re-running `./install.sh` is safe — symlinks are updated and `opencode.json` is merged non-destructively (your existing settings are preserved, new keys are added).

## Usage

### Slash commands

| Command | What it does |
|---------|-------------|
| `/feature <description>` | Creates a `feature/<slug>` branch, explores, plans, implements, runs tests + lint, commits, offers PR |
| `/fix <description>` | Creates a `fix/<slug>` branch, finds root cause, fixes, verifies, commits, offers PR |
| `/review` | Reviews all changes on the current branch — correctness, security, quality, test coverage |
| `/pr` | Commits anything uncommitted + `git push` + `gh pr create` with auto-generated description |
| `/explore <question>` | Spawns `@explorer` to map the codebase and answer the question |

### Natural language requests

You don't have to use slash commands. Asking normally also triggers the full workflow:

> "Add pagination to the users list endpoint"

The `build` agent will: check git state → create `feature/add-pagination-users-list` → read `AGENTS.md` → explore the codebase → implement → run tests → run linter → commit → ask if you want a PR.

### Subagents

Invoke directly with `@` or they get spawned automatically:

| Agent | Purpose |
|-------|---------|
| `@explorer` | Read-only codebase analysis — maps architecture, finds patterns, locates entry points |
| `@planner` | Designs implementation plan before coding — files to change, order, interfaces, edge cases |
| `@reviewer` | Code review — correctness, security, quality, test coverage. Never modifies files |
| `@tester` | Runs the test suite and explains each failure with a recommended fix |
| `@feature-dev` | Full 7-phase autonomous feature implementation |
| `@ralph-loop` | Iterates until a completion promise is satisfied (max 10 iterations) |

### Skills

Loaded on demand by the agent when relevant:

| Skill | When used |
|-------|----------|
| `feature-build` | Detailed 9-phase feature build checklist |
| `bug-fix` | Systematic debugging — reproduce, root cause, fix, verify |
| `smart-commit` | Generate and create a conventional commit from current changes |
| `smart-pr` | Push branch and create PR with auto-generated description |
| `code-review` | Full parallel review across correctness, security, quality, tests |

## Project setup

The `auto-agents` plugin creates a project `AGENTS.md` automatically on session start if one doesn't exist. It detects your stack and commands from config files.

To customise it, edit the generated `AGENTS.md` in your project root — once you remove the placeholder text, the plugin leaves it alone.

You can also start from the template manually:

```bash
cp ~/opencode-smarts/templates/project-agents.md ./AGENTS.md
```

Fill in your test/lint commands, stack, and architecture notes. Commit it.

**Detected automatically:**

| File | What's extracted |
|------|----------------|
| `package.json` | Package manager (bun/pnpm/yarn/npm), dev/build/test/lint/typecheck scripts, framework (React, Next.js, Hono, Prisma, Vitest…) |
| `Cargo.toml` | Rust project name, `cargo build/test/clippy` |
| `go.mod` | Go module name, `go build/test ./...`, `golangci-lint run` |
| `pyproject.toml` | Python stack (Django/FastAPI/Flask), pytest, ruff, mypy, poetry/uv |
| `requirements.txt` / `setup.py` | Python project, pytest |
| `Makefile` | `test`, `build`, `lint`, `dev` targets |

## Configuration

### opencode.json

The install script merges our settings into your existing `~/.config/opencode/opencode.json`. Changes made:

- **`permission`** — added safe defaults: most things allowed, `rm -rf` requires confirmation, force-push and DROP TABLE/DATABASE are blocked
- **`mcp.context7`** — added and enabled (free library docs MCP, no API key needed)

Your existing settings (`model`, `provider`, other MCPs, etc.) are untouched.

Reference config is in `opencode.json` in this repo.

### Enabling/disabling Context7

Context7 is enabled by default. To disable:
```json
{ "mcp": { "context7": { "enabled": false } } }
```

Use it in prompts with: `use context7` — e.g. "How do I configure Hono middleware? use context7"

Or add to your project `AGENTS.md`:
```
When looking up library or framework docs, use the context7 tool.
```

## Repository structure

```
opencode-smarts/
├── install.sh                  # Symlink installer + opencode.json merge
├── opencode.json               # Config template (permissions, context7 MCP)
├── templates/
│   ├── global-agents.md        # Global rules → ~/.config/opencode/AGENTS.md
│   └── project-agents.md      # Project AGENTS.md template (manual use)
├── agents/
│   ├── build.md                # Primary agent override — full git workflow
│   ├── explorer.md             # Read-only codebase analyst
│   ├── planner.md              # Implementation architect
│   ├── reviewer.md             # Code reviewer
│   ├── tester.md               # Test runner and failure explainer
│   ├── feature-dev.md          # Autonomous 7-phase feature developer
│   └── ralph-loop.md           # Iterative loop agent
├── commands/
│   ├── feature.md              # /feature
│   ├── fix.md                  # /fix
│   ├── review.md               # /review
│   ├── pr.md                   # /pr
│   └── explore.md              # /explore
├── skills/
│   ├── feature-build/SKILL.md
│   ├── bug-fix/SKILL.md
│   ├── smart-commit/SKILL.md
│   ├── smart-pr/SKILL.md
│   └── code-review/SKILL.md
└── plugins/
    └── auto-agents.ts          # Session-start AGENTS.md auto-detection
```

## Uninstall

```bash
rm ~/.config/opencode/AGENTS.md
rm -rf ~/.config/opencode/agents/
rm -rf ~/.config/opencode/skills/
rm -rf ~/.config/opencode/commands/
rm -rf ~/.config/opencode/plugins/
```

Then manually remove the `permission` and `mcp.context7` blocks from `~/.config/opencode/opencode.json` if you want to revert those too.
