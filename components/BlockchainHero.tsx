import React, { useState, useEffect, useRef } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Web3Provider } from './Web3Provider';
import { Wallet, LogOut, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { BASE_CHAIN_ID, BASESCAN, ERC20_ABI, basescanUrl } from '../lib/contracts';

const BlockchainHeroContent: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Treasury embed: same-origin wallet handoff ─────────────────────
  const dashRef = useRef<HTMLIFrameElement>(null);
  const [dashReady, setDashReady] = useState(false);

  // Pre-stage the account so the embedded dapp picks it up on first mount
  useEffect(() => {
    if (!isConnected || !address) return;
    try { localStorage.setItem('av_handoff_account', address); } catch {}
  }, [isConnected, address]);

  // Also push it across post-mount (covers slow iframe loads / reconnects)
  useEffect(() => {
    if (!isConnected || !address || !dashReady) return;
    dashRef.current?.contentWindow?.postMessage(
      { type: 'av_wallet', address },
      window.location.origin,
    );
  }, [isConnected, address, dashReady]);

  useEffect(() => {
    if (!isConnected) setDashReady(false);
  }, [isConnected]);


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

  // ─── Real on-chain data (Base Mainnet) ─────────────────────────────
  const chainId = BASE_CHAIN_ID;

  const { data: auSupply } = useReadContract({
    abi: ERC20_ABI,
    address: BASESCAN.auToken,
    functionName: 'totalSupply',
    chainId,
  });

  const { data: agSupply } = useReadContract({
    abi: ERC20_ABI,
    address: BASESCAN.agToken,
    functionName: 'totalSupply',
    chainId,
  });

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

  const formatTokens = (raw: bigint | undefined, symbol: string) => {
    if (raw === undefined || raw === null) return `— ${symbol}`;
    const n = Number(formatUnits(raw, 18));
    return `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${symbol}`;
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
          
          <div className="grid grid-cols-2 md:flex md:items-end gap-6 md:gap-12 w-full md:w-auto">
            {isConnected ? (
              <div className="flex items-center gap-4 border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 col-span-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] text-emerald-400/70 uppercase tracking-[0.2em]">Connected</span>
                  <span className="font-mono text-xs text-emerald-400 font-bold">{address ? shortenAddress(address) : ''}</span>
                </div>
                <button 
                  onClick={() => disconnect()}
                  className="ml-2 p-1.5 hover:bg-emerald-500/20 transition-colors rounded text-emerald-400/50 hover:text-emerald-400"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => open()}
                className="flex items-center justify-between gap-4 border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-colors px-6 py-3 group col-span-2 md:w-auto w-full cursor-pointer"
              >
                <div className="flex items-center gap-3 text-orange-400">
                  <Wallet className="w-4 h-4" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold">CONNECT_WALLET</span>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-400/50 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
              </button>
            )}
            <div className="flex flex-col md:items-end gap-1">
              <span className="font-mono text-[9px] text-white/20 uppercase tracking-[0.2em]">Network</span>
              <span className="font-mono text-xs text-white font-bold tracking-widest">BASE · 8453</span>
            </div>
          </div>
        </header>

        {/* AV Treasury — embedded dapp (auto-swaps in on wallet connect) */}
        <div className={`transition-all duration-700 overflow-hidden ${isConnected ? 'max-h-[900px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="border border-emerald-500/20 bg-black flex flex-col">
            <div className="flex justify-between items-center border-b border-emerald-500/10 px-6 md:px-8 py-4">
              <h3 className="font-mono text-emerald-400 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 animate-pulse"></span>
                AV Treasury — Live Dashboard
              </h3>
              <a href="/treasury/" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-emerald-500/50 hover:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-1 transition-colors">
                Standalone <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {isConnected && (
              <iframe
                ref={dashRef}
                src="/treasury/"
                title="AV Treasury Dashboard"
                onLoad={() => setDashReady(true)}
                className="w-full h-[760px] bg-black border-0"
              />
            )}
            <p className="font-mono text-[9px] text-white/25 uppercase tracking-[0.15em] text-center py-2 border-t border-white/5">
              Same-origin embed · wallet session passed through · no re-connect
            </p>
          </div>
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
              {market?.au?.status === 'live' ? formatPriceUsd(market.au.priceUsd) : formatTokens(auSupply, 'Au')}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {market?.au?.status === 'live' ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                  ● Live · {sourceLabel(market.au.source)} · supply {formatTokens(auSupply, 'Au')}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
                  NO_MARKET — awaiting liquidity · supply {formatTokens(auSupply, 'Au')}
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
              {market?.ag?.status === 'live' ? formatPriceUsd(market.ag.priceUsd) : formatTokens(agSupply, 'Ag')}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {market?.ag?.status === 'live' ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                  ● Live · {sourceLabel(market.ag.source)} · supply {formatTokens(agSupply, 'Ag')}
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

const BlockchainHero: React.FC = () => {
  return (
    <Web3Provider>
      <BlockchainHeroContent />
    </Web3Provider>
  );
};

export default BlockchainHero;
