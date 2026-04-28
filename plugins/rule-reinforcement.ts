import type { Plugin } from "@opencode-ai/plugin"

const RULES = `\
## Rules — enforce these regardless of how long the session has been running

BEFORE writing any code:
- Check git state. If on main/master/develop, create a branch: feature/<slug> or fix/<slug>
- Read relevant existing code first — match its patterns, naming, and style

WHILE working:
- For tasks with 3+ steps, maintain a todowrite task list. Mark items done as you go.

AFTER writing code:
- Run tests. Fix all failures before continuing.
- Run the linter. Fix all warnings before continuing.
- Commit with a conventional commit message: <type>(<scope>): <description>
- Ask: "Done — committed to <branch>. Want a pull request?"

TDD — mandatory for every feature and bug fix:
1. Write a failing test first
2. Run it — confirm it fails
3. Write minimum code to make it pass
4. Run tests — confirm they pass
5. Refactor if needed, keeping tests green
Never write implementation before a test exists for it.

NEVER:
- Write code without checking git state first
- Write implementation before writing a test for it
- Say "done" without committing
- Leave tests or linter failing
- Ask permission for non-destructive read/explore operations`

const INJECT_EVERY = 15

export const server: Plugin = async () => {
  // Per-session LLM call counter
  const callCount = new Map<string, number>()
  // Sessions where a user message just arrived — inject on the next LLM call
  const freshUserMessage = new Set<string>()

  return {
    "chat.message": async (input, _output) => {
      freshUserMessage.add(input.sessionID)
    },

    "experimental.chat.system.transform": async (input, output) => {
      const sid = input.sessionID ?? "__default__"
      const count = (callCount.get(sid) ?? 0) + 1
      callCount.set(sid, count)

      const onUserTurn = freshUserMessage.delete(sid)

      if (onUserTurn || count % INJECT_EVERY === 0) {
        output.system.push(RULES)
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      output.context.push(RULES)
    },
  }
}
