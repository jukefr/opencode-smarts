---
description: Build a feature end-to-end — explores, plans, implements, tests, and verifies
agent: build
---

Build the following feature completely. Do not report done until it is implemented, tested, and the linter is clean.

Feature: $ARGUMENTS

## Steps (use todowrite to track):
1. Read AGENTS.md — find test command, lint command, conventions
2. Explore the codebase to understand where and how to implement this (spawn @explorer or use grep/glob)
3. For non-trivial features: spawn @planner to design the approach, then confirm before implementing
4. Implement the feature following existing patterns exactly
5. Run tests — fix every failure
6. Run linter — fix every warning
7. Spawn @reviewer on the changed files — fix any Critical findings
8. Report: what was built, which files changed, what tests were added or modified

The feature is complete when: todowrite is 100% checked off, tests pass, linter is clean.
