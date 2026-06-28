import React, { useState, useEffect, useRef } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect } from 'wagmi';
import { Web3Provider } from './Web3Provider';
import { Wallet, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

const BlockchainHeroContent: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Token A: Primary Protocol Asset
  const [priceA, setPriceA] = useState(0.00248142);
  const [basePriceA] = useState(0.00220612);
  
  // Token B: Staking/Flywheel Asset
  const [priceB, setPriceB] = useState(1.4285);
  const [basePriceB] = useState(1.2140);
  
  const [correlation, setCorrelation] = useState(0.92);
  const correlationRef = useRef(0.92);
  const [liquidity, setLiquidity] = useState(4210582);
  
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const updateStats = () => {
      const commonFactor = (Math.random() - 0.5);
      const currentCorr = correlationRef.current;
      
      setPriceA(prev => {
        const individualFluctuation = (Math.random() - 0.5) * 0.000002;
        const linkedFluctuation = commonFactor * 0.000006 * currentCorr;
        return prev + individualFluctuation + linkedFluctuation;
      });

      setPriceB(prev => {
        const individualFluctuation = (Math.random() - 0.5) * 0.0005;
        const linkedFluctuation = commonFactor * 0.0015 * currentCorr;
        return prev + individualFluctuation + linkedFluctuation;
      });

      setLiquidity(prev => prev + (Math.random() - 0.5) * 50);
      
      setCorrelation(prev => {
        const drift = (Math.random() - 0.5) * 0.001;
        const next = Math.min(0.99, Math.max(0.85, prev + drift));
        correlationRef.current = next;
        return next;
      });

      timeoutId = setTimeout(updateStats, 1000 + Math.random() * 1000);
    };
    
    updateStats();
    return () => clearTimeout(timeoutId);
  }, []);

  const triggerDistort = () => {
    const anim = document.getElementById('distort-anim') as any;
    if (anim) anim.beginElement();
  };

  const formatPrice = (val: number, decimals: number = 6) => 
    val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

  const getChange = (current: number, base: number) => ((current - base) / base) * 100;

  const formattedLiquidity = (liquidity / 1000000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }) + 'M';

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
            <h2 className="font-black text-2xl md:text-4xl tracking-tighter uppercase text-white">AV/FLYWHEEL</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Nexus Sync</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="font-mono text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Active</span>
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
              <span className="font-mono text-[9px] text-white/20 uppercase tracking-[0.2em]">Correlation</span>
              <span className="font-mono text-xs text-white font-bold tracking-widest">{(correlation * 100).toFixed(2)}%</span>
            </div>
          </div>
        </header>

        {/* Dynamic DApp Panel */}
        <div className={`transition-all duration-700 overflow-hidden ${isConnected ? 'max-h-[500px] opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="border border-emerald-500/20 bg-black p-6 md:p-8 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-emerald-500/10 pb-4">
              <h3 className="font-mono text-emerald-400 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 animate-pulse"></span>
                Authorized DApp Interface
              </h3>
              <span className="font-mono text-[10px] text-emerald-500/50 uppercase tracking-[0.2em]">Secure Session</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-2">
                <span className="font-mono text-[9px] text-white/40 uppercase tracking-[0.2em]">Your AV Balance</span>
                <span className="font-mono text-xl text-white">0.0000 AV</span>
              </div>
              <div className="border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-2">
                <span className="font-mono text-[9px] text-white/40 uppercase tracking-[0.2em]">Staked Assets</span>
                <span className="font-mono text-xl text-white">0.0000 STK</span>
              </div>
              <button className="border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors p-4 flex items-center justify-center group cursor-pointer h-full">
                <span className="font-mono text-xs text-emerald-400 uppercase tracking-widest group-hover:scale-105 transition-transform">Initialize Stake</span>
              </button>
            </div>
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-[0.1em] text-center mt-4">
              Awaiting contract initialization...
            </p>
          </div>
        </div>

        {/* Dual Token Valuation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-24 relative">
          {/* Token A */}
          <section className="flex flex-col gap-4 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-colors duration-500">AV/PRIMARY</span>
            </div>
            <div 
              onMouseEnter={triggerDistort}
              className="displace-text text-[clamp(3.5rem,12vw,7rem)] font-black leading-[0.85] tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent cursor-default select-none"
            >
              {formatPrice(priceA)}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className={`font-mono text-lg font-medium ${getChange(priceA, basePriceA) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {getChange(priceA, basePriceA) >= 0 ? '+' : ''}{getChange(priceA, basePriceA).toFixed(2)}%
              </span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
          </section>

          {/* Token B */}
          <section className="flex flex-col gap-4 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-white/40 group-hover:text-orange-500 transition-colors duration-500">AV/STAKING</span>
            </div>
            <div 
              onMouseEnter={triggerDistort}
              className="displace-text text-[clamp(3.5rem,12vw,7rem)] font-black leading-[0.85] tracking-tighter bg-gradient-to-b from-orange-500 to-orange-900 bg-clip-text text-transparent cursor-default select-none"
            >
              {formatPrice(priceB, 4)}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className={`font-mono text-lg font-medium ${getChange(priceB, basePriceB) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {getChange(priceB, basePriceB) >= 0 ? '+' : ''}{getChange(priceB, basePriceB).toFixed(2)}%
              </span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
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
            <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Total Liquidity</span>
            <span className="text-2xl md:text-4xl font-light font-mono text-white tracking-tighter">
              {formattedLiquidity}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Flywheel Efficiency</span>
            <span className="text-2xl md:text-4xl font-light font-mono text-emerald-400 tracking-tighter uppercase italic">
              Optimal
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/40">Sync Protocol</span>
            <div className="flex items-center gap-4">
              <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-1000" 
                  style={{ width: `${correlation * 100}%` }}
                ></div>
              </div>
              <span className="font-mono text-xs text-white/60">LAYER_0</span>
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

