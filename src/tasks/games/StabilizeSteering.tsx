import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

export function StabilizeSteering({ params, onComplete }: TaskGameProps) {
  const start = useMemo(() => {
    const r = seeded(params.seed);
    const a = r() * Math.PI * 2;
    return { x: 150 + Math.cos(a) * 90, y: 150 + Math.sin(a) * 90 };
  }, [params.seed]);
  const [p, setP] = useState(start);
  const [done, setDone] = useState(false);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const centered = Math.hypot(p.x - 150, p.y - 150) < 12;

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 300 300"
      style={{ maxWidth: 360 }}
      onPointerDown={(e) => {
        if (done) return;
        dragging.current = true;
        setP(svgPoint(svgRef.current!, e));
      }}
      onPointerMove={(e) => dragging.current && !done && setP(svgPoint(svgRef.current!, e))}
      onPointerUp={() => {
        dragging.current = false;
        if (centered && !done) {
          setDone(true);
          setP({ x: 150, y: 150 });
          onComplete();
        }
      }}
    >
      <circle cx="150" cy="150" r="140" fill="#0e2a3a" stroke="#000" strokeWidth="5" />
      <circle cx="150" cy="150" r="90" fill="none" stroke="#2fa6d6" strokeWidth="2" opacity="0.5" />
      <circle cx="150" cy="150" r="45" fill="none" stroke="#2fa6d6" strokeWidth="2" opacity="0.5" />
      <line x1="10" y1="150" x2="290" y2="150" stroke="#2fa6d6" opacity="0.5" />
      <line x1="150" y1="10" x2="150" y2="290" stroke="#2fa6d6" opacity="0.5" />
      <g transform={`translate(${p.x}, ${p.y})`}>
        <circle r="18" fill="none" stroke={centered ? '#4dff6a' : '#ffd23b'} strokeWidth="4" />
        <line x1="-28" x2="28" stroke={centered ? '#4dff6a' : '#ffd23b'} strokeWidth="3" />
        <line y1="-28" y2="28" stroke={centered ? '#4dff6a' : '#ffd23b'} strokeWidth="3" />
      </g>
    </svg>
  );
}
