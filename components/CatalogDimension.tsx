import React from 'react';

const CatalogDimension: React.FC = () => {
  const domains = [
    { num: "01", title: "AI / LLM", items: ["av-api", "av-mcp", "av-vector", "Hermes-Gateway", "SYMBIOTE", "SPORE"], refs: "SVC-001 → SVC-014", status: "R&D + LIVE" },
    { num: "02", title: "COMPUTE / INFRA", items: ["Cloudflare Tunnels (12+ sites)", "Vercel", "VPS Vietnam", "PostgreSQL / Redis", "Colocation, CDNs"], refs: "SVC-017 → SVC-027", status: "LIVE + PIPELINE" },
    { num: "03", title: "TRADING / QUANT", items: ["Symbiote Gateway", "AV-Exchange (crypto)", "Blackbox", "Oracle-Canary", "Treasury routing"], refs: "SVC-009", status: "LIVE" },
    { num: "04", title: "ENTERPRISE / GOVERNANCE", items: ["COMB mechanism", "ERP integrations", "AV-Treasury", "Smart-contract governance", "Audit-Logger"], refs: "SVC-030 → SVC-034", status: "LIVE" },
    { num: "05", title: "HOSPITALITY", items: ["GDI Landing", "MQTT OS", "VRP / HRP pages", "Tour platforms", "Hotel integrations"], refs: "PROD-034 → PROD-035", status: "R&D + LIVE" },
    { num: "06", title: "SECURITY / TRUST", items: ["Blackbox Flight Recorder", "Obelisk Beacon", "Audit-Logger", "Oracle-Admin-Canary", "Prometheus-Grafana"], refs: "SVC-030 → SVC-034", status: "MANDATORY" },
  ];

  const tiers = [
    { name: "AGENT CORE", price: "$1,750/mo", note: "av-api + av-vector + av-mcp + Hermes-Gateway", pkr: "PKR 486,500/mo" },
    { name: "TRADING STACK", price: "$2,500/mo", note: "Symbiote + Blackbox + Audit-Logger + Oracle-Canary", pkr: "PKR 695,000/mo" },
    { name: "HOSPITALITY", price: "$1,050/mo", note: "GDI + MQTT + Audit + Cloudflare + VPS", pkr: "PKR 291,900/mo" },
    { name: "ENTERPRISE FULL", price: "$25,000/mo", note: "All 34 services, custom SLA", pkr: "PKR 6,950,000/mo" },
  ];

  return (
    <div className="w-full h-full flex items-start overflow-y-auto px-6 md:px-12 py-16 relative">
      <div className="max-w-6xl w-full space-y-12 relative z-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            <span className="text-[9px] font-mono font-bold tracking-[0.4em] uppercase text-white/40">AV / CATALOG</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-white/90 leading-none">CATALOG</h2>
          <p className="text-xs text-white/30 font-mono mt-2 tracking-wider">Services · Tiers & Operational Footprint</p>
        </div>

        {/* Domains */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-5">01 / SERVICE DOMAINS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {domains.map(d => (
              <div key={d.num} className="border border-white/10 bg-white/[0.02] p-5 hover:border-white/25 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] text-white/30">{d.num}</span>
                  <h3 className="text-sm font-bold text-white/90 tracking-tight">{d.title}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {d.items.map(i => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/60 font-mono border border-white/[0.06]">{i}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                  <span className="text-[9px] font-mono text-white/20">{d.refs}</span>
                  <span className="text-[9px] font-mono text-emerald-400/60">{d.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-5">02 / SUBSCRIPTION TIERS</p>
          <div className="space-y-3">
            {tiers.map(t => (
              <div key={t.name} className="border border-white/10 bg-white/[0.015] p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 hover:border-white/25 transition-all">
                <div className="md:w-48 shrink-0">
                  <h3 className="text-sm font-bold text-white">{t.name}</h3>
                  <p className="text-[10px] text-white/30 font-mono">{t.note}</p>
                </div>
                <div className="flex-1 flex gap-4 md:gap-12 text-xs font-mono text-white/70">
                  <span><span className="text-white/30 text-[10px]">USD</span> {t.price}</span>
                  <span><span className="text-white/30 text-[10px]">PKR</span> {t.pkr}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-[8px] text-white/20 tracking-widest uppercase">ARTIFACT VIRTUAL / CATALOG / 2026</p>
      </div>
    </div>
  );
};

export default CatalogDimension;
