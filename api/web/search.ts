import { readJsonBody } from "../_lib";

export default async function handler(req: any, res: any) {
  try {
    const { query } = await readJsonBody(req);
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const html = await r.text();
    const results: any[] = [];
    const regex = /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null && results.length < 5) {
      results.push({
        url: m[1],
        title: m[2].replace(/<[^>]+>/g, ""),
        snippet: m[3].replace(/<[^>]+>/g, ""),
      });
    }
    return res.status(200).json({ results });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
