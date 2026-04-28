---
description: Fix a bug completely — diagnoses root cause, implements fix, and verifies
agent: build
---

Fix the following bug completely. Do not stop until the fix is verified to work.

Bug: $ARGUMENTS

## Steps:
1. Understand the bug — find the relevant code with grep/glob/lsp, read it
2. Reproduce the failure — run the relevant test or trace the code path mentally
3. Identify the root cause (not just the symptom)
4. Fix the root cause with the minimal correct change
5. Run the full test suite — fix any regressions
6. Run the linter
7. Report: what was wrong, what changed, how the fix was verified

Do not mask errors with try/catch. Do not fix the symptom and leave the root cause. If tests were failing before, note which ones were pre-existing.
