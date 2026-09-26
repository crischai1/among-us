import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

const ITEMS = ['💎', '💀', '🦴', '🥚'];
const SLOTS = [
  { x: 250, y: 70 },
  { x: 330, y: 70 },
  { x: 250, y: 190 },
  { x: 330, y: 190 },
];

/** Drag each artifact into the case slot shaped like it. */
export function StoreArtifacts({ params, onComplete }: TaskGameProps) {
  const start = useMemo(() => {
    const r = seeded(params.seed);
    const order = [0, 1, 2, 3].sort(() => r() - 0.5);
    return ITEMS.map((_, i) => ({ x: 70 + (order[i] % 2) * 80, y: 80 + Math.floor(order[i] / 2) * 110 }));
  }, [params.seed]);
  const [pos, setPos] = useState(start.map((p) => ({ ...p, done: false })));
  const drag = useRef<{ i: number; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drop = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const slot = SLOTS[d.i];
    const p = pos[d.i];
    if (Math.hypot(p.x - slot.x, p.y - slot.y) < 30) {
      const next = pos.map((v, j) => (j === d.i ? { ...slot, done: true } : v));
      setPos(next);
      if (next.every((v) => v.done)) onComplete();
    } else {
      setPos(pos.map((v, j) => (j === d.i ? { ...start[j], done: false } : v)));
    }
  };

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const p = svgPoint(svgRef.current!, e);
        setPos(pos.map((v, j) => (j === d.i ? { ...v, x: p.x - d.dx, y: p.y - d.dy } : v)));
      }}
      onPointerUp={drop}
      onPointerLeave={drop}
    >
      <rect width="400" height="300" rx="10" fill="#2e2a38" />
      <rect x="200" y="20" width="185" height="260" rx="10" fill="#43506a" stroke="#000" strokeWidth="4" />
      {SLOTS.map((s, i) => (
        <g key={i}>
          <rect x={s.x - 34} y={s.y - 34} width="68" height="68" rx="8" fill="#1d2433" stroke="#000" strokeWidth="2" />
          <text x={s.x} y={s.y} textAnchor="middle" dominantBaseline="central" fontSize="34" opacity="0.25">
            {ITEMS[i]}
          </text>
        </g>
      ))}
      {pos.map((p, i) => (
        <g
          key={i}
          transform={`translate(${p.x}, ${p.y})`}
          style={{ cursor: p.done ? 'default' : 'grab' }}
          onPointerDown={(e) => {
            if (p.done) return;
            const q = svgPoint(svgRef.current!, e);
            drag.current = { i, dx: q.x - p.x, dy: q.y - p.y };
          }}
        >
          <text textAnchor="middle" dominantBaseline="central" fontSize="38">
            {ITEMS[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
