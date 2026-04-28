import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtemp, writeFile, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import path from "path"
import { detectBump, bumpSemver, findVersionFile, applyBump } from "./auto-version-bump"

// ─── detectBump ──────────────────────────────────────────────────────────────

describe("detectBump", () => {
  describe("minor — feat", () => {
    test("simple feat", () => expect(detectBump("feat: add login")).toBe("minor"))
    test("feat with scope", () => expect(detectBump("feat(auth): add OAuth")).toBe("minor"))
    test("feat multiline", () => expect(detectBump("feat: add thing\n\nBody text")).toBe("minor"))
  })

  describe("patch — fix / perf / refactor", () => {
    test("fix", () => expect(detectBump("fix: null pointer crash")).toBe("patch"))
    test("fix with scope", () => expect(detectBump("fix(parser): handle empty input")).toBe("patch"))
    test("perf", () => expect(detectBump("perf: cache DB queries")).toBe("patch"))
    test("refactor", () => expect(detectBump("refactor: extract helper")).toBe("patch"))
  })

  describe("major — breaking change", () => {
    test("BREAKING CHANGE in body", () =>
      expect(detectBump("feat: rename API\n\nBREAKING CHANGE: /v1 removed")).toBe("major"))
    test("BREAKING-CHANGE with hyphen", () =>
      expect(detectBump("feat: rename\n\nBREAKING-CHANGE: old routes gone")).toBe("major"))
    test("bang on feat", () => expect(detectBump("feat!: drop Node 16")).toBe("major"))
    test("bang with scope", () => expect(detectBump("feat(api)!: new auth flow")).toBe("major"))
    test("bang on fix", () => expect(detectBump("fix!: remove deprecated param")).toBe("major"))
  })

  describe("no bump", () => {
    test("chore", () => expect(detectBump("chore: update deps")).toBeNull())
    test("docs", () => expect(detectBump("docs: fix typo")).toBeNull())
    test("test", () => expect(detectBump("test: add coverage")).toBeNull())
    test("ci", () => expect(detectBump("ci: add github action")).toBeNull())
    test("chore(release) skipped", () =>
      expect(detectBump("chore(release): bump version 1.0.0 → 1.1.0")).toBeNull())
    test("chore: bump skipped", () =>
      expect(detectBump("chore: bump version")).toBeNull())
    test("plain message", () => expect(detectBump("update stuff")).toBeNull())
  })
})

// ─── bumpSemver ──────────────────────────────────────────────────────────────

describe("bumpSemver", () => {
  test("patch bump", () => expect(bumpSemver("1.2.3", "patch")).toBe("1.2.4"))
  test("minor bump resets patch", () => expect(bumpSemver("1.2.3", "minor")).toBe("1.3.0"))
  test("major bump resets minor and patch", () => expect(bumpSemver("1.2.3", "major")).toBe("2.0.0"))
  test("v-prefix stripped", () => expect(bumpSemver("v1.2.3", "patch")).toBe("1.2.4"))
  test("zeros", () => expect(bumpSemver("0.0.1", "patch")).toBe("0.0.2"))
  test("double-digit", () => expect(bumpSemver("1.9.9", "minor")).toBe("1.10.0"))
  test("invalid version returned as-is", () => expect(bumpSemver("not-a-version", "patch")).toBe("not-a-version"))
})

// ─── findVersionFile + applyBump ─────────────────────────────────────────────

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "avb-test-"))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

async function write(file: string, content: string) {
  await writeFile(path.join(tmpDir, file), content, "utf-8")
}

async function read(file: string) {
  return readFile(path.join(tmpDir, file), "utf-8")
}

