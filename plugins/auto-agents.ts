import { readFile, writeFile, access } from "fs/promises"
import path from "path"

export default {
  id: "auto-agents",
  server: async ({ worktree }: { worktree: string }) => {
    return {
      event: async ({ event }: { event: any }) => {
        // Only handle session.created events
        if (event.type !== "session.created") return

        // Get session info from event properties
        const session = event.properties?.info as { parentID?: string }
        
        // Only run for top-level sessions, not subagents
        if (session?.parentID) return
        
        await syncAgentsMd(worktree)
      },
    }
  },
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function exists(p: string) {
  try { await access(p); return true } catch { return false }
}

async function readText(p: string) {
  try { return await readFile(p, "utf-8") } catch { return "" }
}

async function readJson(p: string) {
  try { return JSON.parse(await readFile(p, "utf-8")) } catch { return null }
}

// ─── main ───────────────────────────────────────────────────────────────────

async function syncAgentsMd(worktree: string) {
  if (!worktree) return

  const agentsMdPath = path.join(worktree, "AGENTS.md")
  const existing = await readText(agentsMdPath)

  // Leave it alone if it's already been customised (no placeholder markers left)
  const isGenerated = existing === "" ||
    existing.includes("<!-- opencode-smarts:auto -->") ||
    existing.includes("[Replace with") ||
    existing.includes("[Add key") ||
    existing.includes("[Add project-specific")

  if (!isGenerated) return

  const info = await detectProject(worktree)
  if (!info.hasAnything) return

  await writeFile(agentsMdPath, renderAgentsMd(info), "utf-8")
}

// ─── detection ──────────────────────────────────────────────────────────────

interface ProjectInfo {
  hasAnything: boolean
  name: string
  stack: string[]
  commands: { dev: string; build: string; test: string; lint: string; typecheck: string }
}

async function detectProject(worktree: string): Promise<ProjectInfo> {
  const info: ProjectInfo = {
    hasAnything: false,
    name: path.basename(worktree),
    stack: [],
    commands: { dev: "", build: "", test: "", lint: "", typecheck: "" },
  }

  await detectNode(worktree, info)
  await detectRust(worktree, info)
  await detectGo(worktree, info)
  await detectPython(worktree, info)
  await detectMakefile(worktree, info)

  info.stack = [...new Set(info.stack)]
  return info
}

async function detectNode(worktree: string, info: ProjectInfo) {
  const pkg = await readJson(path.join(worktree, "package.json"))
  if (!pkg) return

  info.hasAnything = true
  if (pkg.name) info.name = pkg.name

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const has = (d: string) => d in deps

  if (has("typescript"))      info.stack.push("TypeScript")
  else                        info.stack.push("JavaScript")
  if (has("react"))           info.stack.push("React")
  if (has("next"))            info.stack.push("Next.js")
  if (has("vue"))             info.stack.push("Vue")
  if (has("svelte"))          info.stack.push("Svelte")
  if (has("astro"))            info.stack.push("Astro")
  if (has("solid-js"))        info.stack.push("SolidJS")
  if (has("hono"))            info.stack.push("Hono")
  if (has("express"))         info.stack.push("Express")
  if (has("fastify"))         info.stack.push("Fastify")
  if (has("@nestjs/core"))    info.stack.push("NestJS")
  if (has("prisma") || has("@prisma/client")) info.stack.push("Prisma")
  if (has("drizzle-orm"))     info.stack.push("Drizzle ORM")
  if (has("vitest"))          info.stack.push("Vitest")
  else if (has("jest"))       info.stack.push("Jest")
  if (has("tailwindcss"))     info.stack.push("Tailwind CSS")
}

async function detectRust(worktree: string, info: ProjectInfo) {
  if (!await exists(path.join(worktree, "Cargo.toml"))) return

  info.hasAnything = true
  info.stack.push("Rust")
}

async function detectGo(worktree: string, info: ProjectInfo) {
  if (!await exists(path.join(worktree, "go.mod"))) return

  info.hasAnything = true
  info.stack.push("Go")
}

async function detectPython(worktree: string, info: ProjectInfo) {
  const hasPyproject = await exists(path.join(worktree, "pyproject.toml"))
  const hasSetupPy   = await exists(path.join(worktree, "setup.py"))
  const hasReqs      = await exists(path.join(worktree, "requirements.txt"))

  if (!hasPyproject && !hasSetupPy && !hasReqs) return

  info.hasAnything = true
  info.stack.push("Python")
}

async function detectMakefile(worktree: string, info: ProjectInfo) {
  const content = await readText(path.join(worktree, "Makefile"))
  if (!content) return

  info.hasAnything = true
}

// ─── render ─────────────────────────────────────────────────────────────────

function renderAgentsMd(info: ProjectInfo) {
  const { commands: c } = info

  const cmdsBlock = [
    c.dev        && `# Dev server\n${c.dev}`,
    c.build      && `# Build\n${c.build}`,
    c.test       && `# Test\n${c.test}`,
    c.lint       && `# Lint\n${c.lint}`,
    c.typecheck  && `# Typecheck\n${c.typecheck}`,
  ].filter(Boolean).join("\n\n")

  return `<!-- opencode-smarts:auto -->
# Project Rules

## Project Overview
- **Name**: ${info.name}
- **Stack**: ${info.stack.join(", ") || "Unknown"}

## Commands
\`\`\`bash
${cmdsBlock || "# No commands auto-detected — add them here"}
\`\`\`

Always run lint and tests before considering a task complete.

## Architecture
[Add key directories and their purpose here]

## Conventions
[Add project-specific coding conventions here]
`
}
