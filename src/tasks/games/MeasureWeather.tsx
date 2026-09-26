import { useEffect, useRef, useState } from 'react';
import type { TaskGameProps } from '../types';

const DURATION = 3200;

/** Press the button; the dish sweeps the sky and reports the weather. */
export function MeasureWeather({ onComplete }: TaskGameProps) {
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
  const angle = k * 720;
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#243140" />
      <rect x="20" y="20" width="220" height="220" rx="10" fill="#061a10" stroke="#000" strokeWidth="3" />
      {[30, 60, 90].map((r) => (
        <circle key={r} cx="130" cy="130" r={r} fill="none" stroke="#1d6b3a" strokeWidth="2" />
      ))}
      <line x1="130" y1="30" x2="130" y2="230" stroke="#1d6b3a" strokeWidth="1.5" />
      <line x1="30" y1="130" x2="230" y2="130" stroke="#1d6b3a" strokeWidth="1.5" />
      {startedAt !== null && (
        <g transform={`rotate(${angle} 130 130)`}>
          <path d="M130 130 L130 38 A92 92 0 0 1 195 65 Z" fill="rgba(61,255,122,0.35)" />
          <line x1="130" y1="130" x2="130" y2="38" stroke="#3dff7a" strokeWidth="2.5" />
        </g>
      )}
      {k > 0.3 && <circle cx="170" cy="95" r="10" fill="rgba(61,255,122,0.6)" />}
      {k > 0.6 && <circle cx="95" cy="170" r="14" fill="rgba(61,255,122,0.5)" />}
      <rect x="255" y="20" width="125" height="150" rx="8" fill="#0b1520" stroke="#000" strokeWidth="3" />
      <text x="318" y="48" textAnchor="middle" fill="#7fe0ff" fontFamily="monospace" fontSize="13">
        WEATHER
      </text>
      <text x="268" y="80" fill="#9dffac" fontFamily="monospace" fontSize="12">
        TEMP {k >= 1 ? '-12°C' : '---'}
      </text>
      <text x="268" y="104" fill="#9dffac" fontFamily="monospace" fontSize="12">
        WIND {k >= 1 ? '48 kn' : '---'}
      </text>
      <text x="268" y="128" fill="#9dffac" fontFamily="monospace" fontSize="12">
        HUM. {k >= 1 ? '71 %' : '---'}
      </text>
      <text x="268" y="152" fill="#9dffac" fontFamily="monospace" fontSize="12">
        {k >= 1 ? 'CLOUDY ☁' : startedAt ? `SCAN ${Math.round(k * 100)}%` : 'READY'}
      </text>
      <rect x="20" y="255" width="220" height="16" rx="8" fill="#111" />
      <rect x="22" y="257" width={216 * k} height="12" rx="6" fill="#3dff7a" />
      <g style={{ cursor: startedAt ? 'default' : 'pointer' }} onClick={() => startedAt === null && setStartedAt(performance.now())}>
        <circle cx="318" cy="230" r="38" fill={startedAt ? '#7a1d1d' : '#e53935'} stroke="#000" strokeWidth="4" />
        <text x="318" y="236" textAnchor="middle" fill="#fff" fontWeight="800" fontSize="15">
          {startedAt ? '…' : 'START'}
        </text>
      </g>
    </svg>
  );
}
