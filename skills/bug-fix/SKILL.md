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

### Step 3 — Reproduce
- If tests exist for this area, run them: look for failing tests related to the bug
- If no tests, read the code path from trigger to failure point
- Trace the execution mentally to confirm you understand the failure

### Step 4 — Find the Root Cause
Do not fix the symptom. Find why it's happening:
- Trace the call stack
- Check: null/undefined not handled, wrong condition, off-by-one, async timing, wrong assumption about data shape
- Use `grep` to find all callers of the failing function — is the problem in the caller or callee?

### Step 5 — Fix
Make the minimal correct change:
- Fix the root cause, not the symptom
- Don't refactor while fixing (that's a separate PR)
- If the bug exposed a design flaw, fix the bug now and note the design issue for later

### Step 6 — Add a Test
If no test would have caught this bug, add one. The test should:
- Reproduce the exact failure scenario
- Pass after your fix
- Live next to the relevant source code

### Step 7 — Verify
1. Run the specific test for the fixed area
2. Run the full test suite — confirm no regressions
3. Run the linter

### Done Criteria
- Root cause identified and documented (not just symptom fixed)
- Test added that would have caught this
- Full test suite passes
- Linter clean
