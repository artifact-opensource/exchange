import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * ORBITAL_OPS // Space Tech Division
 * Educate → Build in public → Build together.
 *
 * SANDBOX  : real n-body-lite gravity sim — drag from the planet to launch a
 *            satellite, watch Kepler's laws emerge live. Presets teach LEO,
 *            GTO and escape velocity.
 * ACADEMY  : four learning tracks with expandable lessons.
 * FOUNDRY  : the division's public build board — live missions, statuses,
 *            and how to join the work.
 */

const G = 9000;          // gravitational constant (sim units)
const PLANET_MASS = 220;
const TRAIL_LEN = 90;

interface Sat {
  x: number; y: number; vx: number; vy: number;
  trail: { x: number; y: number }[];
  dead: boolean; color: string; id: number;
}

type View = 'sandbox' | 'academy' | 'foundry';

const ACADEMY_TRACKS = [
  {
    id: 'orbital',
    title: 'ORBITAL_MECHANICS',
    level: 'START HERE',
    color: '#22d3ee',
    lessons: [
      ['Why things orbit', 'An orbit is perpetual free-fall. Forward speed bends your fall around the planet — miss the ground forever and you are in space.'],
      ['Δv — the only currency', 'Every manoeuvre costs delta-v. Budget it like cash: LEO ≈ 9.4 km/s from ground, GEO ≈ 13.1 km/s total incl. plane changes.'],
      ['Hohmann transfers', 'The cheapest ride between two circular orbits: two burns, half an ellipse. Try preset GTO in the sandbox and watch the ellipse kiss both rings.'],
      ['Kepler in practice', 'Equal areas in equal times — satellites sprint at perigee, coast at apogee. Speed is altitude trade, always.'],
    ],
  },
  {
    id: 'propulsion',
    title: 'PROPULSION_SYSTEMS',
    level: 'TIER II',
    color: '#a78bfa',
    lessons: [
      ['The rocket equation', 'Δv = Isp·g₀·ln(m₀/mf). Exponential cruelty: every extra Δv costs exponentially more mass. This equation designs every mission.'],
      ['Electric propulsion', 'Ion/Hall thrusters trade thrust for efficiency (Isp 1500–4000s). Slow but cheap — ideal for station-keeping and deep-space cargo tugs.'],
      ['Staged combustion', 'Why modern engines pre-burn fuel: recover energy that open-cycle engines throw away. Full-flow staged combustion is the current frontier.'],
    ],
  },
  {
    id: 'satellite',
    title: 'SATELLITE_ENGINEERING',
    level: 'TIER II',
    color: '#34d399',
    lessons: [
      ['Bus vs payload', 'The bus keeps you alive (power, thermal, ADCS, comms); the payload does the mission. SmallSat revolution = standardised buses.'],
      ['Power budget', 'Solar ≈ 300 W/m² usable at 1 AU. Every watt is fought for between payload, heaters, and radios. Eclipse batteries set your worst case.'],
      ['ADCS', 'Attitude control without touching anything: reaction wheels + magnetorquers + star trackers. Point a laser at a coin from 3 km — that is the job.'],
    ],
  },
  {
    id: 'ground',
    title: 'GROUND_SEGMENT_OPS',
    level: 'TIER III',
    color: '#fbbf24',
    lessons: [
      ['Ground stations', 'Your satellite is only as useful as its downlink passes. 8–12 min per LEO pass; automate everything.'],
      ['Link budget', 'Frequency band, gain, distance, noise. Ka-band buys bandwidth, pays in rain fade.'],
      ['Conjunction ops', 'Space is getting crowded. Screening + avoidance burns are routine ops, not edge cases. Sustainability is an engineering requirement.'],
    ],
  },
];

