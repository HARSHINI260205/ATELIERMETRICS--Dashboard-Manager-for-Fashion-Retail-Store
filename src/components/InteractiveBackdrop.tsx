import { useEffect, useRef } from 'react';

interface InteractiveBackdropProps {
  activeKey?: string;
  variant?: 'light' | 'dark';
  containerScoped?: boolean;
}

const TAB_OFFSET_INDEX: Record<string, number> = {
  dashboard: 0,
  products: 1,
  inventory: 2,
  sales: 3,
  pricing: 4,
  ml: 5,
  trends: 6,
  admin: 7,
};

export function InteractiveBackdrop({
  activeKey = 'dashboard',
  variant = 'light',
  containerScoped = false,
}: InteractiveBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    mouseX: -9999,
    mouseY: -9999,
    smoothX: -9999,
    smoothY: -9999,
    targetOffsetX: 0,
    targetOffsetY: 0,
    offsetX: 0,
    offsetY: 0,
    sweepProgress: 1, // 0 -> 1 kinetic sweep on tab switch
    time: 0,
  });

  useEffect(() => {
    const idx = TAB_OFFSET_INDEX[activeKey] ?? 0;
    stateRef.current.targetOffsetX = (idx % 4) * 28;
    stateRef.current.targetOffsetY = Math.floor(idx / 4) * 24 + idx * 10;
    stateRef.current.sweepProgress = 0;
  }, [activeKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let rafId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (containerScoped && canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
      } else {
        width = window.innerWidth;
        height = window.innerHeight;
      }
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    let resizeObserver: ResizeObserver | null = null;
    if (containerScoped && canvas.parentElement && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas.parentElement);
    } else {
      window.addEventListener('resize', resize);
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (containerScoped && canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        stateRef.current.mouseX = e.clientX - rect.left;
        stateRef.current.mouseY = e.clientY - rect.top;
      } else {
        stateRef.current.mouseX = e.clientX;
        stateRef.current.mouseY = e.clientY;
      }
    };

    const handlePointerLeave = () => {
      stateRef.current.mouseX = -9999;
      stateRef.current.mouseY = -9999;
    };

    const targetEl = containerScoped && canvas.parentElement ? canvas.parentElement : window;
    targetEl.addEventListener('pointermove', handlePointerMove as EventListener);
    if (containerScoped && canvas.parentElement) {
      canvas.parentElement.addEventListener('pointerleave', handlePointerLeave);
    }

    const GRID_SIZE = 56;

    const renderFrame = () => {
      const s = stateRef.current;
      if (!prefersReducedMotion) {
        s.time += 0.012;
        s.offsetX += (s.targetOffsetX - s.offsetX) * 0.07;
        s.offsetY += (s.targetOffsetY - s.offsetY) * 0.07;
        if (s.sweepProgress < 1) {
          s.sweepProgress = Math.min(1, s.sweepProgress + 0.028);
        }
        if (s.mouseX > -1000) {
          if (s.smoothX < -1000) {
            s.smoothX = s.mouseX;
            s.smoothY = s.mouseY;
          } else {
            s.smoothX += (s.mouseX - s.smoothX) * 0.14;
            s.smoothY += (s.mouseY - s.smoothY) * 0.14;
          }
        } else {
          s.smoothX = -9999;
          s.smoothY = -9999;
        }
      }

      ctx.clearRect(0, 0, width, height);

      const isDark = variant === 'dark';
      const lineStroke = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(17, 17, 17, 0.055)';
      const nodeBase = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(17, 17, 17, 0.14)';
      const accentRgb = isDark ? '255, 107, 74' : '229, 62, 29';

      // Gentle cursor parallax on the grid origin
      const parallaxX =
        s.smoothX > -1000 ? ((s.smoothX / Math.max(1, width)) - 0.5) * -18 : 0;
      const parallaxY =
        s.smoothY > -1000 ? ((s.smoothY / Math.max(1, height)) - 0.5) * -18 : 0;

      const originX = ((s.offsetX + parallaxX + s.time * 4) % GRID_SIZE + GRID_SIZE) % GRID_SIZE;
      const originY = ((s.offsetY + parallaxY + s.time * 2.5) % GRID_SIZE + GRID_SIZE) % GRID_SIZE;

      // 1. Hairline architectural grid
      ctx.strokeStyle = lineStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = originX; x <= width; x += GRID_SIZE) {
        const px = Math.round(x) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
      }
      for (let y = originY; y <= height; y += GRID_SIZE) {
        const py = Math.round(y) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
      }
      ctx.stroke();

      // 2. Drifting pattern-drafting geometric vectors (subtle streetwear workshop lines)
      ctx.save();
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(17, 17, 17, 0.045)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const phase = s.time * (0.35 + i * 0.12) + i * 2.1;
        const x1 = width * (0.18 + i * 0.3) + Math.sin(phase) * 32 + parallaxX * 1.4;
        const y1 = height * (0.2 + i * 0.24) + Math.cos(phase * 0.8) * 26 + parallaxY * 1.4;
        const size = 90 + i * 45;
        ctx.strokeRect(Math.round(x1) + 0.5, Math.round(y1) + 0.5, size, size * 0.72);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + size, y1 + size * 0.72);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Intersection registration crosshairs reactive to pointer + tab sweep
      const hasCursor = s.smoothX > -1000;
      const radius = 190;
      const sweepY = s.sweepProgress * (height + 240) - 120;

      for (let x = originX; x <= width; x += GRID_SIZE) {
        for (let y = originY; y <= height; y += GRID_SIZE) {
          let highlight = 0;
          let pullX = 0;
          let pullY = 0;

          if (hasCursor) {
            const dx = s.smoothX - x;
            const dy = s.smoothY - y;
            const dist = Math.hypot(dx, dy);
            if (dist < radius) {
              const t = 1 - dist / radius;
              highlight = Math.max(highlight, t * t);
              pullX = dx * t * 0.08;
              pullY = dy * t * 0.08;
            }
          }

          if (s.sweepProgress < 1) {
            const distToSweep = Math.abs(y - sweepY);
            if (distToSweep < 110) {
              const sw = (1 - distToSweep / 110) * (1 - s.sweepProgress * 0.4);
              highlight = Math.max(highlight, sw * 0.85);
            }
          }

          const cx = x + pullX;
          const cy = y + pullY;
          const arm = 2.5 + highlight * 4.5;

          ctx.strokeStyle =
            highlight > 0.08
              ? `rgba(${accentRgb}, ${(0.22 + highlight * 0.68).toFixed(2)})`
              : nodeBase;
          ctx.lineWidth = highlight > 0.25 ? 1.5 : 1;

          ctx.beginPath();
          ctx.moveTo(cx - arm, cy);
          ctx.lineTo(cx + arm, cy);
          ctx.moveTo(cx, cy - arm);
          ctx.lineTo(cx, cy + arm);
          ctx.stroke();
        }
      }

      // 4. Cursor crosshair trace lines
      if (hasCursor) {
        ctx.save();
        ctx.strokeStyle = `rgba(${accentRgb}, ${isDark ? 0.22 : 0.16})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(s.smoothX, 0);
        ctx.lineTo(s.smoothX, height);
        ctx.moveTo(0, s.smoothY);
        ctx.lineTo(width, s.smoothY);
        ctx.stroke();
        ctx.restore();
      }

      // 5. Tab-switch kinetic scanline
      if (s.sweepProgress < 1) {
        ctx.save();
        ctx.strokeStyle = `rgba(${accentRgb}, ${(0.45 * (1 - s.sweepProgress)).toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(width, sweepY);
        ctx.stroke();
        ctx.restore();
      }

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', resize);
      }
      targetEl.removeEventListener('pointermove', handlePointerMove as EventListener);
      if (containerScoped && canvas.parentElement) {
        canvas.parentElement.removeEventListener('pointerleave', handlePointerLeave);
      }
    };
  }, [variant, containerScoped]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={
        containerScoped
          ? 'absolute inset-0 pointer-events-none z-0'
          : 'fixed inset-0 pointer-events-none z-0'
      }
    />
  );
}
