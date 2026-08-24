import { githubHeaders, readJsonBody } from "../_lib.mjs";

/** AVA fs_read — backed by the GitHub Contents API (serverless has no local disk). */
const REPO = () => process.env.AVA_CONTENT_REPO || "artifact-opensource/exchange";
const BRANCH = () => process.env.AVA_CONTENT_BRANCH || "main";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const { path: filePath } = await readJsonBody(req);
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "path is required" });
    }
    const [owner, repo] = REPO().split("/");
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}?ref=${BRANCH()}`;
    const r = await fetch(url, { headers: githubHeaders() });
    const j = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: j.message || "read failed", path: filePath });
    }

    // Directory listing
    if (Array.isArray(j)) {
      return res.status(200).json({
        path: filePath,
        type: "dir",
        entries: j.map((x) => ({ name: x.name, path: x.path, type: x.type, size: x.size })),
      });
    }

    // Single file
    if (j.type === "file") {
      const content =
        j.encoding === "base64" ? Buffer.from(j.content, "base64").toString("utf-8") : j.content;
      return res
        .status(200)
        .json({ path: filePath, type: "file", sha: j.sha, size: j.size, content });
    }

    return res.status(200).json({ path: filePath, type: j.type, data: j });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
