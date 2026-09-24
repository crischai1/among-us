import { useEffect, useRef, useState } from 'react';

/** Shared "hold the button until full" mechanic. */
export function useHold(durationMs: number, onFull: () => void) {
  const [holding, setHolding] = useState(false);
  const [pct, setPct] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!holding || done.current) return;
    let last = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      setPct((p) => {
        const n = Math.min(1, p + (t - last) / durationMs);
        if (n >= 1 && !done.current) {
          done.current = true;
          setTimeout(onFull, 0);
        }
        return n;
      });
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holding, durationMs, onFull]);
  const bind = {
    onPointerDown: () => setHolding(true),
    onPointerUp: () => setHolding(false),
    onPointerLeave: () => setHolding(false),
  };
  return { holding, pct, bind };
}
