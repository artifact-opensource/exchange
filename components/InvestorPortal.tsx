import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import {
  TIERS, TierId, METRICS, Banded, Band, DOC_LIBRARY, KANBAN,
  PAYMENT, fmtMetric,
} from '../lib/investor-data';

/**
 * INVESTOR PORTAL — the richest surface in the Artifact network.
 * Hash-routed (#/investors). Three membership universes, each with its own
 * atmosphere: OPERATOR (public steel), BACKER (foundry amber), PILLAR (command blue).
 */

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const TREASURY = PAYMENT.crypto.evmAddress as `0x${string}`;
const ERC20_ABI = [
  {
    name: 'transfer', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

// ---------- api client ----------
const api = async (action: string, body?: any, token?: string | null) => {
  const r = await fetch(`/api/investor/${action}`, {
    method: action === 'proposals' ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: action === 'proposals' ? undefined : JSON.stringify(body || {}),
  });
  return r.json();
};

interface Member { email: string; handle: string; tier: TierId; credits: number; weight: number; pendingTier?: string | null; tester?: boolean }
interface Proposal { id: string; title: string; desc: string; state: string; yes: number; no: number; closes?: string }

export default function InvestorPortalApp() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('av_inv_token'));
  const [member, setMember] = useState<Member | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // index.html locks body overflow for the horizontal snap experience —
  // restore scrolling while the portal is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api('me', {}, token)
      .then((d) => { if (d.member) { setMember(d.member); setMyVotes(d.myVotes || {}); } else { localStorage.removeItem('av_inv_token'); setToken(null); } })
      .finally(() => setLoading(false));
  }, []);

  const onAuthed = (tok: string, m: Member) => {
    localStorage.setItem('av_inv_token', tok);
    setToken(tok); setMember(m);
  };
  const signOut = () => { localStorage.removeItem('av_inv_token'); setToken(null); setMember(null); };

  const tier: TierId = member?.tier ?? 'free';
  const pending = member?.pendingTier ?? null;

  return (
    <div className="min-h-[100dvh] bg-[#030303] text-white relative overflow-x-hidden">
      <Atmosphere tier={member ? tier : 'free'} />

      {/* top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#030303]/85 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="#/" onClick={() => { window.location.hash = ''; window.location.reload(); }} className="flex items-center gap-3 group">
            <img src="/brand/av-logo-white.png" alt="AV" draggable={false} className="h-4 w-auto select-none" />
            <span className="font-mono text-[11px] tracking-[0.35em] text-white/50 group-hover:text-white transition-colors uppercase">← Artifact Virtual</span>
          </a>
          <span className="font-mono text-[11px] tracking-[0.35em] uppercase" style={{ color: TIERS[tier].accent }}>
            {TIERS[tier].name} {pending && <span className="text-white/30">· {pending.toUpperCase()} PENDING</span>}
          </span>
          {member && (
            <button onClick={signOut} className="font-mono text-[10px] tracking-widest text-white/40 hover:text-white transition-colors uppercase">Sign out</button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 relative z-10">
        {loading ? (
          <div className="h-[60vh] flex items-center justify-center font-mono text-xs text-white/30 tracking-[0.3em] animate-pulse">ESTABLISHING SECURE SESSION…</div>
        ) : !member ? (
          <AuthView onAuthed={onAuthed} />
        ) : (
          <Dashboard member={member} myVotes={myVotes} token={token!} refresh={() => api('me', {}, token!).then((d) => d.member && setMember(d.member))} />
        )}
      </main>

      <footer className="border-t border-white/5 mt-16 py-6 text-center font-mono text-[9px] tracking-[0.3em] text-white/20 uppercase">
        Artifact Virtual (SMC-Private) Ltd · SECP #0325693 · Islamabad · Figures shown within conservative percentile bands
      </footer>
    </div>
  );
}

/* ================= ATMOSPHERE (per-tier background life) ================= */

function Atmosphere({ tier }: { tier: TierId }) {
  const accent = TIERS[tier].accent;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <style>{`
        @keyframes av-orb { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-60px) scale(1.15)} 66%{transform:translate(-30px,40px) scale(0.95)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes av-grid { from{background-position:0 0} to{background-position:80px 80px} }
      `}</style>
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        animation: 'av-grid 26s linear infinite',
      }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute rounded-full blur-[110px] opacity-25"
          style={{
            width: 420 + i * 130, height: 420 + i * 130,
            left: `${[ -8, 55, 25 ][i]}%`, top: `${[ -12, 30, 62 ][i]}%`,
            background: i === 1 ? accent : '#38bdf8',
            animation: `av-orb ${22 + i * 9}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ================= AUTH ================= */

function AuthView({ onAuthed }: { onAuthed: (t: string, m: Member) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const d = await api(mode, mode === 'signup' ? { email, password, handle } : { email, password });
      if (d.error) setErr(d.error);
      else onAuthed(d.token, d.member);
    } catch { setErr('network error'); }
    setBusy(false);
  };

  return (
    <div className="max-w-md mx-auto pt-10 pb-4">
      <p className="font-mono text-[9px] tracking-[0.45em] text-white/30 uppercase mb-2">Access_Node // Membership</p>
      <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-2">INVESTOR_RELATIONS</h1>
      <p className="text-sm text-white/45 leading-relaxed mb-6">
        One account across every membership universe. Start free — upgrade when you want deeper access.
        Backers put $200 in and get it back as platform credits.
      </p>

      <div className="border border-white/10 bg-black/40 backdrop-blur-sm p-5 md:p-6 space-y-4">
        <div className="flex border border-white/10 overflow-hidden font-mono text-[11px] tracking-widest">
          {(['signup', 'login'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-3 transition-colors ${mode === m ? 'bg-white text-black font-bold' : 'text-white/50 hover:text-white'}`}>
              {m === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>
          ))}
        </div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" type="email" autoComplete="email"
          className="w-full h-12 px-4 border border-white/10 bg-white/[0.04] text-base placeholder-white/25 focus:outline-none focus:border-emerald-400/60 transition-colors" />
        {mode === 'signup' && (
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="display handle" autoComplete="username"
            className="w-full h-12 px-4 border border-white/10 bg-white/[0.04] text-base placeholder-white/25 focus:outline-none focus:border-emerald-400/60 transition-colors" />
        )}
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password (8+ chars)" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="w-full h-12 px-4 border border-white/10 bg-white/[0.04] text-base placeholder-white/25 focus:outline-none focus:border-emerald-400/60 transition-colors" />
        {err && <p className="text-xs font-mono text-red-400">{err}</p>}
        <button onClick={submit} disabled={busy}
          className="w-full h-12 bg-white hover:bg-white/85 disabled:opacity-40 text-black font-mono text-xs tracking-[0.3em] font-bold transition-colors">
          {busy ? 'WORKING…' : mode === 'signup' ? 'INITIALIZE ACCOUNT' : 'ENTER'}
        </button>
        <p className="text-[10px] font-mono text-white/25 leading-relaxed">
          Passwords are PBKDF2-hashed · member records AES-256-GCM encrypted at rest · sessions HMAC-signed.
        </p>
      </div>

      <TierCards current={null} onSelect={(t) => { if (t !== 'free') setErr(`Create/sign-in to your account first, then pay from your dashboard.`); }} />
    </div>
  );
}

