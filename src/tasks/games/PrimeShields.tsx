import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

/** Seven hexagons: centre plus a ring. */
const HEXES = [
  [0, 0],
  ...Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3 + Math.PI / 6) * 78, Math.sin((i * Math.PI) / 3 + Math.PI / 6) * 78]),
];
const hex = (r: number) =>
  Array.from({ length: 6 }, (_, i) => `${Math.cos((i * Math.PI) / 3) * r},${Math.sin((i * Math.PI) / 3) * r}`).join(' ');

/** Tap every red panel until the whole shield glows white. */
export function PrimeShields({ params, onComplete }: TaskGameProps) {
  const initial = useMemo(() => {
    const r = seeded(params.seed);
    const off = HEXES.map(() => r() < 0.55);
    if (!off.some(Boolean)) off[Math.floor(r() * off.length)] = true;
    return off;
  }, [params.seed]);
  const [off, setOff] = useState(initial);

  const tap = (i: number) => {
    if (!off.some(Boolean)) return;
    const next = off.map((v, j) => (j === i ? !v : v));
    setOff(next);
    if (!next.some(Boolean)) onComplete();
  };

  const done = !off.some(Boolean);
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#1b2230" />
      <circle cx="200" cy="150" r="135" fill={done ? 'rgba(255,255,255,0.12)' : 'rgba(255,60,60,0.08)'} stroke="#3a4559" strokeWidth="4" />
      {HEXES.map(([x, y], i) => (
        <g key={i} transform={`translate(${200 + x}, ${150 + y})`} style={{ cursor: 'pointer' }} onClick={() => tap(i)}>
          <polygon points={hex(42)} fill={off[i] ? '#e53935' : '#f4f7fb'} stroke="#000" strokeWidth="3" />
          <polygon points={hex(28)} fill="none" stroke={off[i] ? '#ff9a9a' : '#b8c7d9'} strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
