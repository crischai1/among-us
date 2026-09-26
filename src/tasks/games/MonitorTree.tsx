import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

const GAUGES = [
  { label: 'WATER', color: '#46b1ff' },
  { label: 'NUTR.', color: '#c9a36b' },
  { label: 'CO₂', color: '#b6b6c8' },
  { label: 'LIGHT', color: '#ffd23b' },
];
const TOP = 60;
const BOTTOM = 250;
const TOLERANCE = 0.06;

/** Drag each gauge to its target mark. */
export function MonitorTree({ params, onComplete }: TaskGameProps) {
  const { targets, start } = useMemo(() => {
    const r = seeded(params.seed);
    const targets = GAUGES.map(() => 0.2 + r() * 0.6);
    return { targets, start: targets.map((t) => (t > 0.5 ? t - 0.3 - r() * 0.1 : t + 0.3 + r() * 0.1)) };
  }, [params.seed]);
  const [levels, setLevels] = useState(start);
  const dragging = useRef<number | null>(null);
  const done = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const ok = (i: number, ls = levels) => Math.abs(ls[i] - targets[i]) < TOLERANCE;

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => {
        const i = dragging.current;
        if (i === null || done.current) return;
        const p = svgPoint(svgRef.current!, e);
        const v = Math.max(0, Math.min(1, (BOTTOM - p.y) / (BOTTOM - TOP)));
        setLevels(levels.map((l, j) => (j === i ? v : l)));
      }}
      onPointerUp={() => {
        dragging.current = null;
        if (!done.current && levels.every((_, i) => ok(i))) {
          done.current = true;
          onComplete();
        }
      }}
      onPointerLeave={() => (dragging.current = null)}
    >
      <rect width="400" height="300" rx="10" fill="#1f3326" />
      <circle cx="200" cy="30" r="18" fill="#3f9a46" stroke="#000" strokeWidth="2" />
      {GAUGES.map((gauge, i) => {
        const x = 70 + i * 85;
        const y = BOTTOM - levels[i] * (BOTTOM - TOP);
        const ty = BOTTOM - targets[i] * (BOTTOM - TOP);
        return (
          <g key={gauge.label}>
            <rect x={x - 12} y={TOP} width="24" height={BOTTOM - TOP} rx="6" fill="#0c1610" stroke="#000" strokeWidth="2" />
            <rect x={x - 9} y={y} width="18" height={BOTTOM - y} rx="4" fill={gauge.color} opacity="0.8" />
            <line x1={x - 22} y1={ty} x2={x + 22} y2={ty} stroke={ok(i) ? '#3fdc6c' : '#ff5a4a'} strokeWidth="3" />
            <g style={{ cursor: 'ns-resize' }} onPointerDown={() => (dragging.current = i)}>
              <rect x={x - 18} y={y - 8} width="36" height="16" rx="4" fill="#e8edf3" stroke="#000" strokeWidth="2" />
            </g>
            <text x={x} y="275" textAnchor="middle" fill="#dfffd9" fontSize="12" fontWeight="800">
              {gauge.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
