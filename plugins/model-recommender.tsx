/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignal, createMemo } from "solid-js"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelInfo {
  model_id: string
  name: string
  slug: string
  creator: string
  input_price: number | null
  output_price: number | null
  blended_price: number | null
  intelligence: number | null
  coding: number | null
  speed_tps: number | null
  provider_model_id: string | null
  or_input_price: number | null
  or_output_price: number | null
}

interface RecommendationData {
  free_candidates: ModelInfo[]
  cheapest_quality_paid: ModelInfo[]
  best_value_under_budget: ModelInfo[]
  best_balanced_under_budget: ModelInfo[]
  timestamp: number
  error?: string
}

interface ModelCache {
  models: ModelInfo[]
  fetchedAt: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AA_API_URL = "https://artificialanalysis.ai/api/v2/data/llms/models"
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
const REFRESH_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes
const CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours — survive testing sessions
const FETCH_TIMEOUT_MS = 30000

// ─── API Functions ──────────────────────────────────────────────────────────

interface RawModel {
  id?: string
  name?: string
  slug?: string
  model_creator?: { name?: string } | null
  pricing?: {
    price_1m_input_tokens?: number | null
    price_1m_output_tokens?: number | null
    price_1m_blended_3_to_1?: number | null
  }
  evaluations?: {
    artificial_analysis_intelligence_index?: number | null
    artificial_analysis_coding_index?: number | null
  }
  median_output_tokens_per_second?: number | null
  [key: string]: any
}

interface OpenRouterModel {
  id?: string
  name?: string
  pricing?: {
    prompt?: string | number
    completion?: string | number
  }
  [key: string]: any
}

async function fetchWithTimeout(url: string, headers?: Record<string, string>, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: headers || {},
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

async function fetchModels(apiKey: string): Promise<RawModel[]> {
  const response = await fetchWithTimeout(AA_API_URL, { "x-api-key": apiKey })
  if (!response.ok) {
    throw new Error(`AA API error: ${response.status} ${response.statusText}`)
  }
  const payload = await response.json() as any
  const data = payload.data
  if (!Array.isArray(data)) {
    throw new Error("Unexpected API response: missing data[]")
  }
  return data as RawModel[]
}

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const response = await fetchWithTimeout(OPENROUTER_MODELS_URL)
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
  }
  const payload = await response.json() as any
  const data = payload.data
  if (!Array.isArray(data)) {
    throw new Error("Unexpected OpenRouter response: missing data[]")
  }
  return data as OpenRouterModel[]
}

function toFloat(v: any): number | null {
  if (v === null || v === undefined) return null
  if (typeof v !== "string" && typeof v !== "number") return null
  const n = parseFloat(String(v))
  return isNaN(n) ? null : n
}

function normKey(s: string): string {
  return s
    .toLowerCase()
    .split("")
    .filter((ch) => /[a-z0-9]/.test(ch))
    .join("")
}

function normalize(rawModels: RawModel[]): ModelInfo[] {
  const out: ModelInfo[] = []

  for (const m of rawModels) {
    const pricing = m.pricing || {}
    const evals = m.evaluations || {}
    const creator = (m.model_creator || {}).name || ""

    out.push({
      model_id: (m.id || "").toString(),
      name: (m.name || "").toString(),
      slug: (m.slug || "").toString(),
      creator: creator.toString(),
      input_price: toFloat(pricing.price_1m_input_tokens ?? null),
      output_price: toFloat(pricing.price_1m_output_tokens ?? null),
      blended_price: toFloat(pricing.price_1m_blended_3_to_1 ?? null),
      intelligence: toFloat(evals.artificial_analysis_intelligence_index ?? null),
      coding: toFloat(evals.artificial_analysis_coding_index ?? null),
      speed_tps: toFloat(m.median_output_tokens_per_second ?? null),
      provider_model_id: null,
      or_input_price: null,
      or_output_price: null,
    })
  }

  return out
}

function buildOpenRouterLookup(
  rawModels: OpenRouterModel[]
): Map<string, { id: string; input_price: number; output_price: number }> {
  const lookup = new Map<string, { id: string; input_price: number; output_price: number }>()

  for (const m of rawModels) {
    const mid = (m.id || "").toString().trim()
    if (!mid) continue

    const name = (m.name || "").toString().trim()
    const pricing = m.pricing || {}
    const promptRaw = pricing.prompt ?? "0"
    const completionRaw = pricing.completion ?? "0"

    const promptPerToken = parseFloat(promptRaw.toString())
    const completionPerToken = parseFloat(completionRaw.toString())

    const entry = {
      id: mid,
      input_price: isNaN(promptPerToken) ? 0.0 : promptPerToken * 1_000_000,
      output_price: isNaN(completionPerToken) ? 0.0 : completionPerToken * 1_000_000,
    }

    const keys = new Set([mid, mid.split("/").pop() || "", name])

    for (const k of keys) {
      const nk = normKey(k)
      if (nk && !lookup.has(nk)) {
        lookup.set(nk, entry)
      }
    }
  }

  return lookup
}

