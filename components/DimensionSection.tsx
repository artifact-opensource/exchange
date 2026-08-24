import React from 'react';
import { SectionId } from '../types';

interface DimensionSectionProps {
  id: SectionId;
  title: string;
  subtitle: string;
  bgGradient: string;
  accentColor: string;
  sourceUrls: string[];
  children: React.ReactNode;
  isHero?: boolean;
}

const DimensionSection: React.FC<DimensionSectionProps> = ({ 
  title, 
  subtitle, 
  accentColor,
  children,
  isHero = false
}) => {
  const accentClass = accentColor === 'white' ? 'white' : accentColor;
  const bgLetterRef = React.useRef<HTMLDivElement>(null);

  // Parallax: background letters drift subtly opposite/with the pointer.
  // Disabled for touch-only devices and prefers-reduced-motion users.
  React.useEffect(() => {
    const el = bgLetterRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (reduce || !finePointer) return;

    let raf = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;   // -0.5 .. 0.5
      target.y = e.clientY / window.innerHeight - 0.5;
    };
    const loop = () => {
      current.x += (target.x - current.x) * 0.06;       // ease toward target
      current.y += (target.y - current.y) * 0.06;
      el.style.transform = `translate(calc(-50% + ${(-current.x * 60).toFixed(2)}px), calc(-50% + ${(-current.y * 40).toFixed(2)}px))`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={`snap-start shrink-0 w-screen h-[100dvh] flex flex-col items-center justify-start overflow-x-hidden overflow-y-auto ${isHero ? 'pt-0' : 'pt-24 md:pt-32'} px-6 md:px-12 pb-12 transition-colors duration-700 relative`}>
      
      {/* Background Depth Element */}
      <div ref={bgLetterRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] will-change-transform">
        <h1 className="text-[30vw] font-black uppercase tracking-tighter leading-none select-none">
          {title.split('/')[1] || title}
        </h1>
      </div>

      {/* Structural Accents - only show if not hero to avoid clashing with hero elements */}
      {!isHero && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-20 md:h-32 bg-gradient-to-b from-transparent to-white/20"></div>
      )}
      
      <div className={`z-10 w-full max-w-7xl flex flex-col items-start text-left ${isHero ? 'space-y-0' : 'space-y-4'}`}>
        {/* Title Block - Hide if it's a full-bleed Hero section */}
        {!isHero && (
          <div className="relative mb-8 md:mb-16 w-full">
            <div className="flex items-center gap-3 mb-4">
               <div 
                 className="w-1.5 h-1.5 rounded-full animate-pulse"
                 style={{ backgroundColor: accentColor }}
               ></div>
               <h2 className="text-[9px] md:text-[11px] font-mono font-bold tracking-[0.4em] uppercase text-white/50">
                {subtitle}
              </h2>
            </div>
            
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] text-white">
              {title}
            </h1>
            
            <div className="mt-6 flex items-center gap-4 md:gap-8">
              <div 
                className="h-[1px] w-12 md:w-32 opacity-40"
                style={{ backgroundColor: accentColor }}
              ></div>
              <span className="text-[8px] md:text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">
                EST_NODE_CORE // {new Date().getFullYear()}
              </span>
            </div>
          </div>
        )}
        
        {/* Content Area */}
        <div className={`w-full ${!isHero ? 'animate-in fade-in slide-in-from-bottom-12 duration-1000' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default DimensionSection;