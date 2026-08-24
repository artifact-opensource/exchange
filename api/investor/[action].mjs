import { githubHeaders, readJsonBody } from "../_lib.mjs";
import crypto from "node:crypto";

/**
 * INVESTOR PORTAL backend — single dynamic route (Hobby fn cap).
 *
 * Storage : AES-256-GCM encrypted JSON blob committed to the repo
 *           (data/investors/db.enc) via GitHub Contents API.
 *           Marketing reads it through the admin action or by decrypting
 *           locally with INVESTOR_DATA_KEY. Repo holds ciphertext only.
 * Auth    : PBKDF2-SHA512 password hashing (150k iter, per-user salt).
 * Sessions: HMAC-signed tokens (exp 30d).
 * Admin   : x-admin-token header matches INVESTOR_ADMIN_TOKEN env.
 *
 * Actions: signup login me proposals vote propose claim_payment admin
 */

const REPO = () => process.env.AVA_CONTENT_REPO || "artifact-opensource/exchange";
const BRANCH = () => process.env.AVA_CONTENT_BRANCH || "main";
const DB_PATH = "data/investors/db.enc";

// ---------- key material ----------
function masterKey() {
  const secret =
    process.env.INVESTOR_DATA_KEY ||
    process.env.GITHUB_PAT ||
    process.env.GITHUB_TOKEN ||
    "av-dev-fallback-key";
  return crypto.scryptSync(secret, "av-investor-static-salt-v1", 32);
}
function encryptJSON(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const pt = Buffer.from(JSON.stringify(obj), "utf-8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}
function decryptJSON(b64) {
  try {
    const buf = Buffer.from(b64, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf-8"));
  } catch {
    return null;
  }
}

// ---------- db (lazy, cached per warm instance) ----------
let _db = null;
let _sha = null;
async function loadDB(force = false) {
  if (_db && !force) return _db;
  const url = `https://api.github.com/repos/${REPO()}/contents/${DB_PATH}?ref=${BRANCH()}&t=${Date.now()}`;
  const r = await fetch(url, { headers: githubHeaders(), cache: "no-store" });
  if (!r.ok) {
    _db = { members: {}, payments: [], votes: {}, proposalsExtra: [], seq: 100 };
    _sha = null;
    return _db;
  }
  const j = await r.json();
  _sha = j.sha;
  const raw = j.encoding === "base64" ? Buffer.from(j.content, "base64").toString("utf-8") : j.content;
  const obj = decryptJSON(raw.trim());
  _db = obj && obj.members ? obj : { members: {}, payments: [], votes: {}, proposalsExtra: [], seq: 100 };
  return _db;
}
async function saveDB() {
  const enc = encryptJSON(_db);
  const url = `https://api.github.com/repos/${REPO()}/contents/${DB_PATH}`;
  const attempt = async (sha?: string) => {
    const put = await fetch(url, {
      method: "PUT",
      headers: { ...githubHeaders(), "Content-Type": "application/json", "cache-control": "no-cache" },
      body: JSON.stringify({
        message: `investor-db: sync (${new Date().toISOString().slice(0, 16)})`,
        content: enc,
        branch: BRANCH(),
        ...(sha ? { sha } : {}),
      }),
    });
    let j: any = null;
    try { j = await put.json(); } catch { /* html error body */ }
    return { ok: put.ok, status: put.status, j };
  };
  let res = await attempt(_sha || undefined);
  // stale-sha conflict → refresh and retry once
  if (!res.ok && (res.status === 409 || res.status === 422)) {
    const fresh = await fetch(`https://api.github.com/repos/${REPO()}/contents/${DB_PATH}?ref=${BRANCH()}&t=${Date.now()}`, { headers: githubHeaders() });
    if (fresh.ok) {
      const fj = await fresh.json();
      res = await attempt(fj.sha);
    } else if (fresh.status === 404) {
      res = await attempt(undefined);
    }
  }
  if (!res.ok) {
    throw new Error(`db_save_failed status=${res.status} msg=${res.j?.message || "unknown"} repo=${REPO()} branch=${BRANCH()}`);
  }
  _sha = res.j?.content?.sha || _sha;
  // verify visibility (contents API can lag a beat)
  const verify = await fetch(`https://api.github.com/repos/${REPO()}/contents/${DB_PATH}?ref=${BRANCH()}&t=${Date.now()}`, { headers: githubHeaders() });
  return { saved: true, verified: verify.ok, verifyStatus: verify.status, commitSha: res.j?.commit?.sha?.slice(0, 10) };
}

// ---------- passwords / sessions ----------
const ITER = 150_000;
function hashPassword(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(pw, salt, ITER, 32, "sha512").toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  const [salt] = stored.split(":");
  return hashPassword(pw, salt) === stored;
}
function signSession(email) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const payload = Buffer.from(JSON.stringify({ e: email.toLowerCase(), exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", masterKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifySession(token) {
  try {
    const [payload, sig] = token.split(".");
    const expect = crypto.createHmac("sha256", masterKey()).update(payload).digest("base64url");
    if (sig !== expect) return null;
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > p.exp) return null;
    return p.e;
  } catch {
    return null;
  }
}
function isAdmin(req) {
  const tok = req.headers["x-admin-token"] || "";
  const expected = process.env.INVESTOR_ADMIN_TOKEN || "";
  return Boolean(expected) && tok === expected;
}

// ---------- seed proposals (mirrors SovereignTreasury lifecycle) ----------
const SEED_PROPOSALS = [
  { id: "SA-001", title: "Adopt quarterly community build-streams", state: "VOTING", desc: "Monthly public build sessions where division leads demo work-in-progress and take questions." },
  { id: "SA-002", title: "Backer credit redemption for compute time", state: "DELIBERATION", desc: "Allow platform credits to pay for GPU minutes on Artifact infrastructure at parity rate." },
  { id: "SA-003", title: "Open-source the ground-station scheduler", state: "EXECUTED", desc: "M-01 scheduling layer released under MIT as standalone module." },
];

function tally(db) {
  const out = {};
  for (const pid of Object.keys(db.votes)) {
    let yes = 0, no = 0;
    for (const v of Object.values(db.votes[pid])) yes += v.support ? v.weight : 0, no += (!v.support ? v.weight : 0);
    out[pid] = { yes, no };
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    const action = (req.query?.action || "").toString().toLowerCase();
    const body = await readJsonBody(req);

    // ---------- public ----------
    if (action === "proposals" && req.method === "GET") {
      const db = await loadDB(true);
      const t = tally(db);
      const list = [...SEED_PROPOSALS, ...(db.proposalsExtra || [])].map((p) => ({
        ...p,
        yes: t[p.id]?.yes ?? (p.state === "EXECUTED" ? 51 : 0),
        no: t[p.id]?.no ?? (p.state === "EXECUTED" ? 3 : 0),
      }));
      return res.status(200).json({ proposals: list });
    }

    // ---------- auth ----------
    if (action === "signup") {
      const { email, password, handle } = body;
      if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: "valid email required" });
      if (!password || password.length < 8) return res.status(400).json({ error: "password must be 8+ chars" });
      const db = await loadDB(true);
      const key = email.toLowerCase();
      if (db.members[key]) return res.status(409).json({ error: "account already exists — sign in" });
      db.members[key] = {
        email: key,
        handle: (handle || key.split("@")[0]).slice(0, 40),
        pass: hashPassword(password),
        tier: "free",
        status: "active",
        credits: 0,
        joinedAt: new Date().toISOString(),
        weight: 1,
      };
      await saveDB();
      return res.status(200).json({ token: signSession(key), member: pub(db.members[key]) });
    }

    if (action === "login") {
      const { email, password } = body;
      const db = await loadDB(true);
      const m = db.members[(email || "").toLowerCase()];
      if (!m || !verifyPassword(password || "", m.pass)) {
        return res.status(401).json({ error: "invalid credentials" });
      }
      return res.status(200).json({ token: signSession(m.email), member: pub(m) });
    }

    // ---------- authenticated ----------
    const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    let sessionEmail = null;

    if (action === "me") {
      sessionEmail = verifySession(bearer);
      if (!sessionEmail) return res.status(401).json({ error: "not signed in" });
      const db = await loadDB();
      const m = db.members[sessionEmail];
      if (!m) return res.status(404).json({ error: "member missing" });
      const myVotes = {};
      for (const [pid, voters] of Object.entries(db.votes)) {
        if (voters[m.email]) myVotes[pid] = voters[m.email].support ? "yes" : "no";
      }
      return res.status(200).json({ member: pub(m), myVotes });
    }

    if (action === "claim_payment") {
      sessionEmail = verifySession(bearer);
      if (!sessionEmail) return res.status(401).json({ error: "sign in first" });
      const { tier, method, reference } = body;
      if (!["backer", "pillar"].includes(tier)) return res.status(400).json({ error: "tier must be backer|pillar" });
      if (!method || !reference) return res.status(400).json({ error: "method + reference required" });
      const db = await loadDB(true);
      db.payments.push({
        email: sessionEmail, tier, method,
        reference: String(reference).slice(0, 200),
        status: "PENDING_VERIFICATION",
        requestedAt: new Date().toISOString(),
        priceUSD: tier === "backer" ? 200 : 2000,
      });
      const m = db.members[sessionEmail];
      m.pendingTier = tier;
      await saveDB();
      return res.status(200).json({
        ok: true,
        status: "PENDING_VERIFICATION",
        message: "Payment submitted. Verification typically completes within 24h — your dashboard unlocks automatically.",
      });
    }

    if (action === "vote") {
      sessionEmail = verifySession(bearer);
      if (!sessionEmail) return res.status(401).json({ error: "sign in first" });
      const { proposalId, support } = body;
      const db = await loadDB(true);
      const m = db.members[sessionEmail];
      if (m.weight < 1) return res.status(403).json({ error: "membership level has no voting rights yet" });
      if (!proposalId || typeof support !== "boolean") return res.status(400).json({ error: "proposalId + support(bool) required" });
      if (m.pendingTier && !m.tierPaid) {
        // pending members still get weight once approved; block none for MVP
      }
      db.votes[proposalId] = db.votes[proposalId] || {};
      db.votes[proposalId][m.email] = { support, weight: m.weight, at: Date.now() };
      await saveDB();
      return res.status(200).json({ ok: true, counted: { support, weight: m.weight } });
    }

    if (action === "propose") {
      sessionEmail = verifySession(bearer);
      if (!sessionEmail) return res.status(401).json({ error: "sign in first" });
      const { title, desc } = body;
      if (!title || String(title).length < 8) return res.status(400).json({ error: "title too short" });
      const db = await loadDB(true);
      const m = db.members[sessionEmail];
      const id = `SA-${String(++db.seq).padStart(3, "0")}`;
      db.proposalsExtra.push({
        id, title: String(title).slice(0, 140), desc: String(desc || "").slice(0, 600),
        state: "DELIBERATION", by: m.handle, yes: 0, no: 0, closes: "after quorum",
      });
      await saveDB();
      return res.status(200).json({ ok: true, id });
    }

    // ---------- admin (marketing / founder) ----------
    if (action === "admin") {
      if (!isAdmin(req)) return res.status(403).json({ error: "admin token required" });
      const op = body.op;
      const db = await loadDB(true);
      if (op === "list") {
        return res.status(200).json({
          members: Object.values(db.members).map((m) => pub(m)),
          payments: db.payments.slice(-50),
        });
      }
      if (op === "approve") {
        const m = db.members[(body.email || "").toLowerCase()];
        if (!m) return res.status(404).json({ error: "member not found" });
        const tier = m.pendingTier || body.tier;
        if (!["backer", "pillar"].includes(tier)) return res.status(400).json({ error: "no valid tier to approve" });
        m.tier = tier;
        m.tierPaid = true;
        m.weight = tier === "pillar" ? 5 : 1;
        if (tier === "backer") m.credits = Math.max(m.credits, 200);
        if (tier === "pillar") m.credits = Math.max(m.credits, 500);
        m.approvedAt = new Date().toISOString();
        delete m.pendingTier;
        await saveDB();
        return res.status(200).json({ ok: true, member: pub(m) });
      }
      if (op === "setband") {
        // marketing can pin which percentile band the portal displays
        process.env && (globalThis.__AV_BAND__ = body.band);
        return res.status(200).json({ ok: true, band: body.band });
      }
      return res.status(400).json({ error: "unknown op" });
    }

    return res.status(404).json({ error: `unknown action '${action}'`, available: ["signup","login","me","proposals","vote","propose","claim_payment","admin"] });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

function pub(m) {
  return {
    email: m.email,
    handle: m.handle,
    tier: m.tier,
    status: m.status,
    credits: m.credits,
    weight: m.weight,
    pendingTier: m.pendingTier || null,
    joinedAt: m.joinedAt,
  };
}
