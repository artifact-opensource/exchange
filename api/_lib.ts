/** Shared helpers for AV serverless API routes. */
import fs from "fs";
import path from "path";

export const GITHUB_TOKEN =
  process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";

export function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) h.Authorization = `token ${GITHUB_TOKEN}`;
  return h;
}

export async function readJsonBody(req: any): Promise<any> {
  try {
    if (typeof req.body === "object" && req.body !== null) return req.body;
    return JSON.parse(req.body || "{}");
  } catch {
    return {};
  }
}

export function readIpfsIndex(): string {
  return fs.readFileSync(path.join(process.cwd(), "index_ipfs.md"), "utf-8");
}

export function parseIpfsCatalog(md: string): { items: any[]; total: number } {
  const lines = md.split("\n").filter((l: string) => l.trim());
  const items = lines
    .map((line: string) => {
      const m = line.match(/\[ipfs:\/\/([^\]]+)\]\(([^)]+)\)\s*-\s*"([^"]+)"/);
      return m ? { cid: m[1], url: m[2], title: m[3] } : null;
    })
    .filter(Boolean);
  return { items, total: items.length };
}
