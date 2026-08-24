import { githubHeaders, readJsonBody } from "../_lib.mjs";

/**
 * AVA agent backend — single consolidated endpoint (Hobby plan caps
 * serverless functions at 12, so fs/shell/js share this dynamic route).
 *
 * GET  /api/ava/read   {path}            → file content or dir listing from content repo
 * POST /api/ava/write  {path,content,message} → commit create/update to content repo
 * ANY  /api/ava/shell  {command}          → honest 501 (no persistent shell in serverless)
 * POST /api/ava/eval   {code}             → sandboxed-ish JS evaluation
 */

const REPO = () => process.env.AVA_CONTENT_REPO || "artifact-opensource/exchange";
const BRANCH = () => process.env.AVA_CONTENT_BRANCH || "main";

const TIMEOUT_MS = 4000;
const MAX_CODE = 20_000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

function AsyncFunctionExpr(code) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    return new AsyncFunction(`"use strict"; return (\n${code}\n);`);
  } catch {
    return new AsyncFunction(`"use strict";\n${code}`);
  }
}

async function fsRead(body) {
  const filePath = body?.path;
  if (!filePath || typeof filePath !== "string") return { status: 400, json: { error: "path is required" } };
  const [owner, repo] = REPO().split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}?ref=${BRANCH()}`;
  const r = await fetch(url, { headers: githubHeaders() });
  const j = await r.json();
  if (!r.ok) return { status: r.status, json: { error: j.message || "read failed", path: filePath } };
  if (Array.isArray(j)) {
    return { status: 200, json: { path: filePath, type: "dir", entries: j.map((x) => ({ name: x.name, path: x.path, type: x.type, size: x.size })) } };
  }
  if (j.type === "file") {
    const content = j.encoding === "base64" ? Buffer.from(j.content, "base64").toString("utf-8") : j.content;
    return { status: 200, json: { path: filePath, type: "file", sha: j.sha, size: j.size, content } };
  }
  return { status: 200, json: { path: filePath, type: j.type } };
}

async function fsWrite(body) {
  const filePath = body?.path;
  const content = typeof body?.content === "string" ? body.content : null;
  if (!filePath || typeof filePath !== "string") return { status: 400, json: { error: "path is required" } };
  if (content === null) return { status: 400, json: { error: "content must be a string" } };

  const [owner, repo] = REPO().split("/");
  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}`;

  let sha;
  const cur = await fetch(`${base}?ref=${BRANCH()}`, { headers: githubHeaders() });
  if (cur.ok) {
    const j = await cur.json();
    if (j.type === "file") sha = j.sha;
  }

  const message = (typeof body?.message === "string" && body.message.trim()) || `${sha ? "AVA: update" : "AVA: create"} ${filePath}`;
  const put = await fetch(base, {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: BRANCH(),
      ...(sha ? { sha } : {}),
    }),
  });
  const j = await put.json();
  if (!put.ok) return { status: put.status, json: { error: j.message || "write failed", path: filePath } };
  return { status: 200, json: { success: true, path: filePath, created: !sha, commit: j.commit?.html_url, url: j.content?.html_url } };
}

function shellExec(body) {
  return {
    status: 501,
    json: {
      error: "shell_unavailable",
      command: body?.command || null,
      message:
        "This hosted runtime has no persistent shell. Use js_eval for computation, " +
        "fs_read/fs_write for file persistence (committed to the content repo on GitHub), " +
        "web_search/web_fetch for network access. A full shell requires a dedicated " +
        "sandbox runner (container/VM worker), which is not deployed here.",
      alternatives: ["js_eval", "fs_read", "fs_write", "web_search", "web_fetch"],
    },
  };
}

async function jsEval(body) {
  const code = body?.code;
  if (typeof code !== "string" || !code.trim()) return { status: 400, json: { error: "code is required" } };
  if (code.length > MAX_CODE) return { status: 400, json: { error: `code too large (max ${MAX_CODE} chars)` } };

  let fn;
  try {
    fn = AsyncFunctionExpr(code);
  } catch {
    return { status: 400, json: { error: "syntax_error", detail: "code does not parse as JS" } };
  }

  let result;
  try {
    result = await withTimeout(fn(), TIMEOUT_MS);
  } catch (e) {
    return { status: 200, json: { ok: false, error: String(e?.message || e) } };
  }

  let out;
  try {
    out = JSON.parse(JSON.stringify(result ?? null));
  } catch {
    out = String(result);
  }
  return { status: 200, json: { ok: true, result: out } };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const action = (req.query?.action || "").toString().toLowerCase();
    const body = await readJsonBody(req);

    switch (action) {
      case "read":
        return apply(res, await fsRead(body));
      case "write":
        return apply(res, await fsWrite(body));
      case "shell":
        return apply(res, shellExec(body));
      case "eval":
        return apply(res, await jsEval(body));
      default:
        return res.status(404).json({ error: `unknown action '${action}'`, available: ["read", "write", "shell", "eval"] });
    }
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

function apply(res, r) {
  return res.status(r.status).json(r.json);
}