const FOUNDRY_MISSIONS = [
  {
    id: 'M-01', name: 'OPEN_GROUND_STATION', status: 'ACTIVE BUILD',
    desc: 'Low-cost RTL-SDR/Lora ground terminal for satellite telemetry reception. Open hardware specs, firmware, and scheduling layer.',
    stack: ['C++', 'RTL-SDR', 'LoRa'], seek: ['RF engineers', 'Firmware devs'],
  },
  {
    id: 'M-02', name: 'ORBIT_SIM_CORE', status: 'LIVE',
    desc: 'The simulation powering this very sandbox. Being generalised into an educational n-body engine with real J2 perturbation.',
    stack: ['TypeScript', 'Canvas'], seek: ['Physics nerds', 'Educators'],
  },
  {
    id: 'M-03', name: 'EDGE_ORBIT_PAYLOAD', status: 'RESEARCH',
    desc: 'Feasibility study: radiation-tolerant edge-AI payload for on-orbit inference. Literature review + parts long-list in progress.',
    stack: ['Research'], seek: ['Systems engineers', 'Radiation effects'],
  },
  {
    id: 'M-04', name: 'MISSION_CONTROL_DASH', status: 'PLANNED',
    desc: 'Open mission-control dashboard for class-A classroom satellites: pass prediction, decode, and telemetry viz.',
    stack: ['TypeScript', 'React'], seek: ['Frontend devs', 'UI designers'],
  },
];

const STATUS_COLORS: Record<string, string> = {
  'ACTIVE BUILD': '#fbbf24',
  'LIVE': '#34d399',
  'RESEARCH': '#22d3ee',
  'PLANNED': '#8b8b9e',
};

const PRESETS = [
  { name: 'LEO', label: 'LOW EARTH ORBIT', dv: 118 },
  { name: 'GTO', label: 'TRANSFER ELLIPSE', dv: 148 },
  { name: 'ESCAPE', label: 'ESCAPE VELOCITY', dv: 196 },
];

