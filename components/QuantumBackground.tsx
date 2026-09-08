import React, { useEffect, useRef } from 'react';

export default function QuantumBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    resize();
    window.addEventListener('resize', resize);

    // Quantum preset: grid mode, density 60, speed 1.0, scale 2.0, glow 0
    const density = 60;
    const speedVal = 1.0;
    const scaleVal = 2.0;
    const strokeVal = 2.0;
    const glowVal = 0;
    const cols = Math.floor(density / 3) + 5;
    const spacing = W / cols;

    const render = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = strokeVal;
      if (glowVal > 0) ctx.shadowBlur = glowVal;

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < cols; y++) {
          const cx = x * spacing + spacing / 2;
          const cy = y * spacing + spacing / 2;
          const offset = t * 0.001 * speedVal;
          const angle = offset + (x * 0.3 + y * 0.3) * scaleVal;
          const r = spacing * 0.35 + Math.sin(angle) * (spacing * 0.15);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const loop = (ts: number) => {
      render(ts);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ background: '#050505' }}
      />
      {/* No glow overlay — glow=0 */}
    </div>
  );
}
