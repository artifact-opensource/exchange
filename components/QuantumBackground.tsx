import React, { useEffect, useRef } from 'react';

export default function QuantumBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, document.documentElement.clientHeight);
      canvas.width = w;
      canvas.height = h;
      return { w, h };
    };

    let dims = resize();
    window.addEventListener('resize', () => { dims = resize(); });
    if ((window as any).visualViewport) {
      (window as any).visualViewport.addEventListener('resize', () => { dims = resize(); });
    }

    const density = 60;
    const speedVal = 1.0;
    const scaleVal = 2.0;
    const strokeVal = 2.0;
    const glowVal = 0;

    const render = (t: number) => {
      const { w, h } = dims;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = strokeVal;
      if (glowVal > 0) ctx.shadowBlur = glowVal;

      const cols = Math.floor(density / 3) + 5;
      const spacing = w / cols;

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
      if ((window as any).visualViewport) {
        (window as any).visualViewport.removeEventListener('resize', resize);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden" aria-hidden="true" style={{ width: '100vw', height: '100dvh' }}>
      <canvas
        ref={canvasRef}
        className="absolute block"
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#050505' }}
      />
    </div>
  );
}
