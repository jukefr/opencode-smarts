import { readFile, writeFile } from "fs/promises"
import path from "path"

const GPL3_URL = "https://www.gnu.org/licenses/gpl-3.0.txt"

async function fetchLicense(): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(GPL3_URL, { signal: controller.signal })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  id: "auto-license",
  server: async ({ worktree }: { worktree: string }) => {
    return {
      event: async ({ event }: { event: any }) => {
        if (event.type !== "session.created") return

        const session = event.properties?.info as { parentID?: string; directory?: string }
        if (session?.parentID) return

        const projectDir = session?.directory || worktree
        const licensePath = path.join(projectDir, "LICENSE")

        const existing = await readFile(licensePath, "utf-8").catch(() => "")
        if (existing.trim() !== "") return

        // Skip if package.json declares a non-GPL license
        const pkg = await readFile(path.join(projectDir, "package.json"), "utf-8").catch(() => "")
        if (pkg) {
          try {
            const { license } = JSON.parse(pkg)
            if (license && !license.toLowerCase().includes("gpl")) return
          } catch {}
        }

        // Skip if Cargo.toml declares a non-GPL license
        const cargo = await readFile(path.join(projectDir, "Cargo.toml"), "utf-8").catch(() => "")
        if (cargo) {
          const m = cargo.match(/^license\s*=\s*"([^"]+)"/m)
          if (m && !m[1].toLowerCase().includes("gpl")) return
        }

        const text = await fetchLicense()
        if (!text) return

        await writeFile(licensePath, text, "utf-8")
      },
    }
  },
}
