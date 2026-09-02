import React from 'react';

const CatalogDimension: React.FC = () => {
  const domains = [
    {
      num: "01",
      title: "AI / LLM",
      items: ["av-api", "av-mcp", "av-vector", "Hermes-Gateway", "SYMBIOTE", "SPORE"],
      refs: "SVC-001 → SVC-014",
      status: "R&D + LIVE"
    },
    {
      num: "02",
      title: "COMPUTE / INFRA",
      items: ["Cloudflare Tunnels (12+ sites)", "Vercel", "VPS Vietnam", "PostgreSQL / Redis", "Colocation, CDNs"],
      refs: "SVC-017 → SVC-027",
      status: "LIVE + PIPELINE"
    },
    {
      num: "03",
      title: "TRADING / QUANT",
      items: ["Symbiote Gateway", "AV-Exchange (crypto)", "Blackbox", "Oracle-Canary", "Treasury routing"],
      refs: "SVC-009",
      status: "LIVE"
    },
    {
      num: "04",
      title: "ENTERPRISE / GOVERNANCE",
      items: ["COMB mechanism", "ERP integrations", "AV-Treasury", "Smart-contract governance", "Audit-Logger"],
      refs: "SVC-030 → SVC-034",
      status: "LIVE"
    },
    {
      num: "05",
      title: "HOSPITALITY",
      items: ["GDI Landing", "MQTT OS", "VRP / HRP pages", "Tour platforms", "Hotel integrations"],
      refs: "PROD-034 → PROD-035",
      status: "R&D + LIVE"
    },
    {
      num: "06",
      title: "SECURITY / TRUST",
      items: ["Blackbox Flight Recorder", "Obelisk Beacon", "Audit-Logger", "Oracle-Admin-Canary", "Prometheus-Grafana"],
      refs: "SVC-030 → SVC-034",
      status: "MANDATORY"
    },
  ];

  const tiers = [
    { name: "AGENT CORE", price: "$1,750/mo", note: "av-api + av-vector + av-mcp + Hermes-Gateway", pkr: "PKR 486,500/mo" },
    { name: "TRADING STACK", price: "$2,500/mo", note: "Symbiote + Blackbox + Audit-Logger + Oracle-Canary", pkr: "PKR 695,000/mo" },
    { name: "HOSPITALITY", price: "$1,050/mo", note: "GDI + MQTT + Audit + Cloudflare + VPS", pkr: "PKR 291,900/mo" },
    { name: "ENTERPRISE FULL", price: "$25,000/mo", note: "All 34 services, custom SLA", pkr: "PKR 6,950,000/mo" },
  ];

  return (
    <div className="w-full h-full overflow-y-auto px-6 md:px-12 py-16">
      <div className="max-w-6xl w-full space-y-12">

        {/* Audit requirements — always visible */}
        <div className="border border-white/10 bg-white/[0.015] p-6 max-w-2xl">
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-4">04 / AUDIT REQUIRED</p>
          <div className="space-y-2 text-[11px] text-white/50 font-mono">
            <p><span className="text-white/30 mr-2">01.</span>Scope — deliverables, timelines, exclusions</p>
            <p><span className="text-white/30 mr-2">02.</span>Budget — line items + 15% contingency</p>
            <p><span className="text-white/30 mr-2">03.</span>Risk matrix — security, operational, economic</p>
            <p><span className="text-white/30 mr-2">04.</span>Stakeholder sign-off — CTO / CFO / Sirius</p>
            <p className="pt-2 text-white/25">Submit via Contact page. Response SLA: 48h. Delivery: 10 business days.</p>
          </div>
        </div>

        {/* Service domains */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-5">02 / SERVICE DOMAINS — 6 DOMAINS</p>
          <div className="space-y-3">
            {domains.map((d) => (
              <div key={d.num} className="border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04] transition-all">
                <div className="flex items-start gap-4 p-4 md:p-5">
                  <span className="font-mono text-[9px] text-white/25 mt-1 w-4 shrink-0">{d.num}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase">{d.title}</p>
                      <span className="font-mono text-[8px] text-white/20">{d.refs}</span>
                      <span className="ml-auto font-mono text-[8px] text-white/20 shrink-0">{d.status}</span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">{d.items.join(" · ")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-5">03 / PRICING TIERS — USD + PKR (70% DISCOUNT PKR)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiers.map((t) => (
              <div key={t.name} className="border border-white/10 bg-white/[0.02] p-4">
                <p className="font-mono text-[8px] tracking-[0.2em] text-white/40 uppercase mb-3">{t.name}</p>
                <p className="font-mono text-lg text-white font-bold">{t.price}</p>
                <p className="text-[9px] text-white/40 mt-2 leading-relaxed">{t.note}</p>
                <p className="font-mono text-[9px] text-white/25 mt-2">{t.pkr}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 font-mono text-[9px] text-white/20 tracking-wide">
            PKR pricing reflects 70% domestic discount. All prices backed by Pakistan cost base (60–75% below US/EU).
          </div>
        </div>

        <p className="font-mono text-[8px] text-white/20 tracking-widest uppercase">ARTIFACT VIRTUAL / MAYA CHEN / CATALOGUE / 2026</p>
      </div>
    </div>
  );
};

export default CatalogDimension;
