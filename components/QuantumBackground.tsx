import React from 'react';

export default function QuantumBackground() {
  return (
    <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#050505]" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          animation: 'quantumPan 180s linear infinite',
        }}
      />
      {/* Glow = 0 — no radial glow overlay */}
    </div>
  );
}
