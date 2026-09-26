import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

/** Five shards of a crystal, as polygons around its centre (220, 150). */
const CX = 250;
const CY = 150;
const OUTLINE = [
  [0, -110], [55, -40], [45, 60], [0, 115], [-45, 60], [-55, -40],
];
const SHARDS = [
  [[0, -110], [55, -40], [0, -10]],
  [[55, -40], [45, 60], [0, -10]],
  [[45, 60], [0, 115], [0, -10]],
  [[0, 115], [-45, 60], [0, -10]],
  [[-45, 60], [-55, -40], [0, -10], [0, -110]],
];
const SNAP = 22;

/** Drag the broken pieces back into place. */
export function AssembleArtifact({ params, onComplete }: TaskGameProps) {
  const start = useMemo(() => {
    const r = seeded(params.seed);
    return SHARDS.map((_, i) => ({ x: -170 + (r() - 0.5) * 30, y: -95 + i * 48 + (r() - 0.5) * 10, rot: (r() - 0.5) * 50 }));
  }, [params.seed]);
  const [pos, setPos] = useState(start.map((s) => ({ ...s, done: false })));
  const drag = useRef<{ i: number; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drop = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const p = pos[d.i];
    if (Math.hypot(p.x, p.y) < SNAP) {
      const next = pos.map((v, j) => (j === d.i ? { x: 0, y: 0, rot: 0, done: true } : v));
      setPos(next);
      if (next.every((v) => v.done)) onComplete();
    }
  };

  const pts = (poly: number[][]) => poly.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const p = svgPoint(svgRef.current!, e);
        setPos(pos.map((v, j) => (j === d.i ? { ...v, x: p.x - d.dx, y: p.y - d.dy, rot: v.rot * 0.85 } : v)));
      }}
      onPointerUp={drop}
      onPointerLeave={drop}
    >
      <rect width="400" height="300" rx="10" fill="#1e2a36" />
      <ellipse cx={CX} cy={CY + 125} rx="90" ry="14" fill="#0d141b" />
      <polygon points={pts(OUTLINE.map(([x, y]) => [x + CX, y + CY]))} fill="rgba(110,231,255,0.08)" stroke="#6ee7ff" strokeDasharray="6 5" strokeWidth="2" />
      {pos.every((v) => v.done) && <circle cx={CX} cy={CY} r="120" fill="rgba(110,231,255,0.15)" />}
      {SHARDS.map((poly, i) => {
        const p = pos[i];
        return (
          <g
            key={i}
            transform={`translate(${CX + p.x}, ${CY + p.y}) rotate(${p.rot})`}
            style={{ cursor: p.done ? 'default' : 'grab' }}
            onPointerDown={(e) => {
              if (p.done) return;
              const q = svgPoint(svgRef.current!, e);
              drag.current = { i, dx: q.x - p.x, dy: q.y - p.y };
            }}
          >
            <polygon points={pts(poly)} fill={['#6ee7ff', '#4fc3f7', '#81d4fa', '#29b6f6', '#b3e5fc'][i]} stroke="#063247" strokeWidth="3" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}
