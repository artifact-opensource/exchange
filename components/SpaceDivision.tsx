import React from 'react';

/**
 * AV/ST — Space Technology Division
 * Beyond the horizon. Engineering orbital infrastructure and interplanetary systems.
 */

const sections = [
  {
    id: 'infra',
    num: '01',
    title: 'ORBITAL INFRASTRUCTURE',
    desc: 'Engineering the backbone of space: ground stations, satellite buses, propulsion systems, and mission control architecture. Every mission starts with the bus — standardised platforms, radiation-tolerant computing, and autonomous ADCS.',
    tags: ['SATELLITE ENGINEERING', 'GROUND SEGMENT', 'PROPULSION'],
  },
  {
    id: 'interplanetary',
    num: '02',
    title: 'INTERPLANETARY SYSTEMS',
    desc: 'Moving beyond Earth orbit. Hohmann transfers, electric propulsion tugs, escape-velocity cargo, and sustained presence beyond LEO. Not sci-fi — orbital mechanics is just physics with budgets.',
    tags: ['DEEP SPACE', 'ELECTRIC PROPULSION', 'HOHMANN TRANSFERS'],
  },
  {
    id: 'foundry',
    num: '03',
    title: 'FOUNDRY — PUBLIC BUILD',
    desc: 'Three open missions in progress: open ground station hardware, a generalised n-body engine (live simulation core), and a feasibility study on radiation-tolerant edge-AI payloads for orbit. Join through the board channel.',
    tags: ['M-01 OPEN GROUND STATION', 'M-02 ORBIT SIM CORE', 'M-03 EDGE PAYLOAD'],
  },
  {
    id: 'capabilities',
    num: '04',
    title: 'CAPABILITY MATRIX',
    desc: 'What the division can deliver today: orbital mechanics consulting, ground-station design, satellite bus review, mission planning (Δv budgets + timelines), and payload feasibility studies. Enterprise contracts start at $25,000/mo; PKR 6,950,000/mo domestic.',
    tags: ['CONSULTING', 'DESIGN REVIEW', 'MISSION PLANNING'],
  },
];

const metrics = [
  { label: 'ORBITAL CLASSES', value: 'LEO · GTO · ESCAPE' },
  { label: 'PROPULSION TYPES', value: 'CHEMICAL · ELECTRIC · HYBRID' },
  { label: 'ACTIVE MISSIONS', value: '4' },
  { label: 'FOUNDRY STATUS', value: 'RESEARCH · BUILD · LIVE' },
];

export default function SpaceDivision() {
  return (
    <div className="w-full h-full overflow-y-auto px-6 md:px-12 py-8">
      <div className="max-w-6xl w-full space-y-12">

        {/* Metrics strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="border border-white/10 bg-white/[0.015] p-4">
              <p className="font-mono text-[8px] tracking-[0.2em] text-white/25 uppercase">{m.label}</p>
              <p className="font-mono text-sm md:text-base text-white mt-2">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s.id} className="border border-white/10 bg-white/[0.015] hover:border-white/25 hover:bg-white/[0.03] transition-all">
              <div className="p-5 md:p-6">
                <div className="flex items-start gap-4 mb-3">
                  <span className="font-mono text-[9px] text-white/20 tracking-widest mt-1">{s.num}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-extralight text-white tracking-tight leading-tight">{s.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {s.tags.map((t) => (
                        <span key={t} className="font-mono text-[7px] tracking-[0.2em] uppercase text-white/20 px-2 py-0.5 border border-white/5">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] md:text-xs text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="font-mono text-[8px] text-white/20 tracking-widest uppercase">ARTIFACT VIRTUAL / ST / SPACE TECHNOLOGY / 2026</p>
      </div>
    </div>
  );
}
