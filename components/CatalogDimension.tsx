import React from 'react';

const CatalogDimension: React.FC = () => {
  const services = [
    { cat: "AI / LLM", svc: "av-api, av-mcp, av-vector, Hermes-Gateway, SYMBIOTE, SPORE", ref: "SVC-001→014" },
    { cat: "COMPUTE", svc: "Cloudflare Tunnels, Vercel, VPS Vietnam, PostgreSQL, Redis", ref: "SVC-017→027" },
    { cat: "TRADING", svc: "Symbiote Gateway, AV-Exchange, Blackbox, Oracle-Canary", ref: "SVC-009" },
    { cat: "ENTERPRISE", svc: "COMB, ERP, Treasury, Smart-contracts, Audit-Logger", ref: "SVC-030→034" },
    { cat: "HOSPITALITY", svc: "GDI, MQTT, VRP/HRP, Tour platforms", ref: "PROD-034→035" },
    { cat: "SECURITY", svc: "Blackbox, Obelisk, Audit-Logger, Oracle-Canary", ref: "SVC-030→034" },
  ];

  const tiers = [
    { name: "AGENT CORE", price: "$1,750/mo", pkg: "av-api + av-vector + av-mcp + Hermes-Gateway", pkr: "PKR 486,500/mo" },
    { name: "TRADING STACK", price: "$2,500/mo", pkg: "Symbiote + Blackbox + Audit-Logger + Oracle-Canary", pkr: "PKR 695,000/mo" },
    { name: "HOSPITALITY", price: "$1,050/mo", pkg: "GDI + MQTT + Audit + Cloudflare + VPS", pkr: "PKR 291,900/mo" },
    { name: "ENTERPRISE FULL", price: "$25,000/mo", pkg: "All 34 services, custom SLA", pkr: "PKR 6,950,000/mo" },
  ];

  return (
    <div className="w-full h-full flex items-center overflow-y-auto px-6 md:px-12 py-16">
      <div className="max-w-6xl w-full space-y-10">
        {/* Service categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((s) => (
            <div key={s.cat} className="border border-white/10 bg-white/[0.02] p-4 hover:border-white/25 hover:bg-white/[0.04] transition-all group">
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/40 uppercase mb-2">{s.cat}</p>
              <p className="text-[11px] text-white/60 leading-relaxed">{s.svc}</p>
              <p className="font-mono text-[8px] text-white/20 mt-2">{s.ref}</p>
            </div>
          ))}
        </div>

        {/* Pricing tiers */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-4">03 / PRICING TIERS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tiers.map((t) => (
              <div key={t.name} className="border border-white/10 bg-white/[0.02] p-4">
                <p className="font-mono text-[8px] tracking-[0.2em] text-white/40 uppercase mb-2">{t.name}</p>
                <p className="font-mono text-lg text-white font-bold">{t.price}</p>
                <p className="text-[9px] text-white/40 mt-1 leading-relaxed">{t.pkg}</p>
                <p className="font-mono text-[8px] text-white/20 mt-1">{t.pkr}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Audit CTA */}
        <div className="border border-white/10 bg-white/[0.015] p-6 max-w-2xl">
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-3">04 / AUDIT REQUIRED</p>
          <p className="text-white/50 text-xs leading-relaxed">Every project requires independent audit before budget commitment. Submit: scope doc, budget framework, risk matrix, stakeholder sign-off, delivery timeline.</p>
          <a href="mailto:ali.shakil@artifactvirtual.com?subject=Artifact%20Virtual%20Audit%20Request" className="inline-block mt-4 px-6 py-2 border border-white/25 text-white/80 font-mono text-[10px] tracking-widest uppercase hover:bg-white/10 hover:border-white/50 transition-all">
            EMAIL ALI →
          </a>
        </div>

        <p className="font-mono text-[8px] text-white/20 tracking-widest uppercase">ARTIFACT VIRTUAL / MAYA CHEN / CATALOGUE / 2026</p>
      </div>
    </div>
  );
};

export default CatalogDimension;
