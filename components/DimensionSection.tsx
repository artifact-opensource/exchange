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

  return (
    <div className={`snap-start shrink-0 w-screen h-[100dvh] flex flex-col items-center justify-start overflow-x-hidden overflow-y-auto ${isHero ? 'pt-0' : 'pt-24 md:pt-32'} px-6 md:px-12 pb-12 transition-colors duration-700 relative`}>

      {/* Clean header — no vertical divider */}

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
