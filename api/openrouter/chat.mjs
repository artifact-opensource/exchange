import { readJsonBody } from "../_lib.mjs";

export default async function handler(req, res) {
  try {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return res.status(500).json({ error: "OpenRouter API key not configured" });
    const body = await readJsonBody(req);
    const base = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
    const url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://www.artifactvirtual.com",
        "X-Title": "Artifact Virtual",
      },
      body: JSON.stringify({
        model: body.model || "openrouter/free",
        messages: body.messages,
        tools: body.tools,
        tool_choice: body.tools ? "auto" : undefined,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: "OpenRouter analysis failed" });
    return res.status(200).json(data.choices[0].message);
  } catch (e) {
    return res.status(500).json({ error: "OpenRouter analysis failed", details: String(e?.message || e) });
  }
}
