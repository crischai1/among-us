import { useEffect, useState } from 'react';
import type { TaskGameProps } from '../types';

const COLORS = ['#ffe135', '#2d9bff', '#3dff8a'];
const SPEEDS = [150, 210, 280];

export function CalibrateDistributor({ onComplete }: TaskGameProps) {
  const [row, setRow] = useState(0);
  const [angles, setAngles] = useState([40, 200, 120]);
  const [flash, setFlash] = useState<number | null>(null);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setAngles((a) => a.map((x, i) => (i < row ? 0 : (x + SPEEDS[i] * dt) % 360)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [row]);

  const press = (i: number) => {
    if (i !== row) return;
    const a = angles[i];
    const d = Math.min(a, 360 - a);
    if (d < 24) {
      const n = row + 1;
      setRow(n);
      if (n === 3) onComplete();
    } else {
      setFlash(i);
      setTimeout(() => setFlash(null), 300);
      setRow(0);
    }
  };

  return (
    <div className="calibrate">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`cal-row ${i < row ? 'ok' : ''} ${flash === i ? 'bad' : ''}`}>
          <svg viewBox="-50 -50 100 100" className="cal-dial">
            <circle r="44" fill="#1b1f27" stroke="#000" strokeWidth="4" />
            <path d="M0 -44 L-10 -30 L10 -30 Z" fill={COLORS[i]} />
            <line x1="0" y1="0" x2={Math.sin((angles[i] * Math.PI) / 180) * 36} y2={-Math.cos((angles[i] * Math.PI) / 180) * 36} stroke={COLORS[i]} strokeWidth="6" strokeLinecap="round" />
            <circle r="7" fill="#999" />
          </svg>
          <div className="cal-bar">
            <div style={{ width: i < row ? '100%' : '0%', background: COLORS[i] }} />
          </div>
          <button className="btn small" disabled={i !== row} onClick={() => press(i)}>
            CALIBRATE
          </button>
        </div>
      ))}
    </div>
  );
}
