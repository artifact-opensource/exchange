
import React from 'react';

const InfraCore: React.FC = () => {
  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-12">
      {/* The Central Monolith / Core */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 mb-16 group">
        {/* Rotating Outer Rings */}
        <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_20s_linear_infinite]"></div>
        <div className="absolute inset-4 border border-white/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
        <div className="absolute inset-8 border-2 border-white/5 rounded-full animate-[pulse_4s_ease-in-out_infinite]"></div>
        
        {/* Core Geometry */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-white rotate-45 group-hover:rotate-90 transition-transform duration-1000 ease-in-out shadow-[0_0_60px_rgba(255,255,255,0.3)] flex items-center justify-center">
             <div className="w-16 h-16 bg-black rotate-45"></div>
          </div>
        </div>

        {/* Floating Telemetry Labels */}
        <div className="absolute -top-12 -left-20 animate-bounce duration-[3s]">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 text-[8px] font-mono tracking-tighter uppercase">
            <span className="text-white/40 block mb-1">LATENCY</span>
            <span className="text-white font-black">0.00042 MS</span>
          </div>
        </div>
        <div className="absolute -bottom-8 -right-24 animate-bounce duration-[4s]">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 text-[8px] font-mono tracking-tighter uppercase">
            <span className="text-white/40 block mb-1">THROUGHPUT</span>
            <span className="text-white font-black">9.2 PB/S</span>
          </div>
        </div>
        <div className="absolute top-1/2 -right-32 -translate-y-1/2">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 text-[8px] font-mono tracking-tighter uppercase">
            <span className="text-white/40 block mb-1">UPTIME</span>
            <span className="text-white font-black">99.9999%</span>
          </div>
        </div>
      </div>

      {/* Core Protocol Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {[
          { title: "SYNDICATE", desc: "Decentralized compute distribution", icon: "fa-network-wired" },
          { title: "NUCLEUS", desc: "Ultra-low latency data propagation", icon: "fa-bolt" },
          { title: "SENTINEL", desc: "Quantum-resistant security layers", icon: "fa-shield-halved" }
        ].map((feat, i) => (
          <div key={i} className="group p-6 border border-white/5 hover:border-white/20 transition-all bg-white/[0.02] hover:bg-white/[0.05] text-left">
            <i className={`fa-solid ${feat.icon} text-lg mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all`}></i>
            <h4 className="text-[10px] font-black tracking-[0.4em] mb-2 uppercase">{feat.title}</h4>
            <p className="text-[11px] text-white/40 leading-relaxed font-bold uppercase tracking-tight group-hover:text-white/70 transition-colors">
              {feat.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InfraCore;
