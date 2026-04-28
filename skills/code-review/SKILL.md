---
name: code-review
description: Full code review with parallel analysis across correctness, security, quality, and test coverage
license: MIT
compatibility: opencode
---

## Trigger
Load this skill when asked to review code, do a code review, or run `/code-review`.

## Workflow

### 1. Get the Diff
```bash
# Branch changes vs main
git diff main...HEAD 2>/dev/null || git diff master...HEAD

# Or uncommitted changes
git diff HEAD
```

### 2. Launch Parallel Review
Spawn 3-4 parallel `@explore` or `@reviewer` subagents, each focused on one lens:

**Reviewer A — Correctness**
- Logic errors, wrong conditions, off-by-one
- Null/undefined not handled
- Error paths silently swallowed
- Async bugs (missing await, race conditions)

**Reviewer B — Security**
- User input validated before use
- No secrets in code or logs
- SQL injection, XSS, path traversal risks
- Auth checks on all protected operations

**Reviewer C — Quality**
- Follows project conventions (check AGENTS.md)
- Clear naming, no dead code
- Functions focused (single responsibility)
- No unnecessary complexity

**Reviewer D — Tests**
- New logic has test coverage
- Tests cover failure cases
- Tests are meaningful (not just happy path)

### 3. Validate Findings
For each finding with confidence < 0.7, read the relevant code yourself to confirm before including it.

### 4. Compile Report
```
## Code Review

### Critical (must fix)
- file:line — description — impact

### Warning (should fix)  
- file:line — description — risk

### Suggestion (optional)
- file:line — description — improvement

### Verdict
**Approve** / **Approve with fixes** / **Request changes**
```
