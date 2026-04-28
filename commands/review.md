---
description: Review current branch changes for quality, security, and correctness
agent: reviewer
subtask: true
---

Review all changes on the current branch.

Steps:
1. Run `git diff main...HEAD 2>/dev/null || git diff master...HEAD` to see all branch changes
2. If no branch diff, run `git diff HEAD` to see uncommitted changes
3. Review all changes for:
   - Correctness (logic errors, edge cases, error handling)
   - Security (input validation, auth checks, secrets in code)
   - Quality (follows project conventions from AGENTS.md, clear naming, no dead code)
   - Test coverage (new logic has tests, tests cover failure cases)
4. Return a structured report:

**Critical** (must fix): issues that will cause bugs or security problems
**Warning** (should fix): quality or maintainability issues
**Suggestion** (optional): style and clarity improvements

End with: **Approve** / **Approve with fixes** / **Request changes**
