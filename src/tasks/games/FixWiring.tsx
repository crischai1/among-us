import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

const WIRE_COLORS = ['#ff2d2d', '#2d6bff', '#ffe135', '#ff3dd8'];

export function FixWiring({ params, step, onComplete }: TaskGameProps) {
  const [left, right] = useMemo(() => {
    const rng = seeded(Number(params.seed) + step);
    const sh = () => [0, 1, 2, 3].sort(() => rng() - 0.5);
    return [sh(), sh()];
  }, [params.seed, step]);
  const [done, setDone] = useState<number[]>([]);
  const [drag, setDrag] = useState<{ color: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ly = (i: number) => 50 + i * 65;

  const up = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = svgPoint(svgRef.current!, e);
    const idx = right.findIndex((_, i) => Math.abs(p.y - ly(i)) < 28 && p.x > 320);
    if (idx >= 0 && right[idx] === drag.color && !done.includes(drag.color)) {
      const next = [...done, drag.color];
      setDone(next);
      if (next.length === 4) onComplete();
    }
    setDrag(null);
  };

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => drag && setDrag({ ...drag, ...svgPoint(svgRef.current!, e) })}
      onPointerUp={up}
      onPointerLeave={() => setDrag(null)}
    >
      <rect width="400" height="300" rx="10" fill="#2b2f36" />
      {done.map((c) => (
        <line key={c} x1={42} y1={ly(left.indexOf(c))} x2={358} y2={ly(right.indexOf(c))} stroke={WIRE_COLORS[c]} strokeWidth={14} strokeLinecap="round" />
      ))}
      {drag && <line x1={42} y1={ly(left.indexOf(drag.color))} x2={drag.x} y2={drag.y} stroke={WIRE_COLORS[drag.color]} strokeWidth={14} strokeLinecap="round" />}
      {left.map((c, i) => (
        <g key={`l${c}`} onPointerDown={(e) => !done.includes(c) && setDrag({ color: c, ...svgPoint(svgRef.current!, e) })} style={{ cursor: 'grab' }}>
          <rect x={0} y={ly(i) - 12} width={30} height={24} fill={WIRE_COLORS[c]} stroke="#000" strokeWidth={2} />
          <rect x={30} y={ly(i) - 9} width={14} height={18} fill="#c9a04a" stroke="#000" strokeWidth={2} />
          <circle cx={36} cy={ly(i)} r={20} fill="transparent" />
        </g>
      ))}
      {right.map((c, i) => (
        <g key={`r${c}`}>
          <rect x={356} y={ly(i) - 9} width={14} height={18} fill="#c9a04a" stroke="#000" strokeWidth={2} />
          <rect x={370} y={ly(i) - 12} width={30} height={24} fill={WIRE_COLORS[c]} stroke="#000" strokeWidth={2} />
          <circle cx={380} cy={ly(i) - 22} r={5} fill={done.includes(c) ? '#ffe135' : '#444'} />
        </g>
      ))}
    </svg>
  );
}
