
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SectionId } from '../types';

interface NavigationOverlayProps {
  currentSection: SectionId;
  onNavigate: (section: SectionId) => void;
  isOpen: boolean;
  onClose?: () => void;
}

const NavigationOverlay: React.FC<NavigationOverlayProps> = ({ currentSection, onNavigate, isOpen, onClose }) => {
  const sections = [
    { id: SectionId.RD, label: 'RESEARCH & DEVELOPMENT' },
    { id: SectionId.ML, label: 'MACHINE LEARNING' },
    { id: SectionId.FT, label: 'FINANCIAL TECHNOLOGY' },
    { id: SectionId.ST, label: 'SPACE TECHNOLOGY' },
    { id: SectionId.IM, label: 'INVESTOR MANAGEMENT' },
    { id: SectionId.CATALOG, label: 'CATALOG' },
    { id: SectionId.CONTACT, label: 'CONTACT' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-black/60 backdrop-blur-xl border-l border-white/5 z-[200] flex flex-col justify-center px-12 md:px-20"
        >
          {/* Close control = the header MorphBurger (raised above this overlay
              while open) — no duplicate X here by design. */}

          <div className="flex flex-col items-end gap-8 md:gap-12">
            <div className="w-full flex flex-col items-end mb-4">
              <span className="font-mono text-[10px] text-white/20 tracking-[0.4em] uppercase mb-1">Navigation_Node</span>
              <div className="w-full h-[1px] bg-white/5"></div>
            </div>

            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  onNavigate(sec.id);
                  if (onClose) onClose();
                }}
                className="group flex flex-col items-end gap-2 focus:outline-none w-full"
              >
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] md:text-[12px] font-mono font-bold tracking-[0.5em] transition-all duration-500 uppercase text-right ${
                    currentSection === sec.id ? 'text-white' : 'text-white/20 group-hover:text-white/60'
                  }`}>
                    {sec.label}
                  </span>
                  <div className={`h-1 w-1 rounded-full transition-all duration-500 ${
                    currentSection === sec.id ? 'bg-white scale-150' : 'bg-white/10 group-hover:bg-white/30'
                  }`}></div>
                </div>
                
                <div className={`h-[1px] transition-all duration-700 ${
                  currentSection === sec.id ? 'bg-white/40 w-full' : 'bg-transparent w-0 group-hover:bg-white/10 group-hover:w-1/2'
                }`}></div>
              </button>
            ))}

            <div className="w-full mt-12 pt-12 border-t border-white/5 flex flex-col items-end gap-6">
              <button
                onClick={() => {
                  document.body.setAttribute('data-open-paper', 'privacy');
                  if (onClose) onClose();
                }}
                className="group flex flex-col items-end gap-1 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono tracking-[0.4em] uppercase text-white/20 group-hover:text-white/60 transition-all duration-300">Privacy Policy</span>
                  <div className="h-[1px] w-0 group-hover:w-8 bg-white/10 group-hover:bg-white/30 transition-all duration-500"></div>
                </div>
              </button>
              <button
                onClick={() => {
                  document.body.setAttribute('data-open-paper', 'terms');
                  if (onClose) onClose();
                }}
                className="group flex flex-col items-end gap-1 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono tracking-[0.4em] uppercase text-white/20 group-hover:text-white/60 transition-all duration-300">Terms of Use</span>
                  <div className="h-[1px] w-0 group-hover:w-8 bg-white/10 group-hover:bg-white/30 transition-all duration-500"></div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NavigationOverlay;
