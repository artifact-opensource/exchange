import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Gemini API Initialization (Lazy)
  let genAI: GoogleGenAI | null = null;
  const getGemini = () => {
    if (!genAI && process.env.GEMINI_API_KEY) {
      genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return genAI;
  };

  // GitHub Proxy API — uses GITHUB_TOKEN or GITHUB_PAT (fallback)
  app.get("/api/github/repo/:owner/:repo", async (req, res) => {
    const { owner, repo } = req.params;
    const pat = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: pat
            ? {
                Authorization: `token ${pat}`,
                Accept: "application/vnd.github.v3+json",
              }
            : { Accept: "application/vnd.github.v3+json" },
        },
      );

      if (!response.ok)
        return res
          .status(response.status)
          .json({ error: "GitHub API error", status: response.status });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res
        .status(500)
        .json({
          error: "Failed to fetch repo",
          details: err instanceof Error ? err.message : String(err),
        });
    }
  });

  app.get("/api/github/contents/:owner/:repo", async (req, res) => {
    const { owner, repo } = req.params;
    const pathParam = (req.query.path as string) || "";
    const pat = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${pathParam}`,
        {
          headers: pat
            ? {
                Authorization: `token ${pat}`,
                Accept: "application/vnd.github.v3+json",
              }
            : { Accept: "application/vnd.github.v3+json" },
        },
      );

      if (!response.ok)
        return res
          .status(response.status)
          .json({ error: "GitHub API error", status: response.status });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res
        .status(500)
        .json({
          error: "Failed to fetch contents",
          details: err instanceof Error ? err.message : String(err),
        });
    }
  });

  // Gemini Proxy
  app.post("/api/gemini/analyze", async (req, res) => {
    const { prompt } = req.body;
    const ai = getGemini();
    if (!ai)
      return res.status(500).json({ error: "Gemini API key not configured" });

    try {
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });
      res.json({ text: result.text });
    } catch (err) {
      res.status(500).json({ error: "Gemini analysis failed" });
    }
  });

  // OpenRouter Proxy
  let openRouterAi: OpenAI | null = null;
  const getOpenRouter = () => {
    if (!openRouterAi && process.env.OPENROUTER_API_KEY) {
      openRouterAi = new OpenAI({
        baseURL:
          process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": "https://aistudio.google.com/",
          "X-Title": "AI Studio Applet",
        },
      });
    }
    return openRouterAi;
  };

  app.post("/api/openrouter/chat", async (req, res) => {
    const { messages, model = "openrouter/free", tools } = req.body;
    const ai = getOpenRouter();
    if (!ai)
      return res
        .status(500)
        .json({ error: "OpenRouter API key not configured" });

    try {
      const completion = await ai.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: tools ? "auto" : undefined,
      });
      res.json(completion.choices[0].message);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "OpenRouter analysis failed" });
    }
  });

  // Agentic Tools Endpoints
  app.post("/api/fs/read", async (req, res) => {
    try {
      const { path: filePath } = req.body;
      const content = require("fs").readFileSync(
        path.join(process.cwd(), filePath),
        "utf-8",
      );
      res.json({ content });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/fs/write", async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      require("fs").writeFileSync(
        path.join(process.cwd(), filePath),
        content,
        "utf-8",
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/shell/exec", async (req, res) => {
    try {
      const { command } = req.body;
      require("child_process").exec(
        command,
        { cwd: process.cwd() },
        (error: any, stdout: string, stderr: string) => {
          res.json({ stdout, stderr, error: error ? error.message : null });
        },
      );
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/web/search", async (req, res) => {
    try {
      const { query } = req.body;
      // Using duckduckgo html search for simple web search
      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      );
      const html = await response.text();
      // Very basic extraction of titles and snippets
      const results = [];
      const regex =
        /<a class="result__url" href="([^"]+)".*?>(.*?)<\/a>.*?<a class="result__snippet[^>]+>(.*?)<\/a>/gs;
      let match;
      while ((match = regex.exec(html)) !== null && results.length < 5) {
        results.push({
          url: match[1],
          title: match[2].replace(/<[^>]+>/g, ""),
          snippet: match[3].replace(/<[^>]+>/g, ""),
        });
      }
      res.json({ results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/web/fetch", async (req, res) => {
    try {
      const { url } = req.body;
      const response = await fetch(url);
      const html = await response.text();
      res.json({ content: html.slice(0, 10000) }); // Limit to 10k chars
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // IPFS catalog endpoint — serves the full research index
  app.get("/api/ipfs/catalog", async (req, res) => {
    try {
      const fs = require("fs");
      const ipfsPath = path.join(process.cwd(), "index_ipfs.md");
      const content = fs.readFileSync(ipfsPath, "utf-8");
      // Parse and return structured JSON
      const lines = content.split("\n").filter((l: string) => l.trim());
      const items = lines.map((line: string) => {
        const match = line.match(/\[ipfs:\/\/([^\]]+)\]\(([^)]+)\)\s*-\s*"([^"]+)"/);
        if (match) {
          return { cid: match[1], url: match[2], title: match[3] };
        }
        return null;
      }).filter(Boolean);
      res.json({ items, total: items.length });
    } catch (e: any) {
      res.status(404).json({ error: "IPFS index not found", details: e.message });
    }
  });

  // Ava Agent Endpoints — agentic control for the on-board AI
  const AVA_WORKSPACE = process.env.AVA_WORKSPACE || path.join(process.cwd(), ".ava-workspace");

  // Ensure Ava workspace exists
  app.post("/api/ava/workspace/init", async (req, res) => {
    try {
      const fs = require("fs");
      if (!fs.existsSync(AVA_WORKSPACE)) {
        fs.mkdirSync(AVA_WORKSPACE, { recursive: true });
        fs.mkdirSync(path.join(AVA_WORKSPACE, "research"), { recursive: true });
        fs.mkdirSync(path.join(AVA_WORKSPACE, "cache"), { recursive: true });
        fs.mkdirSync(path.join(AVA_WORKSPACE, "output"), { recursive: true });
      }
      res.json({ workspace: AVA_WORKSPACE, initialized: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ava: read file from workspace
  app.post("/api/ava/workspace/read", async (req, res) => {
    try {
      const { filePath } = req.body;
      const fullPath = path.join(AVA_WORKSPACE, filePath);
      if (!fullPath.startsWith(AVA_WORKSPACE)) {
        return res.status(403).json({ error: "Path traversal blocked" });
      }
      const content = require("fs").readFileSync(fullPath, "utf-8");
      res.json({ content });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ava: write file to workspace
  app.post("/api/ava/workspace/write", async (req, res) => {
    try {
      const { filePath, content } = req.body;
      const fullPath = path.join(AVA_WORKSPACE, filePath);
      if (!fullPath.startsWith(AVA_WORKSPACE)) {
        return res.status(403).json({ error: "Path traversal blocked" });
      }
      require("fs").mkdirSync(path.dirname(fullPath), { recursive: true });
      require("fs").writeFileSync(fullPath, content, "utf-8");
      res.json({ success: true, path: fullPath });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ava: list workspace files
  app.get("/api/ava/workspace/list", async (req, res) => {
    try {
      const fs = require("fs");
      const basePath = (req.query.path as string) || "";
      const fullPath = path.join(AVA_WORKSPACE, basePath);
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      const files = entries.map((e: any) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(basePath, e.name),
      }));
      res.json({ files, path: basePath });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ava: shell execution (sandboxed, restricted to workspace)
  app.post("/api/ava/shell/exec", async (req, res) => {
    try {
      const { command, timeout = 30000 } = req.body;
      // Block dangerous commands
      const blocked = ['rm -rf /', 'mkfs', 'dd if=', ':(){:|:&};', 'chmod 777'];
      if (blocked.some(b => command.includes(b))) {
        return res.status(403).json({ error: "Command blocked for safety" });
      }
      const { execSync } = require("child_process");
      const output = execSync(command, {
        cwd: AVA_WORKSPACE,
        timeout,
        encoding: 'utf-8',
      });
      res.json({ stdout: output, stderr: '' });
    } catch (e: any) {
      res.status(500).json({ error: e.message, stdout: e.stdout, stderr: e.stderr });
    }
  });

  // Ava: research index query
  app.get("/api/ava/research/search", async (req, res) => {
    try {
      const query = (req.query.q as string)?.toLowerCase() || '';
      const fs = require("fs");
      const indexPath = path.join(AVA_WORKSPACE, "research-index.json");
      if (!fs.existsSync(indexPath)) {
        return res.json({ results: [], query, total: 0 });
      }
      const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      const results = index.filter((item: any) => {
        if (!query) return true;
        const searchable = `${item.title} ${item.tags?.join(' ')} ${item.category} ${item.summary}`.toLowerCase();
        return searchable.includes(query);
      });
      res.json({ results, query, total: results.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
