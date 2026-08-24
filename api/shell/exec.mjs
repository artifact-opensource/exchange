import { readJsonBody } from "../_lib.mjs";

/**
 * AVA shell_exec — honest capability boundary.
 * The hosted serverless runtime has NO persistent shell. Instead of silently
 * failing (or pretending success), we return a structured explanation so the
 * model can route around it: js_eval for computation, fs_* for persistence
 * (via GitHub commits), web_* for network access.
 */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  const { command } = await readJsonBody(req);
  return res.status(501).json({
    error: "shell_unavailable",
    command: command || null,
    message:
      "This hosted runtime has no persistent shell. Use js_eval for computation, " +
      "fs_read/fs_write for file persistence (committed to the content repo on GitHub), " +
      "web_search/web_fetch for network access. A full shell requires a dedicated " +
      "sandbox runner (e.g. a container/VM worker), which is not deployed here.",
    alternatives: ["js_eval", "fs_read", "fs_write", "web_search", "web_fetch"],
  });
}
