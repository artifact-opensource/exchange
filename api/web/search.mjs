import { readJsonBody } from "../_lib.mjs";

export default async function handler(req, res) {
  try {
    const { query } = await readJsonBody(req);
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const html = await r.text();
    const results = [];
    const regex = /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
    let m;
    while ((m = regex.exec(html)) !== null && results.length < 5) {
      results.push({
        url: m[1],
        title: m[2].replace(/<[^>]+>/g, ""),
        snippet: m[3].replace(/<[^>]+>/g, ""),
      });
    }
    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
