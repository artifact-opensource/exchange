/**
 * Vercel Serverless catch-all API for artifactvirtual.com
 * Mirrors server.ts routes that are stateless (no local disk / no shell).
 * fs/shell/ava routes are intentionally NOT served here — they require a
 * persistent VM and would be a security hole on shared serverless infra.
 *
 * Routes:
 *   GET  /api/github/repo/:owner/:repo
 *   GET  /api/github/contents/:owner/:repo?path=
 *   GET  /api/ipfs/index            (raw markdown)
 *   GET  /api/ipfs/catalog          ({items,total})
 *   POST /api/gemini/analyze        {prompt} -> {text}
 *   POST /api/openrouter/chat       {messages,model?,tools?} -> message
 *   POST /api/web/search            {query} -> {results}
 *   POST /api/web/fetch             {url} -> {content}
 */

import fs from "fs";
import path from "path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) h.Authorization = `token ${GITHUB_TOKEN}`;
  return h;
}

async function readJsonBody(req: any): Promise<any> {
  try {
    return typeof req.body === "object" && req.body !== null
      ? req.body
      : JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}

function ipfsIndexPath(): string {
  // vercel.json includeFiles ships index_ipfs.md next to the bundled function
  return path.join(process.cwd(), "index_ipfs.md");
}

function parseIpfsCatalog(md: string): { items: any[]; total: number } {
  const lines = md.split("\n").filter((l: string) => l.trim());
  const items = lines
    .map((line: string) => {
      const match = line.match(
        /\[ipfs:\/\/([^\]]+)\]\(([^)]+)\)\s*-\s*"([^"]+)"/,
      );
      if (match) return { cid: match[1], url: match[2], title: match[3] };
      return null;
    })
    .filter(Boolean);
  return { items, total: items.length };
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const method = (req.method || "GET").toUpperCase();

  try {
    // ─── GitHub proxy ────────────────────────────────────────────────
    let m = p.match(/^\/api\/github\/repo\/([^/]+)\/([^/]+)$/);
    if (m && method === "GET") {
      const [, owner, repo] = m;
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: githubHeaders(),
      });
      return res.status(r.status).json(await r.json());
    }

    m = p.match(/^\/api\/github\/contents\/([^/]+)\/([^/]+)$/);
    if (m && method === "GET") {
      const [, owner, repo] = m;
      const gp = url.searchParams.get("path") || "";
      const r = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${gp}`,
        { headers: githubHeaders() },
      );
      return res.status(r.status).json(await r.json());
    }

    // ─── IPFS research index ─────────────────────────────────────────
    if (p === "/api/ipfs/index" && method === "GET") {
      const md = fs.readFileSync(ipfsIndexPath(), "utf-8");
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      return res.status(200).send(md);
    }

    if (p === "/api/ipfs/catalog" && method === "GET") {
      const md = fs.readFileSync(ipfsIndexPath(), "utf-8");
      return res.status(200).json(parseIpfsCatalog(md));
    }

    // ─── Gemini proxy ────────────────────────────────────────────────
    if (p === "/api/gemini/analyze" && method === "POST") {
      const key = process.env.GEMINI_API_KEY;
      if (!key)
        return res.status(500).json({ error: "Gemini API key not configured" });
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
        data?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).join("") ??
        null;
      return res.status(r.ok ? 200 : 500).json(r.ok ? { text } : { error: "Gemini analysis failed" });
    }

    // ─── OpenRouter proxy ────────────────────────────────────────────
    if (p === "/api/openrouter/chat" && method === "POST") {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key)
        return res
          .status(500)
          .json({ error: "OpenRouter API key not configured" });
      const body = await readJsonBody(req);
      const r = await fetch(
        process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1/chat/completions",
        {
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
        },
      );
      const data: any = await r.json();
      if (!r.ok)
        return res.status(500).json({ error: "OpenRouter analysis failed" });
      return res.status(200).json(data.choices[0].message);
    }

    // ─── Web tools ───────────────────────────────────────────────────
    if (p === "/api/web/search" && method === "POST") {
      const { query } = await readJsonBody(req);
      const r = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      );
      const html = await r.text();
      const results: any[] = [];
      const regex =
        /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(html)) !== null && results.length < 5) {
        results.push({
          url: match[1],
          title: match[2].replace(/<[^>]+>/g, ""),
          snippet: match[3].replace(/<[^>]+>/g, ""),
        });
      }
      return res.status(200).json({ results });
    }

    if (p === "/api/web/fetch" && method === "POST") {
      const { url: target } = await readJsonBody(req);
      const r = await fetch(target);
      const html = await r.text();
      return res.status(200).json({ content: html.slice(0, 10000) });
    }

    // ─── Not served on serverless ────────────────────────────────────
    if (
      /^\/api\/(fs|shell|ava)\//.test(p)
    ) {
      return res.status(501).json({
        error:
          "This capability requires a persistent runtime and is not available on serverless hosting.",
      });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Internal error", details: String(err?.message || err) });
  }
}
