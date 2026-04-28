import type { Plugin, ModelV2, Auth } from "@opencode-ai/plugin"

export const server: Plugin = async () => ({
  provider: {
    id: "openrouter",
    models: async (provider: any, _ctx: { auth?: Auth }) => {
      const existing = provider.models || {}

      try {
        const res = await fetch("https://openrouter.ai/api/v1/models")
        if (!res.ok) return existing

        const data = await res.json() as any
        const allModels = data.data || []

        const newModels: Record<string, ModelV2> = {}

        for (const model of allModels) {
          const id = model.id as string
          if (!id.endsWith(":free")) continue
          if (existing[id]) continue

          const pricing = model.pricing || {}
          const contextWindow = model.context_length || 4096
          const topProvider = model.top_provider || {}

          newModels[id] = {
            id,
            providerID: "openrouter",
            name: model.name || id,
            family: id.split("/")[1]?.split(":")[0] || "unknown",
            api: {
              id,
              url: "https://openrouter.ai/api/v1",
              npm: "@openrouter/ai-sdk-provider",
            },
            status: "active",
            capabilities: {
              temperature: true,
              reasoning: false,
              attachment: false,
              toolcall: true,
              input: { text: true, audio: false, image: false, video: false, pdf: false },
              output: { text: true, audio: false, image: false, video: false, pdf: false },
              interleaved: false,
            },
            cost: {
              input: Number(pricing.prompt) || 0,
              output: Number(pricing.completion) || 0,
              cache: { read: 0, write: 0 },
            },
            limit: { context: contextWindow, output: model.max_completion_tokens || model.output_length || 16384 },
            release_date: model.created ? new Date(model.created * 1000).toISOString().split("T")[0] : "2026-04-01",
            variants: {},
            options: {},
            headers: {},
          }
        }

        return { ...existing, ...newModels }
      } catch {
        return existing
      }
    },
  },
})
