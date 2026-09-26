import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

const OUT_X = 70;

/** Drag every leaf into the suction vent on the left. */
export function CleanO2Filter({ params, onComplete }: TaskGameProps) {
  const start = useMemo(() => {
    const r = seeded(params.seed);
    return Array.from({ length: 6 }, () => ({ x: 170 + r() * 190, y: 50 + r() * 200, rot: r() * 360, gone: false }));
  }, [params.seed]);
  const [leaves, setLeaves] = useState(start);
  const drag = useRef<{ i: number; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drop = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (leaves[d.i].x < OUT_X + 20) {
      const next = leaves.map((v, j) => (j === d.i ? { ...v, x: -40, gone: true } : v));
      setLeaves(next);
      if (next.every((v) => v.gone)) onComplete();
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
        setLeaves(leaves.map((v, j) => (j === d.i ? { ...v, x: Math.max(20, Math.min(380, p.x - d.dx)), y: Math.max(20, Math.min(280, p.y - d.dy)) } : v)));
      }}
      onPointerUp={drop}
      onPointerLeave={drop}
    >
      <rect width="400" height="300" rx="10" fill="#2e3a45" />
      <rect x="10" y="10" width="380" height="280" rx="8" fill="#c7d6dd" stroke="#000" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={100 + i * 24} y1="14" x2={100 + i * 24} y2="286" stroke="#b3c4cc" strokeWidth="2" />
      ))}
      <rect x="10" y="90" width={OUT_X} height="120" fill="#1c252d" stroke="#000" strokeWidth="3" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="16" y1={104 + i * 28} x2={OUT_X + 4} y2={104 + i * 28} stroke="#42505c" strokeWidth="4" />
      ))}
      <text x={OUT_X / 2 + 10} y="84" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1c252d">
        ◀ OUT
      </text>
      {leaves.map((l, i) =>
        l.gone ? null : (
          <g
            key={i}
            transform={`translate(${l.x}, ${l.y}) rotate(${l.rot})`}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              const p = svgPoint(svgRef.current!, e);
              drag.current = { i, dx: p.x - l.x, dy: p.y - l.y };
            }}
          >
            <path d="M-22 0 C-10 -16 12 -16 24 0 C12 16 -10 16 -22 0 Z" fill="#5fae4a" stroke="#1f3d17" strokeWidth="2.5" />
            <line x1="-20" y1="0" x2="22" y2="0" stroke="#2d6a22" strokeWidth="2" />
          </g>
        ),
      )}
    </svg>
  );
}
