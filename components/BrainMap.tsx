'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { IndexedResearchItem } from '@/lib/research-index';

interface BrainMapProps {
  items: IndexedResearchItem[];
  onNodeClick: (item: IndexedResearchItem) => void;
  selectedId?: string | null;
}

/* === REAL BRAIN LOBES — regions mapped to anatomy === */
interface RegionDef {
  id: string;
  name: string;
  cx: number;
  cy: number;
  color: string;
  desc: string;
  categories: string[];
}

const REGIONS: RegionDef[] = [
  { id: 'frontal',  name: 'FRONTAL LOBE',     cx: 0.30, cy: 0.32, color: '#fb923c', desc: 'Executive / reasoning / planning', categories: ['AI/ML','Transformers/Architecture'] },
  { id: 'parietal', name: 'PARIETAL LOBE',    cx: 0.60, cy: 0.30, color: '#06b6d4', desc: 'Spatial / integration / data', categories: ['Tokenomics','Security'] },
  { id: 'temporal', name: 'TEMPORAL LOBE',    cx: 0.25, cy: 0.62, color: '#9333ea', desc: 'Memory / awareness / philosophy', categories: ['Consciousness/Philosophy'] },
  { id: 'occipital',name: 'OCCIPITAL LOBE',   cx: 0.72, cy: 0.58, color: '#10b981', desc: 'Visual / perception / pattern', categories: ['Security'] },
  { id: 'limbic',   name: 'LIMBIC SYSTEM',    cx: 0.48, cy: 0.72, color: '#ec4899', desc: 'Emotion / governance / identity', categories: ['Blockchain/Governance'] },
  { id: 'brainstem',name: 'BRAINSTEM',        cx: 0.50, cy: 0.88, color: '#6b7280', desc: 'Core / basal / reflex', categories: ['Uncategorized'] },
];

const CATEGORY_MAP: Record<string,string> = {};
REGIONS.forEach(r => r.categories.forEach(c => CATEGORY_MAP[c] = r.id));

