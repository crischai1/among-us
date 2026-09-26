import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

const SNAP = 26;

/** Drag the ship along the course, waypoint by waypoint. */
export function ChartCourse({ params, onComplete }: TaskGameProps) {
  const points = useMemo(() => {
    const r = seeded(params.seed);
    return Array.from({ length: 5 }, (_, i) => ({ x: 40 + i * 80, y: 70 + r() * 160 }));
  }, [params.seed]);
  const [reached, setReached] = useState(0);
  const [ship, setShip] = useState(points[0]);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const done = reached === points.length - 1;

  const move = (e: React.PointerEvent) => {
    if (!dragging.current || done) return;
    const p = svgPoint(svgRef.current!, e);
    // The ship slides along the current leg only, so the course has to be followed.
    const a = points[reached];
    const b = points[reached + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    if (Math.hypot(q.x - b.x, q.y - b.y) < SNAP) {
      setShip(b);
      const n = reached + 1;
      setReached(n);
      if (n === points.length - 1) {
        dragging.current = false;
        onComplete();
      }
    } else {
      setShip(q);
    }
  };

  const angle = done ? 0 : (Math.atan2(points[reached + 1].y - points[reached].y, points[reached + 1].x - points[reached].x) * 180) / Math.PI;
  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={move}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      <rect width="400" height="300" rx="10" fill="#0b1a2e" />
      {Array.from({ length: 30 }, (_, i) => (
        <circle key={i} cx={(i * 137) % 400} cy={(i * 71) % 300} r={1 + (i % 3) * 0.5} fill="#fff" opacity="0.6" />
      ))}
      <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#46d2ff" strokeWidth="3" strokeDasharray="8 7" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="11" fill={i <= reached ? '#3fdc6c' : '#0b1a2e'} stroke="#46d2ff" strokeWidth="3" />
      ))}
      <g
        transform={`translate(${ship.x}, ${ship.y}) rotate(${angle})`}
        style={{ cursor: done ? 'default' : 'grab' }}
        onPointerDown={() => (dragging.current = true)}
      >
        <circle r="26" fill="transparent" />
        <path d="M22 0 L-12 -13 L-6 0 L-12 13 Z" fill="#f4f7fb" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <text x="200" y="285" textAnchor="middle" fill="#9ecbff" fontSize="13">
        {done ? 'Course charted' : 'Drag the ship to each waypoint'}
      </text>
    </svg>
  );
}
