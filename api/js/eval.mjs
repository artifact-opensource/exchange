import { readJsonBody } from "../_lib.mjs";

/**
 * AVA js_eval — sandboxed-ish JavaScript evaluation for computation.
 *
 * Security posture (deliberate, per owner request to evaluate capabilities):
 * - Runs inside the serverless isolate: no persistent fs, no env leak surface
 *   beyond what the platform exposes anyway, dies with the invocation.
 * - Global fetch IS reachable from the Node runtime; code is size-capped and
 *   wall-clock-capped, but this is NOT a hard security sandbox. Fine for a
 *   trusted internal assistant; do not expose it to anonymous public abuse.
 * - Sync infinite loops cannot be preempted in-process; keep expressions pure.
 */
const TIMEOUT_MS = 4000;
const MAX_CODE = 20_000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const { code } = await readJsonBody(req);
    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "code is required" });
    }
    if (code.length > MAX_CODE) {
      return res.status(400).json({ error: `code too large (max ${MAX_CODE} chars)` });
    }

    // Support both bare expressions (`1+2`) and statement blocks (`const x=..; return x*2`)
    let fn;
    try {
      fn = new AsyncFunctionExpr(code);
    } catch {
      return res.status(400).json({ error: "syntax_error", detail: "code does not parse as JS" });
    }

    let result;
    try {
      result = await withTimeout(fn(), TIMEOUT_MS);
    } catch (e) {
      return res.status(200).json({ ok: false, error: String(e?.message || e) });
    }

    // Serialize safely (no circulars/functions blowing up JSON)
    let out;
    try {
      out = JSON.parse(JSON.stringify(result ?? null));
    } catch {
      out = String(result);
    }
    return res.status(200).json({ ok: true, result: out });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

function AsyncFunctionExpr(code) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    // expression first
    return new AsyncFunction(`"use strict"; return (\n${code}\n);`);
  } catch {
    // fall back to statements; user may include their own `return`
    return new AsyncFunction(`"use strict";\n${code}`);
  }
}