export default function BrainMap({ items, onNodeClick, selectedId }: BrainMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 580 });
  const [hover, setHover] = useState<{node:any; mx:number; my:number} | null>(null);
  const [t, setT] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      if (r.width > 260 && r.height > 200) setDims({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let id = 0;
    const tick = () => { setT(x => x + 1); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const nodes = useMemo(() => {
    const minDim = Math.min(dims.w, dims.h);
    return items.map((item, i) => {
      const rid = CATEGORY_MAP[item.category] ?? 'brainstem';
      const reg = REGIONS.find(r => r.id === rid) ?? REGIONS[REGIONS.length - 1];
      const a = (i / Math.max(items.length, 1)) * Math.PI * 1.7; 
      const d = (0.12 + (item.importance / 10) * 0.18) * minDim * 0.55;
      const cx = reg.cx * dims.w + Math.cos(a) * d * 0.7;
      const cy = reg.cy * dims.h + Math.sin(a) * d * 0.7;
      return { item, x: cx, y: cy, r: Math.max(7, 6 + item.importance * 1.3), reg, pulse: i * 0.7 };
    });
  }, [items, dims]);

  const regionCounts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach(i => { const rid = CATEGORY_MAP[i.category] ?? 'brainstem'; c[rid] = (c[rid] || 0) + 1; });
    return c;
  }, [items]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let closest: any = null;
    for (const n of nodes) { const dx = mx - n.x, dy = my - n.y, dist = Math.sqrt(dx*dx+dy*dy); if (dist <= n.r + 6) closest = n; }
    if (closest) setHover({ node: closest, mx, my }); else setHover(null);
  }, [nodes]);

  return (
    <div ref={wrapRef} className="relative w-full h-full bg-gradient-to-b from-[#050b1a] via-[#09142a] to-[#0a1525] overflow-hidden flex flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10 backdrop-blur-sm z-10 shrink-0">
        <div>
          <h2 className="text-sm font-mono font-bold text-white tracking-widest">BRAIN MAP — RESEARCH CORTEX</h2>
          <p className="text-[10px] text-white/40 font-mono">{items.length} nodes · 6 lobe regions · click to open paper</p>
        </div>
        <div className="flex gap-3 text-[10px] text-white/30 font-mono">
          <span>FRONTAL <span className="text-orange-400">{regionCounts['frontal']||0}</span></span>
          <span>TEMPORAL <span className="text-purple-400">{regionCounts['temporal']||0}</span></span>
          <span>PARIETAL <span className="text-cyan-400">{regionCounts['parietal']||0}</span></span>
        </div>
      </div>

      <svg
        width={dims.w}
        height={dims.h - 40}
        className="w-full flex-1"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        style={{ cursor: 'pointer', background: 'radial-gradient(ellipse at 50% 45%, rgba(30,50,80,0.4), rgba(5,10,30,0.9))' }}
        viewBox={`0 0 ${dims.w} ${dims.h - 40}`}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Actual brain outline — two hemispheres with corpus callosum */}
        <g fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5}>
          {/* Left hemisphere */}
          <ellipse cx={dims.w*0.36} cy={dims.h*0.48} rx={dims.w*0.16} ry={dims.h*0.22} />
          {/* Right hemisphere */}
          <ellipse cx={dims.w*0.64} cy={dims.h*0.48} rx={dims.w*0.16} ry={dims.h*0.22} />
          {/* Corpus callosum bridge */}
          <path d={`M ${dims.w*0.46} ${dims.h*0.42} Q ${dims.w*0.50} ${dims.h*0.38} ${dims.w*0.54} ${dims.h*0.42} Q ${dims.w*0.50} ${dims.h*0.46} ${dims.w*0.46} ${dims.h*0.42} Z`} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" />
          {/* Cerebellum (lower back) */}
          <ellipse cx={dims.w*0.50} cy={dims.h*0.78} rx={dims.w*0.08} ry={dims.h*0.06} />
        </g>

        {/* Region zones (soft filled areas inside brain) */}
        {REGIONS.map(r => {
          const cx = r.cx * dims.w;
          const cy = r.cy * dims.h;
          return (
            <g key={r.id}>
              {/* Soft zone */}
              <ellipse cx={cx} cy={cy} rx={dims.w*0.16} ry={dims.h*0.17} fill={r.color} fillOpacity={0.06} stroke={r.color} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
              {/* Region label inside */}
              <text x={cx} y={cy-6} textAnchor="middle" dominantBaseline="middle" fill={r.color} fontSize={Math.max(9, dims.h*0.022)} fontFamily="monospace" fontWeight="bold" letterSpacing={1} opacity={0.85}>{r.name}</text>
              <text x={cx} y={cy+10} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.35)" fontSize={Math.max(7, dims.h*0.015)} fontFamily="monospace">{(regionCounts[r.id]||0)} papers</text>
            </g>
          );
        })}

        {/* Connections — simple radial from corpus callosum */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth={0.5}>
          {REGIONS.map(r1 => REGIONS.map(r2 => {
            if (r1.id >= r2.id) return null;
            return <line key={`${r1.id}-${r2.id}`} x1={r1.cx*dims.w} y1={r1.cy*dims.h} x2={r2.cx*dims.w} y2={r2.cy*dims.h} />;
          })).flat()}
        </g>

        {/* Nodes */}
        {nodes.map(node => {
          const isSelected = node.item.id === selectedId;
          const isHover = hover?.node?.item?.id === node.item.id;
          const pulse = Math.sin(t * 0.08 + node.pulse) * 0.3 + 0.7;
          const r = isHover ? node.r * 1.4 : node.r * pulse;
          return (
            <g key={node.item.id} onClick={() => onNodeClick(node.item)}>
              <circle cx={node.x} cy={node.y} r={r + 3} fill="none" stroke={node.reg.color} strokeWidth={isSelected ? 2 : 0.5} strokeOpacity={isHover ? 0.9 : 0.25} filter="url(#glow)" />
              <circle cx={node.x} cy={node.y} r={r} fill={node.reg.color} fillOpacity={isHover ? 1 : isSelected ? 0.95 : 0.55} stroke={isSelected ? '#fff' : 'transparent'} strokeWidth={1.5} />
            </g>
          );
        })}

        {/* Tooltip on hover */}
        {hover && (
          <foreignObject x={Math.min(hover.mx + 14, dims.w - 260)} y={Math.max(hover.my - 60, 4)} width={240} height={72} style={{ overflow:'visible', pointerEvents:'none' }}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{background:'rgba(5,5,12,0.95)', border:`1px solid ${hover.node.reg.color}60`, borderRadius:8, padding:'8px 10px', fontFamily:'monospace', fontSize:11, color:'#fff'}}>
              <div style={{color:hover.node.reg.color, fontWeight:'bold', fontSize:9, letterSpacing:0.1, textTransform:'uppercase', marginBottom:3}}>{hover.node.reg.name}</div>
              <div style={{fontWeight:'bold', fontSize:13, lineHeight:1.25, marginBottom:3}}>{hover.node.item.title.length > 50 ? hover.node.item.title.slice(0,50)+'…' : hover.node.item.title}</div>
              <div style={{color:'#999', fontSize:9}}>{hover.node.item.source || 'registry'} · {hover.node.item.category}</div>
              <div style={{color:'#777', fontSize:9, marginTop:2}}>{hover.node.item.cid ? `CID: ${hover.node.item.cid.slice(0,28)}…` : `Local`}</div>
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Bottom legend — real brain anatomy labels */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 z-10 justify-center">
        {REGIONS.map(r => (
          <button key={r.id} onClick={() => {}} className="flex items-center gap-1.5 px-2 py-1 bg-black/60 border border-white/10 rounded text-[10px] font-mono backdrop-blur-sm hover:border-white/30 transition-colors" style={{borderLeft: `3px solid ${r.color}`}}>
            <span style={{color:r.color, fontWeight:'bold'}}>{r.name}</span>
            <span className="text-white/40">({regionCounts[r.id]||0})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
