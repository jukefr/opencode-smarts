---
name: bug-fix
description: Systematic bug fixing — reproduce, find root cause, fix, verify
license: MIT
compatibility: opencode
---

## Bug Fix Workflow

### Step 1 — Understand the Bug
Read the bug report carefully. Identify:
- What behavior is expected vs. what actually happens
- The code path most likely involved

### Step 2 — Find the Code
Use `grep` and `glob` to locate the relevant code. Search for:
- Function or class names mentioned in the error
- The error message itself
- File names or module paths from stack traces

### Step 3 — Find the Root Cause
Do not fix the symptom. Find why it's happening:
- Trace the call stack
- Check: null/undefined not handled, wrong condition, off-by-one, async timing, wrong assumption about data shape
- Use `grep` to find all callers of the failing function — is the problem in the caller or callee?

### Step 4 — Write a Failing Test
Before touching any implementation:
- Write a test that reproduces the exact failure scenario
- Run it and confirm it **fails** — this proves the test is real
- If tests for this area already exist and one is failing, use that as your red test

### Step 5 — Fix
Make the minimal correct change:
- Fix the root cause, not the symptom
- Don't refactor while fixing (that's a separate PR)
- If the bug exposed a design flaw, fix the bug now and note the design issue for later

### Step 6 — Verify
1. Run the reproducing test — confirm it now passes
2. Run the full test suite — confirm no regressions
3. Run the linter

### Done Criteria
- Root cause identified (not just symptom fixed)
- Failing test written before the fix
- Test passes after the fix
- Full test suite passes
- Linter clean