export default function SpaceDivision() {
  const [view, setView] = useState<View>('sandbox');
  return (
    <div className="w-full">
      {/* Division header strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 font-mono text-[10px] tracking-[0.3em] text-white/30 uppercase">
        <span className="text-cyan-300/70">◆ ORBITAL_OPS</span>
        <span>Educate → Build in public → Build together</span>
        <button
          onClick={() => setView('sandbox')}
          className={`px-3 py-1 rounded-full border transition-colors ${view === 'sandbox' ? 'border-cyan-300/60 text-cyan-200' : 'border-white/10 text-white/40 hover:text-white'}`}
        >SANDBOX</button>
        <button
          onClick={() => setView('academy')}
          className={`px-3 py-1 rounded-full border transition-colors ${view === 'academy' ? 'border-cyan-300/60 text-cyan-200' : 'border-white/10 text-white/40 hover:text-white'}`}
        >ACADEMY</button>
        <button
          onClick={() => setView('foundry')}
          className={`px-3 py-1 rounded-full border transition-colors ${view === 'foundry' ? 'border-cyan-300/60 text-cyan-200' : 'border-white/10 text-white/40 hover:text-white'}`}
        >FOUNDRY</button>
      </div>

      {view === 'sandbox' && <OrbitalSandbox />}
      {view === 'academy' && <Academy />}
      {view === 'foundry' && <Foundry />}
    </div>
  );
}

/* ================= SANDBOX ================= */

function OrbitalSandbox() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const satsRef = useRef<Sat[]>([]);
  const dragRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const sizeRef = useRef({ w: 800, h: 520 });
  const idRef = useRef(0);
  const [launchCount, setLaunchCount] = useState(0);
  const [hint, setHint] = useState('DRAG FROM THE PLANET TO LAUNCH — release further for more speed');

  // Responsive sizing
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0) sizeRef.current = { w: Math.floor(r.width), h: Math.max(360, Math.floor(r.height)) };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const launch = useCallback((vx: number, vy: number, color?: string) => {
    const { w, h } = sizeRef.current;
    satsRef.current.push({
      x: w / 2, y: h / 2, vx, vy,
      trail: [], dead: false,
      color: color || `hsl(${190 + Math.random() * 80}, 90%, 65%)`,
      id: ++idRef.current,
    });
    setLaunchCount((c) => c + 1);
  }, []);

  const applyPreset = useCallback((dv: number) => {
    launch(dv, -dv * 0.35);
    setHint(dv >= 196
      ? 'ESCAPE — watch it leave the system forever. That is escape velocity.'
      : dv >= 148
        ? 'TRANSFER ELLIPSE — an elliptical orbit kissing far distances. Hohmann rides look like this.'
        : 'LOW ORBIT — circular-ish path. Too slow and it dives; too fast and it stretches.');
  }, [launch]);

  // Physics + render loop
  useEffect(() => {
    const canvas = cvRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let running = true;

    const loop = () => {
      if (!running) return;
      const { w, h } = sizeRef.current;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // starfield backdrop
      ctx.fillStyle = '#020208';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 60; i++) {
        const sx = (i * 97.31) % w, sy = (i * 57.77) % h;
        ctx.fillRect(sx, sy, 1, 1);
      }

      const cx = w / 2, cy = h / 2;

      // planet glow
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60);
      grad.addColorStop(0, 'rgba(56,189,248,0.5)');
      grad.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - 60, cy - 60, 120, 120);
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // reference rings
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      [110, 180, 260].forEach((r) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      });

      // physics
      for (const s of satsRef.current) {
        if (s.dead) continue;
        const dx = cx - s.x, dy = cy - s.y;
        const r2 = dx * dx + dy * dy;
        const r = Math.sqrt(r2) || 1;
        const a = G * PLANET_MASS / r2;
        s.vx += (dx / r) * a * 0.016;
        s.vy += (dy / r) * a * 0.016;
        s.x += s.vx * 1.6;
        s.y += s.vy * 1.6;

        if (r < 16) s.dead = true;                       // crashed
        if (s.x < -200 || s.x > w + 200 || s.y < -200 || s.y > h + 200) s.dead = true; // escaped

        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > TRAIL_LEN) s.trail.shift();

        // trail
        ctx.beginPath();
        for (let i = 0; i < s.trail.length; i++) {
          const p = s.trail[i];
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = s.color.replace(')', ',0.5)').replace('hsl(', 'hsla(');
        ctx.lineWidth = 1;
        ctx.stroke();

        // satellite
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }
      satsRef.current = satsRef.current.filter((s) => !s.dead).slice(-14);

      // drag vector visualisation
      const d = dragRef.current;
      if (d) {
        ctx.beginPath();
        ctx.moveTo(d.x0, d.y0);
        ctx.lineTo(d.x1, d.y1);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(d.x1, d.y1, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, []);

  const pointerPos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = cvRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = pointerPos(e);
    dragRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const p = pointerPos(e);
    dragRef.current.x1 = p.x; dragRef.current.y1 = p.y;
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    // launch velocity = pull vector scaled down; launch from planet center regardless of grab point
    const vx = (d.x1 - d.x0) * 0.55;
    const vy = (d.y1 - d.y0) * 0.55;
    launch(vx, vy);
    setHint(vx * vx + vy * vy < 10000
      ? 'Suborbital — it fell back. Pull longer for more Δv.'
      : vx * vx + vy * vy > 42000
        ? 'Escaped the system — that is hyperbolic territory.'
        : 'In orbit! Circularise by pulling exactly perpendicular to where you want to go.');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => applyPreset(p.dv)}
            className="px-3 py-1.5 rounded-lg border border-cyan-300/30 bg-cyan-300/5 hover:bg-cyan-300/15 transition-colors font-mono text-[10px] tracking-widest text-cyan-100/80"
            title={p.label}
          >
            ▶ {p.name}
          </button>
        ))}
        <button
          onClick={() => { satsRef.current = []; }}
          className="px-3 py-1.5 rounded-lg border border-white/10 font-mono text-[10px] tracking-widest text-white/40 hover:text-white transition-colors"
        >
          ⟲ CLEAR
        </button>
        <span className="font-mono text-[10px] text-white/30 ml-auto">{launchCount} launched · {G}·{PLANET_MASS} sim-G</span>
      </div>

      <div ref={canvasRef} className="relative w-full" style={{ height: 'min(62vh, 540px)' }}>
        <canvas
          ref={cvRef}
          style={{ width: sizeRef.current.w, height: sizeRef.current.h }}
          className="block w-full h-full rounded-xl border border-white/10 bg-[#020208] touch-none cursor-crosshair select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      <p className="font-mono text-[11px] text-white/50 leading-relaxed">
        <span className="text-cyan-300/80">◈</span> {hint}
      </p>
    </div>
  );
}

