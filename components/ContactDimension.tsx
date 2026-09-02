import React from 'react';

const ContactDimension: React.FC = () => {
  const channels = [
    {
      title: "OPERATIONS / BOARD",
      desc: "Sirius — Owner, Board Director",
      ref: "ID: 193011943382974466",
      note: "Audit requests, enterprise engagements, board-level decisions"
    },
    {
      title: "COO / SERVICES",
      desc: "Maya Chen — business services catalog, pricing, audit requests",
      ref: "SVC-001 → SVC-034",
      note: "Source: BUSINESS_SERVICES_CATALOG.md (2026-08-30)"
    },
    {
      title: "CMO / BRAND",
      desc: "Nia Okafor — brand, growth, campaigns, content strategy",
      ref: "PROFILE: /team/cmo",
      note: "Customer-voice driven. Anti-pattern: corporate speak."
    },
  ];

  return (
    <div className="w-full h-full flex items-center overflow-y-auto px-6 md:px-12 py-16">
      <div className="max-w-4xl w-full space-y-10">
        {/* Channels */}
        <div>
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-5">02 / CHANNELS</p>
          <div className="space-y-3">
            {channels.map((ch) => (
              <div key={ch.title} className="border border-white/10 bg-white/[0.02] p-5 hover:border-white/25 hover:bg-white/[0.04] transition-all">
                <p className="font-mono text-[9px] tracking-[0.25em] text-white/40 uppercase mb-2">{ch.title}</p>
                <p className="text-sm text-white/80 leading-relaxed">{ch.desc}</p>
                <p className="font-mono text-[9px] text-white/30 mt-1">{ch.ref}</p>
                <p className="text-[10px] text-white/30 mt-2 leading-relaxed">{ch.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Audit */}
        <div className="border border-white/10 bg-white/[0.015] p-6 max-w-xl">
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase mb-3">03 / SUBMIT AUDIT</p>
          <p className="text-white/50 text-xs leading-relaxed mb-4">Required before any budget commitment. Standard 10 business days. Response SLA 48h.</p>
          <a href="mailto:ali.shakil@artifactvirtual.com?subject=Artifact%20Virtual%20Audit%20Request" className="inline-block px-6 py-2 border border-white/25 text-white/80 font-mono text-[10px] tracking-widest uppercase hover:bg-white/10 hover:border-white/50 transition-all">
            START AUDIT →
          </a>
        </div>

        <p className="font-mono text-[8px] text-white/20 tracking-widest uppercase">ARTIFACT VIRTUAL / CONTACT / 2026</p>
      </div>
    </div>
  );
};

export default ContactDimension;
