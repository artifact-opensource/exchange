/** Shared helpers for AV serverless API routes (native ESM). */
import fs from "node:fs";
import path from "node:path";

export function githubHeaders() {
  const h = { Accept: "application/vnd.github.v3+json" };
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";
  if (token) h.Authorization = `token ${token}`;
  return h;
}

export async function readJsonBody(req) {
  try {
    if (typeof req.body === "object" && req.body !== null) return req.body;
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}

export function readIpfsIndex() {
  return fs.readFileSync(path.join(process.cwd(), "index_ipfs.md"), "utf-8");
}

export function parseIpfsCatalog(md) {
  const lines = md.split("\n").filter((l) => l.trim());
  const items = lines
    .map((line) => {
      const m = line.match(/\[ipfs:\/\/([^\]]+)\]\(([^)]+)\)\s*-\s*"([^"]+)"/);
      return m ? { cid: m[1], url: m[2], title: m[3] } : null;
    })
    .filter(Boolean);
  return { items, total: items.length };
}
