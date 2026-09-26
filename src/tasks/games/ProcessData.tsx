import { useEffect, useRef, useState } from 'react';
import type { TaskGameProps } from '../types';

const DURATION = 4200;

/** Send the office's data off to headquarters: press Process and wait. */
export function ProcessData({ onComplete }: TaskGameProps) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (startedAt === null) return;
    let raf = 0;
    const tick = () => {
      const t = performance.now();
      setNow(t);
      if (t - startedAt >= DURATION) {
        if (!done.current) {
          done.current = true;
          onComplete();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, onComplete]);

  const k = startedAt === null ? 0 : Math.min(1, (now - startedAt) / DURATION);
  const flying = startedAt !== null && k < 1;
  const env = (k * 5) % 1;
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#2b3342" />
      <rect x="20" y="20" width="360" height="200" rx="8" fill="#0f2740" stroke="#000" strokeWidth="3" />
      <path d="M50 150 h70 l10 -14 h40 v70 h-120 z" fill="#f2c14e" stroke="#000" strokeWidth="3" />
      <rect x="50" y="150" width="120" height="56" fill="#f7d774" stroke="#000" strokeWidth="3" />
      <path d="M290 110 a28 28 0 0 1 50 10 a22 22 0 0 1 -4 44 h-62 a24 24 0 0 1 16 -54 z" fill="#e6f1ff" stroke="#000" strokeWidth="3" />
      {flying && (
        <g transform={`translate(${130 + env * 170}, ${150 - Math.sin(env * Math.PI) * 70})`}>
          <rect x="-14" y="-10" width="28" height="20" rx="2" fill="#fff" stroke="#000" strokeWidth="2" />
          <path d="M-14 -10 L0 2 L14 -10" fill="none" stroke="#000" strokeWidth="2" />
        </g>
      )}
      <text x="200" y="48" textAnchor="middle" fill="#9ecbff" fontFamily="monospace" fontSize="14">
        {k >= 1 ? 'COMPLETE' : startedAt ? 'PROCESSING…' : 'PROCESS DATA'}
      </text>
      <rect x="30" y="236" width="220" height="22" rx="4" fill="#111" stroke="#000" strokeWidth="2" />
      <rect x="33" y="239" width={214 * k} height="16" rx="3" fill="#3fdc6c" />
      <text x="140" y="280" textAnchor="middle" fill="#9aa6b8" fontSize="12">
        {Math.round(k * 100)}%
      </text>
      <g style={{ cursor: startedAt ? 'default' : 'pointer' }} onClick={() => startedAt === null && setStartedAt(performance.now())}>
        <rect x="270" y="232" width="110" height="46" rx="8" fill={startedAt ? '#335' : '#3f8cff'} stroke="#000" strokeWidth="3" />
        <text x="325" y="261" textAnchor="middle" fill="#fff" fontWeight="800" fontSize="15">
          Process
        </text>
      </g>
    </svg>
  );
}
