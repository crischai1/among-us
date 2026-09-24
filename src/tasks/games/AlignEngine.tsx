import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

export function AlignEngine({ params, step, onComplete }: TaskGameProps) {
  const start = useMemo(() => {
    const r = seeded(Number(params.seed) + step * 7)();
    return (r < 0.5 ? -1 : 1) * (0.45 + r * 0.45);
  }, [params.seed, step]);
  const [v, setV] = useState(start);
  const [done, setDone] = useState(false);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const aligned = Math.abs(v) < 0.05;
  const hy = 150 + v * 120;

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => {
        if (!dragging.current || done) return;
        const p = svgPoint(svgRef.current!, e);
        setV(Math.max(-1, Math.min(1, (p.y - 150) / 120)));
      }}
      onPointerUp={() => {
        dragging.current = false;
        if (aligned && !done) {
          setDone(true);
          setV(0);
          onComplete();
        }
      }}
      onPointerLeave={() => (dragging.current = false)}
    >
      <rect width="400" height="300" rx="10" fill="#1d2430" />
      <line x1="40" y1="150" x2="330" y2="150" stroke="#4dff6a" strokeWidth="2" strokeDasharray="8 6" />
      <line x1="40" y1="150" x2="330" y2={150 + v * 150} stroke={aligned ? '#4dff6a' : '#ff5a3b'} strokeWidth="5" />
      <circle cx="40" cy="150" r="16" fill="#8d97a3" stroke="#000" strokeWidth="3" />
      <path d="M350 30 Q390 150 350 270" fill="none" stroke="#555" strokeWidth="14" strokeLinecap="round" />
      <g onPointerDown={() => (dragging.current = true)} style={{ cursor: 'ns-resize' }}>
        <rect x="340" y={hy - 16} width="46" height="32" rx="6" fill="#d5dbe2" stroke="#000" strokeWidth="3" />
        <path d={`M350 ${hy} h26`} stroke="#000" strokeWidth="3" />
      </g>
      <text x="200" y="290" textAnchor="middle" fill="#aab" fontSize="14">
        Drag the lever to align the engine output
      </text>
    </svg>
  );
}
