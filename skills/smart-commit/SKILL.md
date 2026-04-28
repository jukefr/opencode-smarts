---
name: smart-commit
description: Generate and create a conventional commit from staged or unstaged changes
license: MIT
compatibility: opencode
---

## Trigger
Load this skill when asked to commit changes, create a commit, or run `/smart-commit`.

## Workflow

### 1. Gather Context
Run these in parallel:
- `git status --short` — see what's staged vs unstaged
- `git diff HEAD` — full diff of all changes
- `git log --oneline -5` — recent commit style to match

### 2. Determine Commit Type
Analyze the diff to pick the right type:
- `feat` — new feature or behavior added
- `fix` — bug corrected
- `refactor` — code restructured, no behavior change
- `docs` — documentation only
- `test` — tests added or fixed
- `chore` — build, deps, tooling, config
- `style` — formatting, whitespace (rare)

### 3. Write the Message
Format: `<type>(<scope>): <description>`

Rules:
- Description in imperative mood: "add auth middleware" not "added auth middleware"
- Under 72 characters total
- Scope is the module/area affected (optional but useful): `feat(auth): add JWT refresh`
- Body optional — add if the "why" needs explanation

### 4. Commit
```bash
git add -A
git commit -m "<generated-message>"
```

### 5. Confirm
Run `git log --oneline -1` and report the commit hash and message.
