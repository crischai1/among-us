import { useMemo, useRef, useState } from 'react';
import { seeded, svgPoint, type TaskGameProps } from '../types';

const SKY = 900;

/** Drag the sky around until the highlighted object sits in the crosshair. */
export function AlignTelescope({ params, onComplete }: TaskGameProps) {
  const { stars, target } = useMemo(() => {
    const r = seeded(params.seed);
    return {
      stars: Array.from({ length: 120 }, () => ({ x: r() * SKY, y: r() * SKY, s: 0.6 + r() * 1.8 })),
      target: { x: 150 + r() * (SKY - 300), y: 150 + r() * (SKY - 300) },
    };
  }, [params.seed]);
  // Offset of the sky: the view shows sky point (200 - off.x, 150 - off.y) in the centre.
  const [off, setOff] = useState({ x: 200 - SKY / 2, y: 150 - SKY / 2 });
  const [done, setDone] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const tx = target.x + off.x;
  const ty = target.y + off.y;
  const onTarget = Math.hypot(tx - 200, ty - 150) < 14;

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      style={{ cursor: done ? 'default' : 'move' }}
      onPointerDown={(e) => {
        if (done) return;
        drag.current = svgPoint(svgRef.current!, e);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const p = svgPoint(svgRef.current!, e);
        const dx = p.x - drag.current.x;
        const dy = p.y - drag.current.y;
        drag.current = p;
        setOff((o) => ({ x: Math.min(200, Math.max(200 - SKY, o.x + dx)), y: Math.min(150, Math.max(150 - SKY, o.y + dy)) }));
      }}
      onPointerUp={() => {
        drag.current = null;
        if (onTarget && !done) {
          setDone(true);
          onComplete();
        }
      }}
      onPointerLeave={() => (drag.current = null)}
    >
      <rect width="400" height="300" rx="10" fill="#060b18" />
      <g transform={`translate(${off.x}, ${off.y})`}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity="0.7" />
        ))}
        <circle cx={target.x} cy={target.y} r="14" fill="#ff7ad9" stroke="#fff" strokeWidth="2" />
        <ellipse cx={target.x} cy={target.y} rx="24" ry="6" fill="none" stroke="#ffc2ee" strokeWidth="2" />
      </g>
      <circle cx="200" cy="150" r="40" fill="none" stroke={onTarget ? '#3fdc6c' : '#46d2ff'} strokeWidth="2.5" />
      <line x1="200" y1="100" x2="200" y2="200" stroke={onTarget ? '#3fdc6c' : '#46d2ff'} strokeWidth="1.5" />
      <line x1="150" y1="150" x2="250" y2="150" stroke={onTarget ? '#3fdc6c' : '#46d2ff'} strokeWidth="1.5" />
      <circle cx="200" cy="150" r="140" fill="none" stroke="#000" strokeWidth="80" opacity="0.5" />
      <text x="200" y="288" textAnchor="middle" fill="#9ecbff" fontSize="13">
        {done ? 'Telescope aligned' : 'Drag the sky to centre the pink planet'}
      </text>
    </svg>
  );
}
