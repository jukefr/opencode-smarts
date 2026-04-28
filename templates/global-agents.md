# Global OpenCode Rules
## Session Start Protocol
At the start of every session, run these tools **before responding to the user's first prompt**:
1. `engram_mem_context` to load recent cross-session memories
2. `engram_mem_search` with keywords from the user's initial prompt to load relevant past context

## Project Context
Import project-specific rules (auto-loaded by OpenCode when present):
`@AGENTS.md`

## General Workflow Rules
- Always use the `todo` tool to track multi-step tasks (3+ discrete steps)
- Prefer built-in tools (`task` for subagents, `grep`/`glob` for search) over manual bash commands
- For git commits, follow Conventional Commits format
- Run project linters/tests before committing changes (check project AGENTS.md for exact commands)

## Memory Rules
- Call `engram_mem_save` immediately after:
  - Bug fixes
  - Architecture/design decisions
  - Non-obvious codebase discoveries
  - Config/environment changes
  - New patterns or conventions
- Call `engram_mem_session_summary` before ending any session
