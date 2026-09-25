import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

// Okabe–Ito colorblind-safe palette, plus a unique shape per wire so color is never the only cue.
const WIRE_COLORS = ['#d55e00', '#0072b2', '#f0e442', '#cc79a7'];

function WireSymbol({ kind, x, y }: { kind: number; x: number; y: number }) {
  const common = { fill: '#fff', stroke: '#000', strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 0:
      return <circle cx={x} cy={y} r={7} {...common} />;
    case 1:
      return <polygon points={`${x},${y - 8} ${x + 8},${y + 6} ${x - 8},${y + 6}`} {...common} />;
    case 2:
      return <rect x={x - 6.5} y={y - 6.5} width={13} height={13} {...common} />;
    default:
      return <polygon points={`${x},${y - 9} ${x + 8},${y} ${x},${y + 9} ${x - 8},${y}`} {...common} />;
  }
}

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
          <rect x={0} y={ly(i) - 15} width={32} height={30} fill={WIRE_COLORS[c]} stroke="#000" strokeWidth={2} />
          <rect x={32} y={ly(i) - 9} width={12} height={18} fill="#c9a04a" stroke="#000" strokeWidth={2} />
          <WireSymbol kind={c} x={16} y={ly(i)} />
          <circle cx={30} cy={ly(i)} r={24} fill="transparent" />
        </g>
      ))}
      {right.map((c, i) => (
        <g key={`r${c}`}>
          <rect x={356} y={ly(i) - 9} width={12} height={18} fill="#c9a04a" stroke="#000" strokeWidth={2} />
          <rect x={368} y={ly(i) - 15} width={32} height={30} fill={WIRE_COLORS[c]} stroke="#000" strokeWidth={2} />
          <WireSymbol kind={c} x={384} y={ly(i)} />
          <circle cx={346} cy={ly(i) - 20} r={5} fill={done.includes(c) ? '#3dff6a' : '#444'} stroke="#000" strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  );
}
