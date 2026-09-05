import React from 'react';
import { motion } from 'motion/react';

interface MorphXProps {
  onClick: () => void;
  className?: string;
}

/**
 * MorphX — an X that blooms out of nothing and collapses back in.
 * Used as the close button on the left-anchored paper sidebar.
 * No hamburger ancestry — purely a system close signal.
 */
export default function MorphX({ onClick, className = '' }: MorphXProps) {
  return (
    <motion.button
      onClick={onClick}
      aria-label="Close"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.85 }}
      className={`relative w-8 h-8 flex items-center justify-center text-white/50 hover:text-cyan-400 transition-colors cursor-pointer ${className}`}
    >
      {/* Outer ring — expands with the bloom */}
      <motion.span
        className="absolute inset-0 rounded-full border border-cyan-500/0"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.3 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      />

      {/* X mark — two diagonal strokes */}
      <motion.svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        initial={{ opacity: 0, scale: 0, rotate: -90 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0, rotate: 90 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10"
      >
        {/* Glow layer */}
        <motion.line
          x1="2" y1="2" x2="14" y2="14"
          stroke="rgba(34,211,238,0.3)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          exit={{ pathLength: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        />
        {/* Top-left to bottom-right stroke */}
        <motion.line
          x1="2" y1="2" x2="14" y2="14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          exit={{ pathLength: 0 }}
          transition={{ duration: 0.25, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
        />
        {/* Top-right to bottom-left stroke */}
        <motion.line
          x1="14" y1="2" x2="2" y2="14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          exit={{ pathLength: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        />
      </motion.svg>
    </motion.button>
  );
}
