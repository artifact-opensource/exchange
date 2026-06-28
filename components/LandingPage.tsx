import React from "react";
import { motion } from "motion/react";

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#030303] cursor-pointer"
      onClick={onEnter}
    >
      {/* Central Logo */}
      <div className="flex flex-col items-center gap-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-6"
        >
          <div className="w-16 h-16 md:w-24 md:h-24 border border-white flex items-center justify-center font-bold text-white italic text-3xl md:text-5xl">
            AV
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-[0.5em] md:tracking-[0.8em] text-lg md:text-2xl uppercase text-white">
              ARTIFACT VIRTUAL
            </span>
            <div className="h-[1px] w-full bg-white/40 mt-3"></div>
            <span className="text-[9px] md:text-[11px] font-mono text-white/30 tracking-[0.3em] mt-3 uppercase">
              RESEARCH_COLLECTIVE // DIMENSIONAL_PORTAL
            </span>
          </div>
        </motion.div>

        {/* Enter Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-12 flex flex-col items-center gap-4"
        >
          <span className="text-[10px] md:text-[11px] font-mono text-white/40 tracking-[0.5em] uppercase animate-pulse">
            Click to enter
          </span>
          <div className="w-12 h-[1px] bg-white/20"></div>
        </motion.div>

        {/* Bottom metadata */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 md:bottom-12 left-0 right-0 flex justify-center"
        >
          <div className="flex items-center gap-6 text-[8px] md:text-[9px] font-mono text-white/20 tracking-[0.3em] uppercase">
            <span>EST. 2024</span>
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
            <span>DIMENSIONS: 5</span>
            <div className="w-1 h-1 rounded-full bg-white/20"></div>
            <span>STATUS: ACTIVE</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LandingPage;
