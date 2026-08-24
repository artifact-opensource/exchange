import { githubHeaders, readJsonBody } from "../_lib.mjs";

/**
 * AVA fs_write — persists files by committing to the content repo via the
 * GitHub Contents API. Create (no sha) and update (existing sha) both supported.
 * Commits go to AVA_CONTENT_BRANCH (default: main).
 */
const REPO = () => process.env.AVA_CONTENT_REPO || "artifact-opensource/exchange";
const BRANCH = () => process.env.AVA_CONTENT_BRANCH || "main";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const { path: filePath, content = "", message } = await readJsonBody(req);
    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({ error: "path is required" });
    }
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content must be a string" });
    }

    const [owner, repo] = REPO().split("/");
    const base = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}`;

    // Existing file? Grab its sha so we update instead of failing.
    let sha;
    const cur = await fetch(`${base}?ref=${BRANCH()}`, { headers: githubHeaders() });
    if (cur.ok) {
      const j = await cur.json();
      if (j.type === "file") sha = j.sha;
    }

    const commitMessage =
      (typeof message === "string" && message.trim()) ||
      `AVA: create ${filePath}` + (sha ? "" : "") ;

    const put = await fetch(base, {
      method: "PUT",
      headers: { ...githubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: sha ? commitMessage.replace("create", "update") : commitMessage,
        content: Buffer.from(content, "utf-8").toString("base64"),
        branch: BRANCH(),
        ...(sha ? { sha } : {}),
      }),
    });
    const j = await put.json();

    if (!put.ok) {
      return res.status(put.status).json({ error: j.message || "write failed", path: filePath });
    }

    return res.status(200).json({
      success: true,
      path: filePath,
      created: !sha,
      commit: j.commit?.html_url,
      url: j.content?.html_url,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
