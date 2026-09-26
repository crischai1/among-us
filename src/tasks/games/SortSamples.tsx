import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

type Kind = 'plant' | 'mineral' | 'fossil';
const BINS: { kind: Kind; label: string; x: number; color: string }[] = [
  { kind: 'plant', label: 'PLANTS', x: 70, color: '#3fa34d' },
  { kind: 'mineral', label: 'MINERALS', x: 200, color: '#3f8cff' },
  { kind: 'fossil', label: 'FOSSILS', x: 330, color: '#c9a36b' },
];
const ITEMS: { kind: Kind; icon: string }[] = [
  { kind: 'plant', icon: '🌿' },
  { kind: 'plant', icon: '🍄' },
  { kind: 'mineral', icon: '💎' },
  { kind: 'mineral', icon: '🪨' },
  { kind: 'fossil', icon: '🦴' },
  { kind: 'fossil', icon: '🐚' },
];

/** Drag each sample into the right bin. */
export function SortSamples({ params, onComplete }: TaskGameProps) {
  const start = useMemo(() => {
    const r = seeded(params.seed);
    const order = ITEMS.map((_, i) => i).sort(() => r() - 0.5);
    return order.map((idx, slot) => ({ idx, x: 55 + slot * 58, y: 60 + (slot % 2) * 36 }));
  }, [params.seed]);
  const [items, setItems] = useState(start.map((s) => ({ ...s, done: false })));
  const [shake, setShake] = useState<number | null>(null);
  const drag = useRef<{ i: number; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drop = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const it = items[d.i];
    const bin = it.y > 170 ? BINS.find((b) => Math.abs(it.x - b.x) < 60) : undefined;
    if (bin && bin.kind === ITEMS[it.idx].kind) {
      const next = items.map((v, j) => (j === d.i ? { ...v, x: bin.x - 30 + (items.filter((w) => w.done && ITEMS[w.idx].kind === bin.kind).length * 50), y: 240, done: true } : v));
      setItems(next);
      if (next.every((v) => v.done)) onComplete();
      return;
    }
    if (bin) {
      setShake(d.i);
      setTimeout(() => setShake(null), 400);
    }
    setItems(items.map((v, j) => (j === d.i ? { ...v, x: start[j].x, y: start[j].y } : v)));
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
        setItems(items.map((v, j) => (j === d.i ? { ...v, x: p.x - d.dx, y: p.y - d.dy } : v)));
      }}
      onPointerUp={drop}
      onPointerLeave={drop}
    >
      <rect width="400" height="300" rx="10" fill="#dfe7ee" />
      <rect x="20" y="30" width="360" height="100" rx="8" fill="#f7fafc" stroke="#000" strokeWidth="3" />
      <text x="200" y="22" textAnchor="middle" fontSize="13" fill="#445" fontWeight="700">
        Drag each sample into its bin
      </text>
      {BINS.map((b) => (
        <g key={b.kind}>
          <rect x={b.x - 60} y="185" width="120" height="100" rx="8" fill={b.color} stroke="#000" strokeWidth="3" opacity="0.85" />
          <text x={b.x} y="206" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" stroke="#000" strokeWidth="0.6">
            {b.label}
          </text>
        </g>
      ))}
      {items.map((it, i) => (
        <g
          key={i}
          transform={`translate(${it.x + (shake === i ? 4 : 0)}, ${it.y})`}
          style={{ cursor: it.done ? 'default' : 'grab' }}
          onPointerDown={(e) => {
            if (it.done) return;
            const p = svgPoint(svgRef.current!, e);
            drag.current = { i, dx: p.x - it.x, dy: p.y - it.y };
          }}
        >
          <circle r="22" fill="#fff" stroke="#000" strokeWidth="2.5" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="24">
            {ITEMS[it.idx].icon}
          </text>
        </g>
      ))}
    </svg>
  );
}
