---
name: code-review
description: Run full code review with parallel agents and validation
license: MIT
compatibility: opencode
---

## Trigger
`/code-review` - Run full code review with parallel agents and validation.

## Workflow
1. Use `todo` tool to list review steps
2. Launch 4 parallel `task` tool calls with `plan` subagent:
   - Reviewer 1: Coding standards compliance (check AGENTS.md)
   - Reviewer 2: Bug/security detection
   - Reviewer 3: Test coverage gaps
   - Reviewer 4: Performance/edge cases
3. For each issue found, launch `task` with `explore` subagent to validate (confidence < 0.7 = discard)
4. Compile final report:
   - Critical Issues (confidence > 0.8)
   - Warnings (0.5-0.8)
   - Suggestions (<0.5)
5. Call `engram_mem_save` with review patterns (type: `pattern`, topic_key: `code-review/latest`)
6. Return formatted report to user
