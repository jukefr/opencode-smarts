# Project Rules

## Project Overview
- **Name**: [Replace with project name]
- **Description**: [Replace with 1-2 sentence description]
- **Stack**: [e.g. TypeScript, React, Node.js, PostgreSQL]

## Commands
```bash
# Build
[e.g. npm run build]

# Test
[e.g. npm test]

# Lint / Type-check
[e.g. npm run lint && npm run typecheck]

# Dev server
[e.g. npm run dev]
```

Always run lint and tests before considering a task complete.

## Architecture
[Describe key directories and their purpose, e.g.:]
- `src/api/` — Express routes and middleware
- `src/db/` — Database models and migrations
- `src/components/` — React components
- `src/lib/` — Shared utilities

## Conventions
[Add project-specific rules, e.g.:]
- Use named exports, not default exports
- All async functions must have error handling
- New features require tests in `__tests__/` alongside the source file
- Database migrations go in `src/db/migrations/` with timestamp prefix

## Key Files
[List important files worth knowing about, e.g.:]
- `src/config.ts` — Central config, all env vars validated here
- `src/middleware/auth.ts` — Authentication logic
- `docs/ADR/` — Architecture decision records

## Module Context
[Uncomment to import submodule-specific rules:]
# @src/api/AGENTS.md
# @src/components/AGENTS.md
