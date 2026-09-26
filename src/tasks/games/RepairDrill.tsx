import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

/** Click every flashing warning on the drill to reset it. */
export function RepairDrill({ params, onComplete }: TaskGameProps) {
  const spots = useMemo(() => {
    const r = seeded(params.seed);
    return Array.from({ length: 4 }, (_, i) => ({ x: 90 + (i % 2) * 150 + r() * 60, y: 70 + Math.floor(i / 2) * 110 + r() * 40 }));
  }, [params.seed]);
  const [fixed, setFixed] = useState(spots.map(() => false));
  const fix = (i: number) => {
    if (fixed[i]) return;
    const next = fixed.map((v, j) => v || j === i);
    setFixed(next);
    if (next.every(Boolean)) onComplete();
  };
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#3a3530" />
      <rect x="150" y="20" width="100" height="200" rx="10" fill="#6b7480" stroke="#000" strokeWidth="4" />
      <path d="M170 220 L200 285 L230 220 Z" fill="#b8a34a" stroke="#000" strokeWidth="4" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="178" y1={235 + i * 12} x2="222" y2={229 + i * 12} stroke="#6b5a1d" strokeWidth="3" />
      ))}
      <rect x="60" y="120" width="90" height="30" rx="6" fill="#4b5563" stroke="#000" strokeWidth="3" />
      <rect x="250" y="120" width="90" height="30" rx="6" fill="#4b5563" stroke="#000" strokeWidth="3" />
      {spots.map((s, i) =>
        fixed[i] ? (
          <circle key={i} cx={s.x} cy={s.y} r="14" fill="#3fdc6c" stroke="#000" strokeWidth="2" />
        ) : (
          <g key={i} style={{ cursor: 'pointer' }} onClick={() => fix(i)} className="drill-warning">
            <path d={`M${s.x} ${s.y - 22} L${s.x + 22} ${s.y + 16} L${s.x - 22} ${s.y + 16} Z`} fill="#ffd23b" stroke="#000" strokeWidth="3" />
            <text x={s.x} y={s.y + 12} textAnchor="middle" fontSize="20" fontWeight="900">
              !
            </text>
          </g>
        ),
      )}
    </svg>
  );
}
