export type SignalDomain = "orbital" | "maritime" | "air" | "environment";

export type ProviderHealth = {
  provider: string;
  domain: SignalDomain;
  status: "live" | "degraded" | "offline";
  freshnessSeconds: number | null;
  detail?: string;
};

export type NormalizedSignal = {
  id: string;
  domain: SignalDomain;
  provider: string;
  label: string;
  latitude?: number;
  longitude?: number;
  altitudeKm?: number;
  observedAt: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type ProviderAdapter<TPayload = unknown> = {
  health: () => Promise<ProviderHealth>;
  normalize: (payload: TPayload) => NormalizedSignal[];
};

export const openRouterConfig = {
  baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  fastModel: process.env.OPENROUTER_FAST_MODEL ?? "openai/gpt-4o-mini",
  deepModel: process.env.OPENROUTER_DEEP_MODEL ?? "anthropic/claude-3.5-sonnet",
  reasoningModel: process.env.OPENROUTER_REASONING_MODEL ?? "openai/o3-mini",
};

export function buildAvaContext(input: {
  viewport?: { latitude: number; longitude: number; zoom: number };
  selectedSignals?: NormalizedSignal[];
  alerts?: Array<{ title: string; severity: string; observedAt: string }>;
  health: ProviderHealth[];
}) {
  return {
    source: "artifact-planetary-command-deck",
    generatedAt: new Date().toISOString(),
    viewport: input.viewport ?? null,
    selectedSignals: input.selectedSignals ?? [],
    alerts: input.alerts ?? [],
    providerHealth: input.health,
    instructions: "Treat offline or degraded providers as uncertainty. Never present fallback data as live.",
  };
}

export async function queryOpenRouter(messages: Array<{ role: "system" | "user"; content: string }>, model = openRouterConfig.fastModel) {
  if (!openRouterConfig.apiKey) throw new Error("OPENROUTER_API_KEY is not configured on the server");
  const response = await fetch(`${openRouterConfig.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${openRouterConfig.apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000", "X-Title": "Artifact Planetary Command Deck" },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  if (!response.ok) throw new Error(`OpenRouter request failed: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "No model response returned.";
}
