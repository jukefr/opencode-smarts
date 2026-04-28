# opencode-smarts

Makes [opencode](https://opencode.ai) behave like an autonomous coding assistant — git-aware, task-complete, and optimized for complex workflows.

## What it does

Installs a global config pack into `~/.config/opencode/` that gives opencode:

- **Behavioral rules** (`AGENTS.md`) — the agent explores before implementing, tracks work with `todowrite`, always creates a git branch before writing code, commits with conventional commits, offers a PR when done, and only stops when tests and linters pass
- **Auto project detection** (plugin) — on every session start, scans the project for `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`, etc. and creates/updates a project `AGENTS.md` with the detected stack and commands
- **Auto GPL3 license** (plugin) — on every session start, fetches the GPLv3 text from gnu.org and writes a `LICENSE` file if none exists in the repository
- **Model recommender** (TUI plugin) — sidebar panel showing the best free and best paid models based on live data from Artificial Analysis, with a 4-hour local cache to avoid rate limits. Score is a composite of coding ability, intelligence, price, and speed
- **Free OpenRouter models** (plugin) — automatically adds all `:free` OpenRouter models to the model picker, no API key required
- **Rule reinforcement** (plugin) — re-injects the critical git/test/commit rules into the system prompt on every LLM call and into the compaction prompt, so the agent keeps following them even deep into long sessions
- **Auto version bump** (plugin) — after every git commit the agent makes, checks the commit message for semantic type (`feat` → minor, `fix`/`perf`/`refactor` → patch, breaking change → major) and automatically bumps the version in `package.json`, `Cargo.toml`, `pyproject.toml`, or a `VERSION` file, then commits the change
- **Custom primary agent** (`build`) — overrides the default build agent with explicit step-by-step instructions for the full git workflow
- **Specialized subagents** — `@explorer`, `@planner`, `@reviewer`, `@tester`, `@code-explorer`, `@code-reviewer` that get spawned automatically for parallel work
- **Slash commands** — `/feature`, `/fix`, `/review`, `/pr`, `/explore`, `/set-aa-key`, `/refresh-models`
- **Skills** — reusable instruction sets loaded on demand: `feature-build`, `bug-fix`, `smart-commit`, `smart-pr`, `code-review`
- **Safe permissions** — blocks `rm -rf`, force-push to main, `DROP TABLE/DATABASE` by default
- **Context7 MCP** — library docs lookup, enabled by default
- **Engram MCP** — persistent memory across sessions, auto-installed via `install.sh`

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
| `/set-aa-key` | Opens a dialog to enter your Artificial Analysis API key for model recommendations |
| `/refresh-models` | Force-refreshes model recommendations from Artificial Analysis, bypassing the local cache |

### Natural language requests

You don't have to use slash commands. Asking normally also triggers the full workflow:

> "Add pagination to the users list endpoint"

The `build` agent will: check git state → create `feature/add-pagination-users-list` → read `AGENTS.md` → explore the codebase → implement → run tests → run linter → commit → ask if you want a PR.

### Subagents

Invoke directly with `@` or they get spawned automatically:

| Agent | Purpose |
|-------|---------|
| `@explorer` | Read-only codebase analysis — maps architecture, finds patterns, locates entry points |
| `@code-explorer` | Stricter read-only analysis — locked to read/glob/grep/lsp only, no web or bash |
| `@planner` | Designs implementation plan before coding — files to change, order, interfaces, edge cases |
| `@reviewer` | Code review — correctness, security, quality, test coverage. Never modifies files |
| `@code-reviewer` | Stricter code reviewer — launches parallel explore tasks, confidence-scored findings |
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

## Model recommender

The model recommender sidebar shows 4 models: the 2 best free models and the 2 best paid models, ranked by a composite score (coding ability, intelligence, price efficiency, and speed). Each entry shows the model name, price per 1M tokens, and the composite score.

It fetches data from the [Artificial Analysis API](https://artificialanalysis.ai) which requires a free API key. OpenRouter availability data is fetched live on each startup with no key required.

### Setup

1. Get a free API key from [artificialanalysis.ai](https://artificialanalysis.ai)
2. Either set the environment variable: `export AA_API_KEY=your_key_here`
3. Or use the in-app command: `/set-aa-key` — opens a dialog, enter the key and press Enter

AA model data is cached locally for 4 hours so reopening opencode repeatedly won't hit rate limits. Use `/refresh-models` to force a fresh fetch.

## Project setup

The `auto-agents` plugin creates a project `AGENTS.md` automatically on session start if one doesn't exist. It detects your stack and commands from config files.

To customise it, edit the generated `AGENTS.md` in your project root — once you remove the placeholder text, the plugin leaves it alone.

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

### tui.json

The install script creates or updates `~/.config/opencode/tui.json` to register the model recommender TUI plugin. If the file already exists, the plugin entry is appended to the existing `plugin` array.

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
├── install.sh                  # Symlink installer + opencode.json/tui.json merge
├── opencode.json               # Config template (permissions, context7 MCP)
├── templates/
│   └── global-agents.md        # Global rules → ~/.config/opencode/AGENTS.md
├── agents/
│   ├── build.md                # Primary agent override — full git workflow
│   ├── explorer.md             # Read-only codebase analyst
│   ├── code-explorer.md        # Stricter read-only analyst (locked permissions)
│   ├── planner.md              # Implementation architect
│   ├── reviewer.md             # Code reviewer
│   ├── code-reviewer.md        # Stricter code reviewer (parallel, confidence-scored)
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
    ├── auto-agents.ts          # Session-start AGENTS.md auto-detection
    ├── auto-license.ts         # Session-start GPLv3 license auto-creation
    ├── model-recommender.tsx   # TUI sidebar: best free + paid model recommendations
    ├── openrouter-models-fix.ts # Adds all free OpenRouter models to the model picker
    ├── rule-reinforcement.ts   # Re-injects critical rules on every LLM call + compaction
    └── auto-version-bump.ts   # Bumps version file after each semantic commit
```

## Uninstall

```bash
rm ~/.config/opencode/AGENTS.md
rm -rf ~/.config/opencode/agents/
rm -rf ~/.config/opencode/skills/
rm -rf ~/.config/opencode/commands/
rm -rf ~/.config/opencode/plugins/
```

Then manually remove the `permission` and `mcp.context7` blocks from `~/.config/opencode/opencode.json`, and remove the model-recommender entry from `~/.config/opencode/tui.json`.
