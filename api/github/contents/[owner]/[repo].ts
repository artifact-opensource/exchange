import { githubHeaders } from "../../../_lib";

export default async function handler(req: any, res: any) {
  try {
    const { owner, repo } = req.query;
    const p = req.query.path || "";
    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${p}`,
      { headers: githubHeaders() },
    );
    return res.status(r.status).json(await r.json());
  } catch (e: any) {
    return res.status(500).json({ error: "Failed to fetch contents", details: String(e?.message || e) });
  }
}
