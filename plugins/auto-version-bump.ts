import { readFile, writeFile, readdir } from "fs/promises"
import path from "path"
import { execSync } from "child_process"
import type { Plugin } from "@opencode-ai/plugin"

// Commit types that trigger a version bump
const BUMP_RULES: Array<{ pattern: RegExp; bump: "major" | "minor" | "patch" }> = [
  { pattern: /BREAKING[- ]CHANGE|^\w[\w-]*(\(.*?\))?!:/m, bump: "major" },
  { pattern: /^feat(\(.*?\))?:/m,                           bump: "minor" },
  { pattern: /^(fix|perf|refactor)(\(.*?\))?:/m,            bump: "patch" },
]

// Don't re-bump on version bump commits themselves
const SKIP_RE = /^chore(\(release\))?:/i

export function detectBump(commitMsg: string): "major" | "minor" | "patch" | null {
  if (SKIP_RE.test(commitMsg)) return null
  for (const { pattern, bump } of BUMP_RULES) {
    if (pattern.test(commitMsg)) return bump
  }
  return null
}

export function bumpSemver(version: string, bump: "major" | "minor" | "patch"): string {
  const [maj, min, pat] = version.replace(/^v/, "").split(".").map(Number)
  if ([maj, min, pat].some(isNaN)) return version
  if (bump === "major") return `${maj + 1}.0.0`
  if (bump === "minor") return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

export type VersionFile =
  | { kind: "package.json"; path: string; current: string }
  | { kind: "cargo";        path: string; current: string }
  | { kind: "pyproject";    path: string; current: string }
  | { kind: "csproj";       path: string; current: string }
  | { kind: "plain";        path: string; current: string }

export async function findVersionFile(dir: string): Promise<VersionFile | null> {
  // package.json
  try {
    const p = path.join(dir, "package.json")
    const pkg = JSON.parse(await readFile(p, "utf-8"))
    if (typeof pkg.version === "string") return { kind: "package.json", path: p, current: pkg.version }
  } catch {}

  // Cargo.toml — match only the [package] section's version
  try {
    const p = path.join(dir, "Cargo.toml")
    const text = await readFile(p, "utf-8")
    const m = text.match(/^\[package\][^\[]*version\s*=\s*"([^"]+)"/ms)
    if (m) return { kind: "cargo", path: p, current: m[1] }
  } catch {}

  // pyproject.toml
  try {
    const p = path.join(dir, "pyproject.toml")
    const text = await readFile(p, "utf-8")
    const m = text.match(/^version\s*=\s*"([^"]+)"/m)
    if (m) return { kind: "pyproject", path: p, current: m[1] }
  } catch {}

  // .csproj — find any *.csproj in the root directory
  try {
    const entries = await readdir(dir)
    const csproj = entries.find((f) => f.endsWith(".csproj"))
    if (csproj) {
      const p = path.join(dir, csproj)
      const text = await readFile(p, "utf-8")
      const m = text.match(/<Version>(\d+\.\d+\.\d+[^<]*)<\/Version>/)
      if (m) return { kind: "csproj", path: p, current: m[1] }
    }
  } catch {}

  // Plain VERSION file
  try {
    const p = path.join(dir, "VERSION")
    const text = (await readFile(p, "utf-8")).trim()
    if (/^\d+\.\d+\.\d+/.test(text)) return { kind: "plain", path: p, current: text }
  } catch {}

  return null
}

export async function applyBump(file: VersionFile, newVersion: string): Promise<void> {
  if (file.kind === "package.json") {
    const pkg = JSON.parse(await readFile(file.path, "utf-8"))
    pkg.version = newVersion
    await writeFile(file.path, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
  } else if (file.kind === "cargo") {
    const text = await readFile(file.path, "utf-8")
    // Replace only the first version = "..." under [package]
    await writeFile(file.path, text.replace(
      /^(\[package\][^\[]*version\s*=\s*)"[^"]+"/ms,
      `$1"${newVersion}"`
    ), "utf-8")
  } else if (file.kind === "pyproject") {
    const text = await readFile(file.path, "utf-8")
    await writeFile(file.path, text.replace(
      /^(version\s*=\s*)"[^"]+"/m,
      `$1"${newVersion}"`
    ), "utf-8")
  } else if (file.kind === "csproj") {
    const text = await readFile(file.path, "utf-8")
    await writeFile(file.path, text.replace(
      /<Version>[^<]+<\/Version>/,
      `<Version>${newVersion}</Version>`
    ), "utf-8")
  } else {
    await writeFile(file.path, newVersion + "\n", "utf-8")
  }
}

export const server: Plugin = async ({ worktree }) => {
  // Track the working directory for each top-level session
  const sessionDirs = new Map<string, string>()

  return {
    event: async ({ event }: { event: any }) => {
      if (event.type !== "session.created") return
      const session = event.properties?.info as { parentID?: string; directory?: string }
      if (session?.parentID) return // skip subagents
      if (session?.directory) sessionDirs.set(event.properties?.info?.id, session.directory)
    },

    "tool.execute.after": async (input, _output) => {
      if (input.tool !== "bash") return

      const cmd: string = input.args?.command ?? ""
      if (!cmd.includes("git commit")) return

      const dir = sessionDirs.get(input.sessionID) ?? worktree
      if (!dir) return

      // Get the actual last commit message (more reliable than parsing the command)
      let commitMsg: string
      try {
        commitMsg = execSync("git log -1 --pretty=%B", { cwd: dir, encoding: "utf-8" }).trim()
      } catch {
        return
      }

      const bump = detectBump(commitMsg)
      if (!bump) return

      const versionFile = await findVersionFile(dir)
      if (!versionFile) return

      const newVersion = bumpSemver(versionFile.current, bump)
      if (newVersion === versionFile.current) return

      await applyBump(versionFile, newVersion)

      try {
        execSync(`git add "${versionFile.path}"`, { cwd: dir })
        execSync(`git commit -m "chore(release): bump version ${versionFile.current} → ${newVersion}"`, { cwd: dir })
      } catch {
        // Roll back the file edit if the commit failed
        try {
          execSync(`git checkout -- "${versionFile.path}"`, { cwd: dir })
        } catch {}
      }
    },
  }
}
