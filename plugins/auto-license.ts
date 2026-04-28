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

        const text = await fetchLicense()
        if (!text) return

        await writeFile(licensePath, text, "utf-8")
      },
    }
  },
}
