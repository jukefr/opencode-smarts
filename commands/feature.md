---
description: Build a feature end-to-end with git flow — branches, implements, commits, and offers a PR
agent: build
---

Build the following feature completely from a new git branch to a conventional commit.

Feature: $ARGUMENTS

## Steps (track with todowrite):

### Git setup
1. Run `git branch --show-current` to check the current branch
2. If on `main`, `master`, or `develop`: create and switch to a feature branch
   - Slugify the feature name (lowercase, hyphens, no special chars, max 40 chars)
   - `git checkout -b feature/<slug>`
   - Example: "add pagination to users list" → `feature/add-pagination-users-list`
3. If already on a feature branch, continue on it

### Implementation
4. Read AGENTS.md — find test command, lint command, conventions
5. Explore the codebase to understand where and how to implement this (use grep/glob or spawn @explorer)
6. For non-trivial features: spawn @planner to design the approach, confirm before implementing
7. Implement the feature following existing patterns exactly
8. Run tests — fix every failure
9. Run linter — fix every warning
10. Spawn @reviewer on changed files — fix any Critical findings

### Commit
11. Run `git diff --stat` to review what changed
12. Stage all changes: `git add -A`
13. Write a conventional commit message:
    - Format: `feat(<scope>): <description in imperative mood>`
    - Example: `feat(users): add pagination to list endpoint`
    - Keep under 72 characters
14. Commit: `git commit -m "<message>"`

### Wrap-up
15. Use the `question` tool to ask: "Feature complete on branch `<branch-name>`. Create a pull request?"
    - Options: "Yes, create PR now" / "No, I'll do it later"
16. If yes: run the `/pr` workflow (push + `gh pr create`)
17. Report: branch name, commit hash, files changed, what was built
