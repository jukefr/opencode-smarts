---
name: smart-commit
description: Automatically generate and create conventional commits from staged/unstaged changes
license: MIT
compatibility: opencode
---

## Trigger
`/smart-commit` - Automatically generate and create a conventional commit from staged/unstaged changes.

## Workflow
1. Run `bash` tool to get context:
   - `git status` (staged/unstaged files)
   - `git diff HEAD` (full changes)
   - `git log --oneline -5` (recent commit style)
2. Analyze changes to determine commit type:
   - `feat` (new features)
   - `fix` (bug fixes)
   - `refactor` (code changes)
   - `docs` (documentation)
   - `test` (testing)
3. Generate conventional commit message:
   - Format: `<type>(scope): <description>`
   - Keep under 72 characters
4. Run `bash` to stage all changes and commit:
   - `git add . && git commit -m "<generated-message>"`
5. Call `engram_mem_save` with commit details (type: `manual`, topic_key: `git/commits`)
