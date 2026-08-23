import { readJsonBody } from "../_lib.mjs";

export default async function handler(req, res) {
  try {
    const { url } = await readJsonBody(req);
    const r = await fetch(url);
    const html = await r.text();
    return res.status(200).json({ content: html.slice(0, 10000) });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
