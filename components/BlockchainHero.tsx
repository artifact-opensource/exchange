import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { BASESCAN, basescanUrl } from '../lib/contracts';

const BlockchainHero: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Live market data via /api/market (pool → dexscreener → oracle) ───
  const [market, setMarket] = useState<any>(null);

  const sourceLabel = (s?: string) =>
    !s ? '' :
    s.startsWith('dexscreener') ? 'dexscreener' :
    s === 'cl_pool_spot' ? 'pool spot' :
    s === 'pool_spot' ? 'pool' :
    s === 'oracle_bootstrap' ? 'oracle · nominal bootstrap' :
    s === 'oracle_cache' ? 'oracle cache' :
    s;

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/market/route')
        .then((r) => r.json())
        .then((d) => { if (alive) setMarket(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 45000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const triggerDistort = () => {
    const anim = document.getElementById('distort-anim') as any;
    if (anim) anim.beginElement();
  };

  const formatPriceUsd = (v: number) =>
    '$' + v.toLocaleString('en-US', { minimumFractionDigits: v < 1 ? 8 : 2, maximumFractionDigits: v < 1 ? 10 : 2 });

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen pt-24 md:pt-40 pb-20 flex flex-col justify-start px-4 md:px-0"
    >
      <div className="relative z-10 w-full flex flex-col gap-8 md:gap-16 animate-in fade-in slide-in-from-top-12 duration-1000">

        {/* Flywheel Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-6 md:gap-0">
          <div className="flex flex-col gap-1">
            <h2 className="font-black text-2xl md:text-4xl tracking-tighter uppercase text-white">AVFT</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Nexus Sync</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="font-mono text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Live · Base</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-1">
            <span className="font-mono text-[9px] text-white/20 uppercase tracking-[0.2em]">Network</span>
            <span className="font-mono text-xs text-white font-bold tracking-widest">BASE · 8453</span>
          </div>
        </header>

        {/* Open Treasury — wallet lives in treasury dapp */}
        <div className="border border-orange-500/20 bg-black flex flex-col">
          <div className="flex justify-between items-center border-b border-orange-500/10 px-6 md:px-8 py-4">
            <h3 className="font-mono text-orange-400 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 animate-pulse"></span>
              AV Treasury — Connect Wallet Here
            </h3>
            <a href="/treasury/" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-orange-500/50 hover:text-orange-400 uppercase tracking-[0.2em] flex items-center gap-1 transition-colors">
              Open Treasury <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <iframe
            src="/treasury/"
            title="AV Treasury — Connect Wallet"
            className="w-full h-[760px] bg-black border-0"
          />
          <p className="font-mono text-[9px] text-white/25 uppercase tracking-[0.15em] text-center py-2 border-t border-white/5">
            Connect your wallet in the treasury dashboard above
          </p>
        </div>

        {/* Dual Token Valuation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24 relative">
          {/* Token A: Au */}
          <section className="flex flex-col gap-4 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#FFD700]"></div>
              <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/40 group-hover:text-[#FFD700] transition-colors duration-500">AU / UTILITY</span>
            </div>
            <div
              onMouseEnter={triggerDistort}
              className="displace-text text-[clamp(2.6rem,9vw,5.5rem)] font-black leading-[0.85] tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent cursor-default select-none"
            >
              {market?.au?.status === 'live' ? formatPriceUsd(market.au.priceUsd) : '— Au'}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {market?.au?.status === 'live' ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                  ● Live · {sourceLabel(market.au.source)}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                  NO_MARKET — awaiting liquidity
                </span>
              )}
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <a href={basescanUrl('auToken')} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-white/30 hover:text-white/60 tracking-wider transition-colors">
                {shortenAddress(BASESCAN.auToken)} ↗ BASESCAN
              </a>
            </div>
          </section>

          {/* Token B: Ag */}
          <section className="flex flex-col gap-4 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#C0C0C0]"></div>
              <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/40 group-hover:text-[#C0C0C0] transition-colors duration-500">AG / GOVERNANCE</span>
            </div>
            <div
              onMouseEnter={triggerDistort}
              className="displace-text text-[clamp(2.6rem,9vw,5.5rem)] font-black leading-[0.85] tracking-tighter bg-gradient-to-b from-[#E8E8E8] to-[#6b6b6b] bg-clip-text text-transparent cursor-default select-none"
            >
              {market?.ag?.status === 'live' ? formatPriceUsd(market.ag.priceUsd) : '— Ag'}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {market?.ag?.status === 'live' ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                  ● Live · {sourceLabel(market.ag.source)}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                  PRE_MARKET — zero supply · no liquidity yet
                </span>
              )}
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <a href={basescanUrl('agToken')} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-white/30 hover:text-white/60 tracking-wider transition-colors">
                {shortenAddress(BASESCAN.agToken)} ↗ BASESCAN
              </a>
            </div>
          </section>

          {/* Cross-Link Visualizer (Desktop only decor) */}
          <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <svg width="200" height="100" viewBox="0 0 200 100" className="animate-pulse">
              <path d="M0,50 Q100,0 200,50 Q100,100 0,50" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            </svg>
          </div>
        </div>

        {/* Aggregate Stats Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-16 pt-12 border-t border-white/5">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Settlement Network</span>
            <span className="text-2xl md:text-4xl font-light font-mono text-white tracking-tighter uppercase">
              Base Mainnet
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Protocol Assets</span>
            <span className="text-2xl md:text-4xl font-light font-mono text-emerald-400 tracking-tighter uppercase italic">
              Au + Ag
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Contract Registry</span>
            <div className="flex items-center gap-4">
              <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-full transition-all duration-1000"></div>
              </div>
              <span className="font-mono text-xs text-white/60 whitespace-nowrap">VERIFIED_ONCHAIN</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default BlockchainHero;