/* ================= TIER CARDS ================= */

function TierCards({ current, onSelect }: { current: TierId | null; onSelect: (t: TierId) => void }) {
  return (
    <div className="grid md:grid-cols-3 gap-4 mt-8">
      {(Object.keys(TIERS) as TierId[]).map((id) => {
        const t = TIERS[id];
        const isCurrent = current === id;
        return (
          <div key={id}
            className="border p-5 flex flex-col gap-3 backdrop-blur-sm transition-all hover:-translate-y-0.5"
            style={{
              borderColor: isCurrent ? t.accent : `${t.accent}33`,
              background: `linear-gradient(160deg, ${t.accent}0d, transparent 60%), rgba(0,0,0,0.45)`,
              boxShadow: isCurrent ? `0 0 40px ${t.accent}22` : undefined,
            }}>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs tracking-[0.3em]" style={{ color: t.accent }}>{t.name}</span>
              <span className="text-right">
                <span className="text-xl font-black">${t.priceUSD}</span>
                <span className="block text-[9px] font-mono text-white/30 uppercase">{t.cadence}</span>
              </span>
            </div>
            <p className="text-xs text-white/55 italic">{t.tagline}</p>
            <ul className="space-y-1.5 flex-1">
              {t.benefits.slice(0, 5).map((b) => (
                <li key={b} className="text-[11px] text-white/60 leading-snug pl-3 relative before:content-['▸'] before:absolute before:left-0" style={{ color: undefined }}>{b}</li>
              ))}
            </ul>
            {isCurrent ? (
              <div className="text-center font-mono text-[10px] tracking-widest py-2 border" style={{ borderColor: `${t.accent}44`, color: t.accent }}>CURRENT LEVEL</div>
            ) : (
              <button onClick={() => onSelect(id)}
                className="py-2 font-mono text-[10px] tracking-[0.25em] font-bold transition-colors"
                style={{ backgroundColor: `${t.accent}1a`, color: t.accent, border: `1px solid ${t.accent}44` }}>
                {id === 'free' ? 'SWITCH TO FREE' : `UPGRADE — $${t.priceUSD}`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= DASHBOARD ================= */

function Dashboard({ member, myVotes, token, refresh }: { member: Member; myVotes: Record<string, string>; token: string; refresh: () => void }) {
  const [payTier, setPayTier] = useState<TierId | null>(null);
  const tier = member.tier;

  return (
    <div className="space-y-8">
      {/* identity strip */}
      <div className="border p-6 backdrop-blur-sm"
        style={{ borderColor: `${TIERS[tier].accent}33`, background: `linear-gradient(150deg, ${TIERS[tier].accent}12, rgba(0,0,0,0.4))` }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">OPERATOR CONSOLE</p>
            <h1 className="text-2xl font-black tracking-tight mt-1">{member.handle}<span className="text-white/30 ml-3 font-mono text-xs align-middle">/{TIERS[tier].name}</span></h1>
          </div>
          <div className="flex gap-6 font-mono text-right">
            <div><p className="text-[9px] tracking-[0.25em] text-white/30 uppercase">Credits</p><p className="text-xl font-black" style={{ color: TIERS[tier].accent }}>{member.credits}</p></div>
            <div><p className="text-[9px] tracking-[0.25em] text-white/30 uppercase">Vote Weight</p><p className="text-xl font-black">×{member.weight}</p></div>
            <div><p className="text-[9px] tracking-[0.25em] text-white/30 uppercase">Access</p><p className="text-xl font-black capitalize">{member.pendingTier ? `${member.tier}→${member.pendingTier}` : tier}</p></div>
          </div>
        </div>
        {member.pendingTier && (
          <p className="mt-4 font-mono text-[11px] text-amber-300/80">⏳ {member.pendingTier.toUpperCase()} payment under verification — unlocks automatically.</p>
        )}
      </div>

      {member.tester && (
        <section>
          <SectionTitle>TESTER — TIER OVERRIDE</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {(['free', 'backer', 'pillar'] as TierId[]).map((t) => (
              <button key={t} onClick={() => api('switch_tier', { tier: t }, token).then((d) => d.member && refresh())}
                className={`py-3 font-mono text-[10px] tracking-[0.25em] uppercase border transition-colors ${tier === t ? 'bg-white text-black font-bold border-white' : 'text-white/60 border-white/15 hover:border-white/40 hover:text-white'}`}>
                {TIERS[t].name}
              </button>
            ))}
          </div>
        </section>
      )}

      {!member.pendingTier && tier !== 'pillar' && (
        <section>
          <SectionTitle>MEMBERSHIP</SectionTitle>
          <TierCards current={tier} onSelect={(t) => t !== 'free' && setPayTier(t)} />
        </section>
      )}

      {tier === 'free' && <FreeRoom />}
      {tier === 'backer' && <BackerRoom member={member} myVotes={myVotes} token={token} />}
      {tier === 'pillar' && <PillarRoom member={member} myVotes={myVotes} token={token} />}

      {payTier && (
        <PaymentModal tier={payTier} token={token} onClose={() => setPayTier(null)} onSubmitted={refresh} />
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-[11px] tracking-[0.35em] text-white/40 uppercase mb-4">{children}</h2>;
}

/* ================= ROOMS ================= */

function FreeRoom() {
  const band: Band = 'P50';
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>PUBLIC TELEMETRY</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {['projects_active', 'markets_served'].map((k) => (
            <MetricCard key={k} m={METRICS[k]} band={band} locked={false} />
          ))}
          {['arr_target_y1', 'raise_seed'].map((k) => (
            <MetricCard key={k} m={METRICS[k]} band={band} locked />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>WIP PROJECTS — PUBLIC PREVIEW</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {KANBAN.map((col) => (
            <div key={col.column} className="border border-white/10 bg-white/[0.02] p-3">
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/30 mb-2">{col.column} ({col.items.length})</p>
              {col.items.map((it) => (
                <div key={it} className="font-mono text-[10px] text-white/45 py-1 truncate blur-[3px] hover:blur-none transition-all cursor-default" title="Upgrade to see full boards">{it}</div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>DOCUMENT LIBRARY</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(DOC_LIBRARY).map(([key, d]) => {
            const open = CONTENT_MAP_FREE.has(key);
            return (
              <div key={key} className={`border px-3 py-2.5 ${open ? 'border-white/15 bg-white/[0.03]' : 'border-white/5'}`}>
                <p className="font-mono text-[10px] tracking-widest text-white/70">{d.title}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{open ? d.summary : '🔒 Pillar access'}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const CONTENT_MAP_FREE = new Set(['business-profile', 'products-catalog', 'services-catalog']);

function MetricCard({ m, band, locked }: { m: Banded; band: Band; locked: boolean }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] p-4">
      <p className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">{m.label}</p>
      <p className={`text-2xl font-black mt-1 ${locked ? 'blur-[5px] select-none' : ''}`} style={{ color: locked ? undefined : '#ffffff' }}>
        {fmtMetric(m, band)}
      </p>
      {locked && <p className="font-mono text-[9px] text-white/25 mt-1">🔒 PILLAR</p>}
      {m.note && !locked && <p className="text-[9px] text-white/25 mt-1">{m.note}</p>}
    </div>
  );
}

function BackerRoom({ member, myVotes, token }: { member: Member; myVotes: Record<string, string>; token: string }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const load = () => api('proposals').then(setProposals);
  useEffect(() => { load(); }, []);

  const vote = async (proposalId: string, support: boolean) => {
    await api('vote', { proposalId, support }, token);
    load();
  };
  const propose = async () => {
    if (newTitle.trim().length < 8) return;
    await api('propose', { title: newTitle, desc: newDesc }, token);
    setNewTitle(''); setNewDesc(''); load();
  };

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>CREDITS LEDGER</SectionTitle>
        <div className="border p-5" style={{ borderColor: '#fbbf2433', background: '#fbbf240a' }}>
          <div className="flex items-end justify-between">
            <div><p className="font-mono text-[9px] tracking-[0.25em] text-white/35 uppercase">Platform credits</p>
              <p className="text-4xl font-black text-amber-300">{member.credits}</p></div>
            <p className="text-[10px] text-white/35 max-w-[280px] leading-relaxed">Redeemable against Artifact products, services & compute. Spend requests flow through your account manager.</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>PROJECT KANBANS — LIVE BOARDS</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {KANBAN.map((col) => (
            <div key={col.column} className="border border-amber-300/15 bg-amber-300/[0.03] p-3">
              <p className="font-mono text-[9px] tracking-[0.25em] text-amber-200/60 mb-2">{col.column} ({col.items.length})</p>
              {col.items.map((it) => (
                <div key={it} className="bg-black/40 border border-white/5 px-3 py-2 mb-1.5 font-mono text-[10px] text-white/70 hover:border-amber-300/30 transition-colors">{it}</div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>SOVEREIGN PROPOSALS — TRAINING WHEELS FOR THE TREASURY</SectionTitle>
        <div className="space-y-2">
          {proposals.map((p) => {
            const mine = myVotes[p.id];
            const total = p.yes + p.no;
            const pctYes = total ? Math.round((p.yes / total) * 100) : 0;
            return (
              <div key={p.id} className="border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-white/30">{p.id} · {p.state}{p.closes ? ` · ${p.closes}` : ''}</span>
                  {mine ? (
                    <span className="font-mono text-[9px] text-white/30">YOU VOTED {mine.toUpperCase()}</span>
                  ) : p.state === 'VOTING' && (
                    <div className="flex gap-2">
                      <button onClick={() => vote(p.id, true)} className="px-3 py-1.5 border font-mono text-[10px] bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/25">YAY</button>
                      <button onClick={() => vote(p.id, false)} className="px-3 py-1.5 border font-mono text-[10px] bg-red-400/10 text-red-300 border border-red-400/30 hover:bg-red-400/20">NAY</button>
                    </div>
                  )}
                </div>
                <h4 className="text-sm font-semibold mt-1.5">{p.title}</h4>
                <p className="text-xs text-white/45 mt-0.5">{p.desc}</p>
                {total > 0 && (
                  <div className="mt-2 h-1.5 bg-red-400/20 overflow-hidden">
                    <div className="h-full bg-emerald-400/70" style={{ width: `${pctYes}%` }} />
                  </div>
                )}
                <p className="font-mono text-[9px] text-white/25 mt-1">{p.yes} yay · {p.no} nay{total > 0 ? ` · ${pctYes}% support` : ''}</p>
              </div>
            );
          })}
        </div>
        <div className="border border-white/10 p-4 mt-3 space-y-2">
          <p className="font-mono text-[10px] tracking-widest text-white/40">FILE A NEW PROPOSAL</p>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Proposal title"
            className="w-full h-10 px-3 border border-white/10 bg-white/5 text-sm placeholder-white/25 focus:outline-none focus:border-amber-300/50" />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What & why (optional detail)" rows={2}
            className="w-full px-3 py-2 border border-white/10 bg-white/5 text-sm placeholder-white/25 focus:outline-none focus:border-amber-300/50" />
          <button onClick={propose} className="px-4 py-2 bg-amber-300/15 text-amber-200 border border-amber-300/30 font-mono text-[10px] tracking-widest hover:bg-amber-300/25">SUBMIT FOR DELIBERATION</button>
        </div>
      </section>
    </div>
  );
}

function PillarRoom({ member, myVotes, token }: { member: Member; myVotes: Record<string, string>; token: string }) {
  const [band, setBand] = useState<Band>('P50');
  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>LIVE LEDGER &amp; FINANCIAL MODEL — BANDED</SectionTitle>
          <div className="flex border border-sky-300/30 overflow-hidden font-mono text-[9px] tracking-widest">
            {(['P6', 'P50', 'P75'] as Band[]).map((b) => (
              <button key={b} onClick={() => setBand(b)}
                className={`px-3 py-1.5 transition-colors ${band === b ? 'bg-white text-black font-bold' : 'text-white/50 hover:text-white'}`}>
                {b === 'P6' ? 'CONSERVATIVE' : b === 'P50' ? 'EXPECTED' : 'UPSIDE'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(METRICS).map(([k, m]) => <MetricCard key={k} m={m} band={band} locked={false} />)}
        </div>
        <p className="font-mono text-[9px] text-white/25 mt-2">All figures percentile-banded per disclosure policy. Bands editable in lib/investor-data.ts by IR.</p>
      </section>

      <section>
        <SectionTitle>DOCUMENT VAULT — FULL ACCESS</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(DOC_LIBRARY).map(([key, d]) => (
            <div key={key} className="border border-sky-300/20 bg-sky-300/[0.03] px-3 py-3 hover:border-sky-300/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-widest text-sky-100/90 group-hover:text-sky-50">{d.title}</p>
                <span className="text-sky-300/60 text-xs">↗</span>
              </div>
              <p className="text-[10px] text-white/35 mt-1">{d.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <BackerRoom member={member} myVotes={myVotes} token={token} />
    </div>
  );
}

/* ================= PAYMENT MODAL ================= */

function PaymentModal({ tier, token, onClose, onSubmitted }: { tier: TierId; token: string; onClose: () => void; onSubmitted: () => void }) {
  const t = TIERS[tier as 'backer' | 'pillar'];
  const { address, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [method, setMethod] = useState<'crypto' | 'iban'>('crypto');
  const [reference, setReference] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const usdcPrice = BigInt(Math.round(t.priceUSD * 1_000_000)); // USDC 6dp

  const payUSDC = async () => {
    setBusy(true); setMsg('');
    try {
      const tx = await writeContractAsync({
        address: USDC_BASE,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TREASURY, usdcPrice],
      });
      setReference(tx);
      setMsg('Transaction broadcast — submitting hash for verification…');
      await submitClaim(tx);
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || 'wallet rejected / wrong network — switch to Base and retry');
    }
    setBusy(false);
  };

  const submitClaim = async (ref?: string) => {
    const d = await api('claim_payment', {
      tier, method: ref?.startsWith('0x') ? 'crypto' : method,
      reference: ref ?? reference,
    }, token);
    setMsg(d.ok ? `✓ ${d.message}` : d.error || 'submission failed');
    if (d.ok) setTimeout(onSubmitted, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg border border-white/15 bg-[#050510] p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black">UPGRADE — {t.name}</h3>
            <p className="font-mono text-[10px] text-white/40 uppercase">{t.cadence} · ${t.priceUSD} USD equivalent</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex border border-white/10 overflow-hidden font-mono text-[10px] tracking-widest">
          {(['crypto', 'iban'] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)}
              className={`flex-1 py-2.5 transition-colors ${method === m ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>
              {m === 'crypto' ? 'PAY WITH CRYPTO' : 'PAY WITH IBAN'}
            </button>
          ))}
        </div>

        {method === 'crypto' ? (
          <div className="space-y-3 text-sm">
            <div className="border border-sky-300/25 bg-sky-300/[0.05] p-4 space-y-2 font-mono text-[11px]">
              <p className="text-white/50">NETWORK: <span className="text-sky-200">{PAYMENT.crypto.network}</span></p>
              <p className="break-all text-white/80">ADDRESS: <span className="select-all text-sky-200">{PAYMENT.crypto.evmAddress}</span></p>
              <p className="text-white/50">BASE NAME: <span className="text-sky-200">{PAYMENT.crypto.ensBase}</span></p>
              <p className="text-white/50">AMOUNT: <span className="text-sky-200">${t.priceUSD} in ETH/USDC at spot</span></p>
            </div>
            {address ? (
              <>
                <button onClick={payUSDC} disabled={busy}
                  className="w-full h-11 bg-white hover:bg-white/85 disabled:opacity-40 text-black font-mono text-[11px] font-bold tracking-[0.2em] transition-colors">
                  {busy ? 'BROADCASTING…' : `ONE-CLICK PAY $${t.priceUSD} USDC (BASE)`}
                </button>
                <p className="text-center font-mono text-[9px] text-white/30">connected: {address.slice(0, 8)}…{address.slice(-6)} · chain {chain?.id}</p>
              </>
            ) : (
              <p className="text-center font-mono text-[10px] text-white/35">Use CONNECT_WALLET on the exchange home to enable one-click USDC — or pay manually from any wallet/exchange below.</p>
            )}
          </div>
        ) : (
          <div className="border border-amber-300/25 bg-amber-300/[0.05] p-4 space-y-2 font-mono text-[11px]">
            <p className="text-white/50">IBAN: <span className="select-all text-amber-200">{PAYMENT.iban.iban}</span></p>
            <p className="text-white/50">AMOUNT: <span className="text-amber-200">${t.priceUSD}</span> · memo: your email handle</p>
            <p className="text-white/30 text-[10px]">{PAYMENT.iban.note}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Verification reference (tx hash / wire ref)</label>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="0x… or bank reference"
            className="w-full h-11 px-4 border border-white/10 bg-white/5 text-sm font-mono placeholder-white/25 focus:outline-none focus:border-sky-300/50" />
          <button onClick={() => submitClaim()} disabled={!reference.trim() || busy}
            className="w-full h-11 border border-emerald-400/40 bg-emerald-400/15 text-emerald-200 font-mono text-[11px] tracking-[0.2em] hover:bg-emerald-400/25 disabled:opacity-40 transition-colors">
            SUBMIT FOR VERIFICATION
          </button>
          {msg && <p className="text-xs font-mono text-center pt-1 text-white/70">{msg}</p>}
          <p className="text-[9px] font-mono text-white/25 text-center leading-relaxed">
            Verification is human-reviewed (anti-fraud) — typically &lt;24h. Your dashboard unlocks automatically on approval.
          </p>
        </div>
      </div>
    </div>
  );
}
