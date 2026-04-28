---
name: smart-pr
description: Create a pull request from current changes with auto-generated description
license: MIT
compatibility: opencode
---

## Trigger
`/smart-pr` - Create a pull request from current changes with auto-generated description.

## Prerequisite
- Current branch must not be `main`/`master`/`develop`
- Changes must be committed (or will trigger `/smart-commit` first)

## Workflow
1. Run `/smart-commit` if no staged/unstaged changes are present
2. Run `bash` tool to push to remote:
   - `git push -u origin $(git branch --show-current)`
3. Run `bash` to create PR via `gh` CLI:
   - `gh pr create --title "<conventional-title>" --body "$(cat <<'EOF'
## Summary
- [Auto-generated list of changes from git log]
## Test Plan
- [Run project test command from AGENTS.md]
EOF
)"`
4. Call `engram_mem_save` with PR details (type: `manual`, topic_key: `git/prs`)
5. Return PR URL to user
