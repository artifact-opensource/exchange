import React from 'react';
import { motion } from 'motion/react';

interface MorphXProps {
  onClick: () => void;
  className?: string;
}

export default function MorphX({ onClick, className = '' }: MorphXProps) {
  return (
    <motion.button
      onClick={onClick}
      aria-label="Close"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.85 }}
      className={`relative w-8 h-8 flex items-center justify-center text-white hover:text-white transition-colors cursor-pointer ${className}`}
    >
      <motion.span
        className="absolute inset-0 rounded-full border border-white/20"
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.3 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      />
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
        <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </motion.svg>
    </motion.button>
  );
}
