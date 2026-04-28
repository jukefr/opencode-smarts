---
name: smart-pr
description: Create a pull request from current branch with auto-generated title and description
license: MIT
compatibility: opencode
---

## Trigger
Load this skill when asked to create a PR, open a pull request, or run `/smart-pr`.

## Prerequisites
- Must be on a branch (not main/master/develop)
- Changes must be committed (if not, run the `smart-commit` skill first)

## Workflow

### 1. Check State
```bash
git status --short           # must be clean
git branch --show-current   # must not be main/master
```

If uncommitted changes exist, commit them first (use `smart-commit` skill).

### 2. Get Commit Summary
```bash
git log main...HEAD --oneline 2>/dev/null || git log master...HEAD --oneline
git diff main...HEAD --stat 2>/dev/null || git diff master...HEAD --stat
```

### 3. Push to Remote
```bash
git push -u origin $(git branch --show-current)
```

### 4. Generate PR Content
From the commit log and diff stat, generate:
- **Title**: `<type>: <short description>` (conventional commits style, <70 chars)
- **Summary**: Bullet points of what changed and why
- **Changes**: List of files with brief explanation of each change
- **Testing**: How this was tested (test commands from AGENTS.md)

### 5. Create PR
```bash
gh pr create \
  --title "<generated-title>" \
  --body "$(cat <<'EOF'
## Summary

- <bullet points>

## Changes

<file-by-file summary>

## Testing

- <test command> — passes
EOF
)"
```

### 6. Return URL
Output the PR URL from `gh pr create` output.

If `gh` CLI is unavailable, output the push command and PR template as text.
