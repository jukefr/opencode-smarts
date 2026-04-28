import { readFile, writeFile, access } from "fs/promises"
import path from "path"

const GRAPHIFY_START = "<!-- graphify:start -->"
const GRAPHIFY_END = "<!-- graphify:end -->"

function graphifySection(): string {
  return `## Graphify Knowledge Graph

This project has a knowledge graph at \`graphify-out/\`.

- Before answering architecture or codebase questions, read \`graphify-out/GRAPH_REPORT.md\` for god nodes and community structure
- If \`graphify-out/wiki/index.md\` exists, navigate it instead of reading raw files
- For cross-module questions prefer \`graphify query "<question>"\`, \`graphify path "<A>" "<B>"\`, or \`graphify explain "<concept>"\` over grep — these traverse EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files run \`graphify update .\` to keep the graph current (AST-only, no API cost)`
}

export default {
  id: "auto-agents",
  server: async ({ worktree }: { worktree: string }) => {
    return {
      event: async ({ event }: { event: any }) => {
        // Only handle session.created events
        if (event.type !== "session.created") return;

        // Get session info from event properties
        const session = event.properties?.info as { parentID?: string; directory?: string }

        // Only run for top-level sessions, not subagents
        if (session?.parentID) return;

        // Use directory from session event (correct), fallback to worktree
        const projectDir = session?.directory || worktree
        await syncAgentsMd(projectDir)
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
  const hasGraphify = await exists(path.join(worktree, "graphify-out", "GRAPH_REPORT.md"))

  const isGenerated = existing === "" ||
    existing.includes("<!-- opencode-smarts:auto -->") ||
    existing.includes("[Replace with") ||
    existing.includes("[Add key") ||
    existing.includes("[Add project-specific")

  if (isGenerated) {
    const info = await detectProject(worktree)
    await writeFile(agentsMdPath, renderAgentsMd(info, hasGraphify), "utf-8")
  } else if (hasGraphify) {
    // File has been customised — upsert just the graphify block without touching the rest
    await upsertGraphifySection(agentsMdPath, existing)
  }
}

async function upsertGraphifySection(agentsMdPath: string, content: string) {
  const block = `${GRAPHIFY_START}\n${graphifySection()}\n${GRAPHIFY_END}`
  let updated: string
  if (content.includes(GRAPHIFY_START)) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    updated = content.replace(
      new RegExp(`${esc(GRAPHIFY_START)}[\\s\\S]*?${esc(GRAPHIFY_END)}`),
      block
    )
  } else {
    const sep = content.endsWith("\n") ? "" : "\n"
    updated = `${content}${sep}\n${block}\n`
  }
  await writeFile(agentsMdPath, updated, "utf-8")
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
  await detectCSharp(worktree, info)
  await detectMakefile(worktree, info)

  info.stack = [...new Set(info.stack)]
  return info
}

async function detectNode(worktree: string, info: ProjectInfo) {
  const pkg = await readJson(path.join(worktree, "package.json"))
  if (!pkg) return

  info.hasAnything = true
  if (pkg.name) info.name = pkg.name

  // Detect package manager from lock files
  const hasBunLock = await exists(path.join(worktree, "bun.lockb")) || await exists(path.join(worktree, "bun.lock"))
  const hasPnpm    = await exists(path.join(worktree, "pnpm-lock.yaml"))
  const hasYarn    = await exists(path.join(worktree, "yarn.lock"))
  const pm = hasBunLock ? "bun" : hasPnpm ? "pnpm" : hasYarn ? "yarn" : "npm"

  // Map scripts to commands
  const scripts = pkg.scripts ?? {}
  const run = (name: string) => scripts[name] ? `${pm} run ${name}` : ""

  info.commands.dev      = run("dev") || run("start") || run("serve")
  info.commands.build    = run("build")
  info.commands.lint     = run("lint")
  info.commands.typecheck = run("typecheck") || run("type-check") || run("tsc")
  // bun has a built-in test runner; prefer explicit script if defined
  info.commands.test = scripts.test
    ? `${pm} run test`
    : pm === "bun" ? "bun test" : ""

  // Stack detection
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const has = (d: string) => d in deps

  if (has("typescript"))      info.stack.push("TypeScript")
  else                        info.stack.push("JavaScript")
  if (has("react"))           info.stack.push("React")
  if (has("next"))            info.stack.push("Next.js")
  if (has("vue"))             info.stack.push("Vue")
  if (has("svelte"))          info.stack.push("Svelte")
  if (has("astro"))           info.stack.push("Astro")
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
  info.commands.build = "cargo build"
  info.commands.test  = "cargo test"
  info.commands.lint  = "cargo clippy"
}

async function detectGo(worktree: string, info: ProjectInfo) {
  if (!await exists(path.join(worktree, "go.mod"))) return

  info.hasAnything = true
  info.stack.push("Go")
  info.commands.build = "go build ./..."
  info.commands.test  = "go test ./..."
  info.commands.lint  = "golangci-lint run"
}

async function detectPython(worktree: string, info: ProjectInfo) {
  const hasPyproject = await exists(path.join(worktree, "pyproject.toml"))
  const hasSetupPy   = await exists(path.join(worktree, "setup.py"))
  const hasReqs      = await exists(path.join(worktree, "requirements.txt"))

  if (!hasPyproject && !hasSetupPy && !hasReqs) return

  info.hasAnything = true
  info.stack.push("Python")

  const pyproject = hasPyproject ? await readText(path.join(worktree, "pyproject.toml")) : ""
  const hasUv     = await exists(path.join(worktree, "uv.lock")) || pyproject.includes("[tool.uv]")
  const hasPoetry = pyproject.includes("[tool.poetry]")
  const prefix    = hasUv ? "uv run " : hasPoetry ? "poetry run " : ""

  const hasRuff   = pyproject.includes("[tool.ruff]") || pyproject.includes("ruff")
  const hasMypy   = pyproject.includes("[tool.mypy]") || pyproject.includes("mypy")

  info.commands.test     = `${prefix}pytest`
  info.commands.lint     = hasRuff ? `${prefix}ruff check .` : ""
  info.commands.typecheck = hasMypy ? `${prefix}mypy .` : ""
}

async function detectCSharp(worktree: string, info: ProjectInfo) {
  const { readdir } = await import("fs/promises")
  const files = await readdir(worktree).catch(() => [] as string[])
  const csproj = files.find(f => f.endsWith(".csproj"))
  const hasSln  = files.some(f => f.endsWith(".sln"))

  if (!csproj && !hasSln) return

  info.hasAnything = true
  info.stack.push("C#")

  if (csproj) {
    const content = await readText(path.join(worktree, csproj))
    const has = (s: string) => content.includes(s)
    if (has("Microsoft.AspNetCore"))          info.stack.push("ASP.NET Core")
    if (has("Microsoft.EntityFrameworkCore")) info.stack.push("Entity Framework Core")
    if (has("Microsoft.AspNetCore.Components")) info.stack.push("Blazor")
    if (has("Microsoft.Maui"))               info.stack.push("MAUI")
  }

  info.commands.build = "dotnet build"
  info.commands.test  = "dotnet test"
  info.commands.lint  = "dotnet format --verify-no-changes"
  info.commands.dev   = "dotnet run"
}

async function detectMakefile(worktree: string, info: ProjectInfo) {
  const content = await readText(path.join(worktree, "Makefile"))
  if (!content) return

  info.hasAnything = true
  const hasTarget = (t: string) => new RegExp(`^${t}\\s*:`, "m").test(content)
  // Only fill gaps not already covered by a language-specific detector
  if (!info.commands.dev   && hasTarget("dev"))   info.commands.dev   = "make dev"
  if (!info.commands.build && hasTarget("build")) info.commands.build = "make build"
  if (!info.commands.test  && hasTarget("test"))  info.commands.test  = "make test"
  if (!info.commands.lint  && hasTarget("lint"))  info.commands.lint  = "make lint"
}

// ─── render ─────────────────────────────────────────────────────────────────

function renderAgentsMd(info: ProjectInfo, hasGraphify = false) {
  const { commands: c } = info

  const cmdsBlock = [
    c.dev        && `# Dev server\n${c.dev}`,
    c.build      && `# Build\n${c.build}`,
    c.test       && `# Test\n${c.test}`,
    c.lint       && `# Lint\n${c.lint}`,
    c.typecheck  && `# Typecheck\n${c.typecheck}`,
  ].filter(Boolean).join("\n\n")

  const graphifyBlock = hasGraphify
    ? `\n${GRAPHIFY_START}\n${graphifySection()}\n${GRAPHIFY_END}\n`
    : ""

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
${graphifyBlock}`
}
