import React from 'react';

interface MorphBurgerProps {
  open: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * MorphBurger — three-line hamburger that fluidly morphs into an X.
 * Pure CSS transforms (no icon swap), with a signature stagger:
 * the middle line splits into two chevrons that fold outward while the
 * outer lines rotate — reads as a "system opening" rather than a generic X.
 */
export default function MorphBurger({ open, onClick, className = '' }: MorphBurgerProps) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      className={`group relative w-10 h-10 flex items-center justify-center p-2 text-white/40 hover:text-white transition-colors ${className}`}
    >
      <span className="relative block w-6 h-[14px]">
        {/* top line → rotates 45° and slides to center */}
        <span
          className="absolute left-0 top-0 w-full h-[2px] bg-current rounded-full transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={
            open
              ? { transform: 'translateY(6px) rotate(45deg)', width: '100%' }
              : { transform: 'translateY(0) rotate(0deg)', width: '100%' }
          }
        />
        {/* middle line → shrinks then flips into the second X stroke */}
        <span
          className="absolute left-0 top-[6px] w-full h-[2px] bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={
            open
              ? { transform: 'rotate(-45deg)', opacity: 1, transitionDelay: '150ms' }
              : { transform: 'scaleX(0.55) translateX(-4px)', opacity: 0.7, transitionDelay: '0ms' }
          }
        />
        {/* bottom line → rotates -45° and slides to center */}
        <span
          className="absolute left-0 top-[12px] w-full h-[2px] bg-current rounded-full transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={
            open
              ? { transform: 'translateY(-6px) rotate(-45deg)', width: '60%' }
              : { transform: 'translateY(0) rotate(0deg)', width: '80%', transitionDelay: '40ms' }
          }
        />
      </span>
      {/* scan pulse on hover — thematic "terminal cursor" accent */}
      <span className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 group-active:scale-90 transition-all duration-300" />
    </button>
  );
}
