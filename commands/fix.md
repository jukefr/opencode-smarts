---
description: Fix a bug with git flow — branches, diagnoses, fixes, commits, and offers a PR
agent: build
---

Fix the following bug completely from a new git branch to a conventional commit.

Bug: $ARGUMENTS

## Steps:

### Git setup
1. Run `git branch --show-current` to check the current branch
2. If on `main`, `master`, or `develop`: create and switch to a fix branch
   - Slugify the bug description (lowercase, hyphens, max 40 chars)
   - `git checkout -b fix/<slug>`
   - Example: "login form doesn't show validation errors" → `fix/login-form-validation-errors`
3. If already on a feature/fix branch, continue on it

### Fix
4. Find the relevant code (grep/glob/lsp for function names, error messages, file paths from the bug report)
5. Read the code to understand what's actually happening vs. what's expected
6. Identify the root cause (not just the symptom)
7. Write a failing test that reproduces the bug — run it and confirm it fails
8. Fix the root cause with the minimal correct change
9. Run the reproducing test — confirm it now passes
10. Run the full test suite — fix any regressions
11. Run the linter

### Commit
12. Run `git diff --stat` to review what changed
13. Stage all changes: `git add -A`
14. Write a conventional commit:
    - Format: `fix(<scope>): <description in imperative mood>`
    - Example: `fix(auth): show validation errors on login form submit`
    - Keep under 72 characters
15. Commit: `git commit -m "<message>"`

### Wrap-up
16. Use the `question` tool to ask: "Bug fixed on branch `<branch-name>`. Create a pull request?"
    - Options: "Yes, create PR now" / "No, I'll do it later"
17. If yes: run the `/pr` workflow (push + `gh pr create`)
18. Report: branch name, commit hash, root cause, what changed, how it was verified