/* ================= ACADEMY ================= */

function Academy() {
  const [openTrack, setOpenTrack] = useState<string>('orbital');
  const [done, setDone] = useState<Set<string>>(new Set());

  const toggleLesson = (key: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const totalLessons = ACADEMY_TRACKS.reduce((n, t) => n + t.lessons.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-white/30 uppercase">
        <span>Curriculum · self-paced · zero prerequisites</span>
        <span className="text-cyan-300/70">{done.size}/{totalLessons} completed</span>
      </div>

      {ACADEMY_TRACKS.map((track) => {
        const isOpen = openTrack === track.id;
        const trackDone = track.lessons.filter(([t]) => done.has(`${track.id}:${t}`)).length;
        return (
          <div key={track.id} className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <button
              onClick={() => setOpenTrack(isOpen ? '' : track.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
            >
              <span className="w-1.5 h-8 rounded-full" style={{ backgroundColor: track.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs tracking-[0.2em] text-white/90">{track.title}</div>
                <div className="font-mono text-[9px] text-white/30 mt-0.5">{track.level} · {track.lessons.length} lessons · {trackDone} done</div>
              </div>
              <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden shrink-0">
                <div className="h-full transition-all duration-500" style={{ width: `${(trackDone / track.lessons.length) * 100}%`, backgroundColor: track.color }} />
              </div>
              <span className="text-white/30 font-mono text-xs ml-2">{isOpen ? '−' : '+'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-white/5 divide-y divide-white/5">
                {track.lessons.map(([title, body]) => {
                  const key = `${track.id}:${title}`;
                  const isDone = done.has(key);
                  return (
                    <div key={key} className="flex items-start gap-3 px-5 py-3">
                      <button
                        onClick={() => toggleLesson(key)}
                        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                        className="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          borderColor: isDone ? track.color : 'rgba(255,255,255,0.25)',
                          backgroundColor: isDone ? track.color : 'transparent',
                        }}
                      >
                        {isDone && (
                          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-black"><path d="M1 5l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                        )}
                      </button>
                      <div className="min-w-0">
                        <h4 className={`font-mono text-xs ${isDone ? 'text-white/40 line-through' : 'text-white/85'}`}>{title}</h4>
                        <p className="text-xs text-white/45 leading-relaxed mt-1">{body}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="px-5 py-3 font-mono text-[10px] text-white/25">
                  ▸ Practice every concept live in the SANDBOX tab — theory sticks when you can crash things safely.
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= FOUNDRY ================= */

function Foundry() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] px-5 py-4">
        <p className="font-mono text-[11px] text-cyan-100/70 leading-relaxed">
          ◆ THE FOUNDRY PACT — everything below is built in public: specs, code, failures and all.
          Pick a mission that matches your skills, jump into the repo, and your handle lands in the
          changelog. No gatekeepers, just work.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FOUNDRY_MISSIONS.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-2 hover:border-white/25 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-white/30">{m.id}</span>
              <span
                className="px-2 py-0.5 rounded-full font-mono text-[9px] tracking-widest border"
                style={{ color: STATUS_COLORS[m.status], borderColor: STATUS_COLORS[m.status] + '55', backgroundColor: STATUS_COLORS[m.status] + '11' }}
              >
                ● {m.status}
              </span>
            </div>
            <h4 className="font-mono text-sm tracking-[0.15em] text-white/90">{m.name}</h4>
            <p className="text-xs text-white/50 leading-relaxed flex-1">{m.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {m.stack.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px] text-white/50">{s}</span>
              ))}
            </div>
            <div className="font-mono text-[10px] text-white/35 pt-1 border-t border-white/5">
              SEEKING: <span className="text-white/60">{m.seek.join(' · ')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <a
          href="https://github.com/artifact-opensource"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-white text-black font-mono text-[11px] tracking-widest hover:bg-white/85 transition-colors"
        >
          ⬡ JOIN THE BUILD — OPEN REPOS
        </a>
        <span className="font-mono text-[10px] text-white/30">Contributions land in the public changelog. Credit follows work.</span>
      </div>
    </div>
  );
}