describe("findVersionFile", () => {
  test("finds package.json version", async () => {
    await write("package.json", JSON.stringify({ name: "my-pkg", version: "1.2.3" }))
    const result = await findVersionFile(tmpDir)
    expect(result).toMatchObject({ kind: "package.json", current: "1.2.3" })
  })

  test("ignores package.json without version field", async () => {
    await write("package.json", JSON.stringify({ name: "my-pkg" }))
    const result = await findVersionFile(tmpDir)
    expect(result).toBeNull()
  })

  test("finds Cargo.toml version", async () => {
    await write("Cargo.toml", `[package]\nname = "mylib"\nversion = "0.5.1"\n`)
    const result = await findVersionFile(tmpDir)
    expect(result).toMatchObject({ kind: "cargo", current: "0.5.1" })
  })

  test("ignores Cargo.toml dependency version", async () => {
    await write("Cargo.toml", `[package]\nname = "mylib"\nversion = "0.5.1"\n\n[dependencies]\nserde = { version = "1.0" }\n`)
    const result = await findVersionFile(tmpDir)
    expect(result).toMatchObject({ kind: "cargo", current: "0.5.1" })
  })

  test("finds pyproject.toml version", async () => {
    await write("pyproject.toml", `[project]\nname = "myapp"\nversion = "2.0.0"\n`)
    const result = await findVersionFile(tmpDir)
    expect(result).toMatchObject({ kind: "pyproject", current: "2.0.0" })
  })

  test("finds .csproj version", async () => {
    await write("MyApp.csproj", `<Project>\n  <PropertyGroup>\n    <Version>3.1.0</Version>\n  </PropertyGroup>\n</Project>`)
    const result = await findVersionFile(tmpDir)
    expect(result).toMatchObject({ kind: "csproj", current: "3.1.0" })
  })

  test("finds plain VERSION file", async () => {
    await write("VERSION", "4.0.0\n")
    const result = await findVersionFile(tmpDir)
    expect(result).toMatchObject({ kind: "plain", current: "4.0.0" })
  })

  test("returns null when no version file exists", async () => {
    const result = await findVersionFile(tmpDir)
    expect(result).toBeNull()
  })

  test("package.json takes priority over Cargo.toml", async () => {
    await write("package.json", JSON.stringify({ version: "1.0.0" }))
    await write("Cargo.toml", `[package]\nversion = "2.0.0"\n`)
    const result = await findVersionFile(tmpDir)
    expect(result?.kind).toBe("package.json")
  })
})

describe("applyBump", () => {
  test("bumps package.json preserving structure", async () => {
    await write("package.json", JSON.stringify({ name: "pkg", version: "1.0.0", private: true }, null, 2) + "\n")
    const file = (await findVersionFile(tmpDir))!
    await applyBump(file, "1.1.0")
    const updated = JSON.parse(await read("package.json"))
    expect(updated.version).toBe("1.1.0")
    expect(updated.name).toBe("pkg")
    expect(updated.private).toBe(true)
  })

  test("bumps Cargo.toml without touching dependency versions", async () => {
    const original = `[package]\nname = "mylib"\nversion = "0.5.1"\n\n[dependencies]\nserde = { version = "1.0" }\n`
    await write("Cargo.toml", original)
    const file = (await findVersionFile(tmpDir))!
    await applyBump(file, "0.6.0")
    const updated = await read("Cargo.toml")
    expect(updated).toContain(`version = "0.6.0"`)
    expect(updated).toContain(`serde = { version = "1.0" }`)
  })

  test("bumps pyproject.toml version", async () => {
    await write("pyproject.toml", `[project]\nname = "app"\nversion = "2.0.0"\n`)
    const file = (await findVersionFile(tmpDir))!
    await applyBump(file, "2.1.0")
    const updated = await read("pyproject.toml")
    expect(updated).toContain(`version = "2.1.0"`)
  })

  test("bumps .csproj Version tag", async () => {
    await write("App.csproj", `<Project>\n  <PropertyGroup>\n    <Version>1.0.0</Version>\n  </PropertyGroup>\n</Project>`)
    const file = (await findVersionFile(tmpDir))!
    await applyBump(file, "1.0.1")
    const updated = await read("App.csproj")
    expect(updated).toContain("<Version>1.0.1</Version>")
  })

  test("bumps plain VERSION file", async () => {
    await write("VERSION", "3.0.0\n")
    const file = (await findVersionFile(tmpDir))!
    await applyBump(file, "3.0.1")
    const updated = await read("VERSION")
    expect(updated.trim()).toBe("3.0.1")
  })
})
