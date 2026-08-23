import { readJsonBody } from "../_lib";

export default async function handler(req: any, res: any) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Gemini API key not configured" });
    const { prompt } = await readJsonBody(req);
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: prompt }),
      },
    );
    const data: any = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? null;
    if (!r.ok) return res.status(500).json({ error: "Gemini analysis failed" });
    return res.status(200).json({ text });
  } catch (e: any) {
    return res.status(500).json({ error: "Gemini analysis failed", details: String(e?.message || e) });
  }
}
