---
description: Create a pull request for the current branch with auto-generated description
agent: build
---

Create a pull request for the current branch.

Steps:
1. Check for uncommitted changes: `git status --short`
2. If uncommitted changes exist, stage and commit them:
   - `git diff HEAD` to review changes
   - Generate a conventional commit message (feat/fix/refactor/docs/test/chore)
   - `git add -A && git commit -m "<type>: <description>"`
3. Get the current branch: `git branch --show-current`
4. Get commits vs base: `git log main...HEAD --oneline 2>/dev/null || git log master...HEAD --oneline`
5. Push to remote: `git push -u origin $(git branch --show-current)`
6. Create PR:
```bash
gh pr create --title "<type>: <short description>" --body "$(cat <<'EOF'
## Summary

- <bullet point summary of changes>

## Changes

<list of modified files with what changed in each>

## Testing

- <how this was tested>
- <test commands that pass>
EOF
)"
```
7. Return the PR URL

If `gh` is not available, output the git push command and a PR template to fill in manually.