function attachOpenRouterAvailability(
  models: ModelInfo[],
  lookup: Map<string, { id: string; input_price: number; output_price: number }>
): void {
  for (const m of models) {
    const candidates = [m.slug, m.name]
    for (const c of candidates) {
      const nk = normKey(c)
      if (lookup.has(nk)) {
        const entry = lookup.get(nk)!
        m.provider_model_id = entry.id
        m.or_input_price = entry.input_price
        m.or_output_price = entry.output_price
        break
      }
    }
  }
}

function isFreeModel(m: ModelInfo): boolean {
  const inp = m.or_input_price ?? m.input_price
  const out = m.or_output_price ?? m.output_price
  return inp !== null && out !== null && inp === 0.0 && out === 0.0
}

function scoreValue(m: ModelInfo): number {
  const quality = (m.coding ?? 0.0) * 0.6 + (m.intelligence ?? 0.0) * 0.4
  const price = m.blended_price ?? 10_000.0
  return quality / (price + 1e-9)
}

function scoreBalanced(m: ModelInfo): number {
  const coding = m.coding ?? 0.0
  const intel = m.intelligence ?? 0.0
  const quality = coding * 0.6 + intel * 0.4
  const codingFloorPenalty = coding < 20 ? 0.7 : 1.0
  const price = m.blended_price ?? 10_000.0
  const priceFactor = 1.0 / (1.0 + Math.sqrt(Math.max(price, 0.0)))
  const speed = m.speed_tps ?? 0.0
  const speedBoost = 1.0 + Math.min(speed, 200.0) / 1000.0
  return quality * codingFloorPenalty * priceFactor * speedBoost
}

function pickRecommendations(models: ModelInfo[]): RecommendationData {
  const filtered = models.filter((m) => {
    const coding = m.coding ?? 0.0
    const intel = m.intelligence ?? 0.0
    const weighted = coding * 0.6 + intel * 0.4
    return intel >= 0.0 && coding >= 12.0 && weighted >= 20.0
  })

  const free = filtered.filter((m) => isFreeModel(m))
  free.sort((a, b) => scoreBalanced(b) - scoreBalanced(a))

  const paid = filtered.filter(
    (m) => !isFreeModel(m) && m.blended_price !== null && m.blended_price > 0
  )
  const cheapestQualityPaid = [...paid].sort((a, b) => {
    const priceA = a.blended_price ?? 10_000.0
    const priceB = b.blended_price ?? 10_000.0
    const codingA = a.coding ?? 0.0
    const codingB = b.coding ?? 0.0
    if (priceA !== priceB) return priceA - priceB
    return codingB - codingA
  })

  const budget = paid.filter((m) => (m.blended_price ?? 10_000.0) <= 0.5)
  const bestValue = [...budget].sort((a, b) => scoreValue(b) - scoreValue(a))
  const bestBalanced = [...budget].sort((a, b) => scoreBalanced(b) - scoreBalanced(a))

  return {
    free_candidates: free.slice(0, 2),
    cheapest_quality_paid: cheapestQualityPaid.slice(0, 2),
    best_value_under_budget: bestValue.slice(0, 2),
    best_balanced_under_budget: bestBalanced.slice(0, 2),
    timestamp: Date.now(),
  }
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

function formatPrice(price: number | null): string {
  if (price === null) return "N/A"
  if (price === 0) return "$0"
  return `$${price.toFixed(3)}`
}

function formatModelName(name: string, maxLen: number = 25): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 3) + "..."
}

// ─── Recommendations Panel ───────────────────────────────────────────────────

