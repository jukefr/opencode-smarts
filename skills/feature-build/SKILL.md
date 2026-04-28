---
name: feature-build
description: Full autonomous feature build workflow — explore, plan, implement, test, lint, review
license: MIT
compatibility: opencode
---

## Feature Build Workflow

Use this skill when implementing a new feature. Follow all phases; skip none.

### Phase 1 — Understand the Project
Read `AGENTS.md` in the project root. Extract:
- Test command (you will run this in Phase 4)
- Lint command (you will run this in Phase 5)
- Coding conventions to follow

### Phase 2 — Track with Todowrite
Create a todowrite list upfront:
- [ ] Phase 1: Read AGENTS.md
- [ ] Phase 2: Explore codebase
- [ ] Phase 3: Plan implementation
- [ ] Phase 4: Implement
- [ ] Phase 5: Run tests (fix failures)
- [ ] Phase 6: Run linter (fix warnings)
- [ ] Phase 7: Final review
- [ ] Phase 8: Report

### Phase 3 — Explore
Before writing a single line of code:
1. Use `glob` to find files in the relevant domain (e.g. `src/**/*auth*`, `**/*.route.ts`)
2. Use `grep` to find similar existing implementations
3. Read 2-3 representative files to understand:
   - Naming conventions
   - File structure patterns
   - Error handling style
   - Import conventions

For complex features (>5 files affected), spawn `@explorer` subagent with the feature description and get a full architecture map back.

### Phase 4 — Plan
For non-trivial features, spawn `@planner` subagent with:
- The feature description
- Files found in Phase 3
- Request a concrete implementation plan (files to change, order, interfaces)

**Confirm the plan** with the user before proceeding to implementation.

### Phase 5 — Implement
- Follow the patterns found in Phase 3 exactly
- Match the naming conventions of adjacent code
- Implement one logical unit at a time
- Read each file before editing it

### Phase 6 — Test
Run the test command from AGENTS.md.

For each failing test:
1. Read the test file to understand what it asserts
2. Read the relevant implementation
3. Fix the root cause (not the symptom)
4. Re-run tests

Keep fixing until all tests pass. If tests were already failing before your changes, note them as pre-existing and don't count them as your failures.

### Phase 7 — Lint
Run the lint/typecheck command from AGENTS.md. Fix every warning and error.

### Phase 8 — Review
Spawn `@reviewer` subagent on the changed files. Fix every Critical finding. Use your judgment on Warnings.

### Phase 9 — Report
Summarize:
- What was built (1-2 sentences)
- Files changed (list)
- Tests added or modified
- Any known limitations or follow-up needed

### Done Criteria
The feature is complete when:
- todowrite: 100% checked off
- Tests: all pass
- Linter: zero errors or warnings
- Review: no Critical findings