function RecommendationsPanel(props: { data: RecommendationData; api: any }) {
  const models = createMemo(() => [
    ...props.data.free_candidates.slice(0, 2),
    ...props.data.best_balanced_under_budget.slice(0, 2),
  ])

  const lastUpdated = createMemo(() =>
    new Date(props.data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  )

  const theme = () => props.api.theme.current
  const stripParens = (s: string) => s.replace(/\s*\(.*?\)\s*$/, "").trim()

  return (
    <box>
      <text fg={theme().text}><b>Model Recs</b> <span style={{ fg: theme().textMuted }}>{lastUpdated()}</span></text>
      {models().map((m) => {
        const name = formatModelName(stripParens(m.name), 20)
        const price = formatPrice(m.blended_price)
        const score = scoreBalanced(m).toFixed(0)
        return (
          <text fg={theme().text}>
            {"• "}{name}{" "}
            <span style={{ fg: theme().textMuted }}>{price} {score}</span>
          </text>
        )
      })}
      {props.data.error && (
        <text fg={theme().error}>⚠ {props.data.error}</text>
      )}
    </box>
  )
}

// ─── Main Plugin ─────────────────────────────────────────────────────────────

const tui: TuiPlugin = async (api) => {
  const [recommendations, setRecommendations] = createSignal<RecommendationData | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [apiKey, setApiKey] = createSignal<string | null>(null)

  const getApiKey = (): string | null => {
    const envKey = process.env.AA_API_KEY
    if (envKey) return envKey
    const stored = api.kv.get<string>("aa_api_key", "")
    return stored || null
  }

  const setAndStoreApiKey = (key: string) => {
    api.kv.set("aa_api_key", key)
    setApiKey(key)
    fetchRecommendations(true)
    api.ui.toast({
      variant: "success",
      title: "API Key Saved",
      message: "Model recommendations will now use this key.",
    })
  }

  const loadCache = (): ModelCache | null => {
    const cached = api.kv.get<ModelCache>("aa_model_cache", null)
    if (!cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null
    return cached
  }

  const saveCache = (models: ModelInfo[], fetchedAt: number) => {
    api.kv.set("aa_model_cache", { models, fetchedAt })
  }

  // Builds recs from AA models + fresh OR data (OR has no rate limits)
  const buildRecs = async (models: ModelInfo[], fetchedAt: number): Promise<RecommendationData> => {
    const orRaw = await fetchOpenRouterModels().catch(() => [] as OpenRouterModel[])
    if (orRaw.length > 0) {
      const orLookup = buildOpenRouterLookup(orRaw)
      attachOpenRouterAvailability(models, orLookup)
    }
    return { ...pickRecommendations(models), timestamp: fetchedAt }
  }

  const fetchRecommendations = async (force = false) => {
    const key = getApiKey()
    if (!key) {
      setRecommendations({
        free_candidates: [],
        cheapest_quality_paid: [],
        best_value_under_budget: [],
        best_balanced_under_budget: [],
        timestamp: Date.now(),
        error: "AA_API_KEY not set. Use /set-aa-key or set AA_API_KEY env var.",
      })
      return
    }

    if (!force) {
      const cached = loadCache()
      if (cached) {
        setLoading(true)
        try {
          setRecommendations(await buildRecs([...cached.models], cached.fetchedAt))
        } finally {
          setLoading(false)
        }
        return
      }
    }

    setLoading(true)
    try {
      const fetchedAt = Date.now()
      const rawModels = await fetchModels(key)
      const models = normalize(rawModels)
      saveCache(models, fetchedAt)
      setRecommendations(await buildRecs([...models], fetchedAt))
    } catch (error: any) {
      let errorMsg = error.message || "Failed to fetch recommendations"
      if (error.message.includes("401")) {
        errorMsg = "Invalid API key (401). Please check your AA_API_KEY and try again with /set-aa-key"
      }
      // Fall back to stale cache rather than showing nothing
      const stale = api.kv.get<ModelCache>("aa_model_cache", null)
      if (stale) {
        try {
          const recs = await buildRecs([...stale.models], stale.fetchedAt)
          setRecommendations({ ...recs, error: `${errorMsg} (cached)` })
        } catch {
          setRecommendations({ free_candidates: [], cheapest_quality_paid: [], best_value_under_budget: [], best_balanced_under_budget: [], timestamp: Date.now(), error: errorMsg })
        }
      } else {
        setRecommendations({ free_candidates: [], cheapest_quality_paid: [], best_value_under_budget: [], best_balanced_under_budget: [], timestamp: Date.now(), error: errorMsg })
      }
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch — uses cache if fresh
  fetchRecommendations()

  // Periodic refresh always bypasses cache
  const timer = setInterval(() => {
    fetchRecommendations(true)
  }, REFRESH_INTERVAL_MS)

  // Register commands and store cleanup functions
  const unregisterCommands = api.command.register(() => [
    {
      title: "Refresh Model Recommendations",
      value: "refresh-models",
      description: "Fetch latest model recommendations from Artificial Analysis",
      category: "Model Recommender",
      slash: { name: "refresh-models" },
      onSelect: () => {
        fetchRecommendations(true)
        api.ui.toast({
          variant: "info",
          title: "Refreshing",
          message: "Fetching latest model recommendations...",
          duration: 2000,
        })
      },
    },
    {
      title: "Set AA API Key",
      value: "set-aa-key",
      description: "Configure Artificial Analysis API key for model recommendations",
      category: "Model Recommender",
      slash: { name: "set-aa-key" },
      onSelect: () => {
        const DialogPrompt = api.ui.DialogPrompt
        api.ui.dialog.setSize("medium")
        api.ui.dialog.replace(() => (
          <DialogPrompt
            title="Set AA API Key"
            placeholder="Enter your AA API key..."
            onConfirm={(key) => {
              api.ui.dialog.clear()
              if (key.trim()) setAndStoreApiKey(key.trim())
            }}
            onCancel={() => {
              api.ui.dialog.clear()
            }}
          />
        ))
      },
    },
  ])

  // Cleanup on dispose
  api.lifecycle.onDispose(() => {
    clearInterval(timer)
    unregisterCommands()
  })

   // Register sidebar slot
   api.slots.register({
     order: 1000,
     slots: {
       sidebar_content(ctx, value) {
         const data = recommendations()
         if (!data) {
           return (
             <text fg={api.theme.current.textMuted}>Loading model recommendations...</text>
           )
         }
         return <RecommendationsPanel data={data} api={api} />
       },
     },
   })

}

const plugin: TuiPluginModule & { id: string } = {
  id: "model-recommender",
  tui,
}

export default plugin
