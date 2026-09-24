import { useEffect, useRef, useState } from 'react';
import { svgPoint, type TaskGameProps } from '../types';

interface Rock {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dead: number;
}

const GOAL = 10;

export function ClearAsteroids({ onComplete }: TaskGameProps) {
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [hits, setHits] = useState(0);
  const [shot, setShot] = useState<{ x: number; y: number; t: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextId = useRef(1);
  const doneRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let spawn = 0;
    const tick = (t: number) => {
      const dt = Math.min(50, t - last) / 1000;
      last = t;
      spawn -= dt;
      setRocks((rs) => {
        let out = rs
          .map((r) => ({ ...r, x: r.x + r.vx * dt, y: r.y + r.vy * dt }))
          .filter((r) => r.x > -40 && r.y > -40 && r.y < 340 && (r.dead === 0 || t - r.dead < 250));
        if (spawn <= 0 && out.length < 6) {
          spawn = 0.55;
          out = [...out, { id: nextId.current++, x: 430, y: 30 + Math.random() * 240, vx: -(70 + Math.random() * 80), vy: (Math.random() - 0.5) * 50, r: 14 + Math.random() * 12, dead: 0 }];
        }
        return out;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fire = (e: React.PointerEvent) => {
    const p = svgPoint(svgRef.current!, e);
    setShot({ ...p, t: performance.now() });
    const hit = rocks.find((r) => !r.dead && Math.hypot(r.x - p.x, r.y - p.y) < r.r + 6);
    if (!hit) return;
    setRocks((rs) => rs.map((r) => (r.id === hit.id ? { ...r, dead: performance.now(), vx: 0, vy: 0 } : r)));
    const n = hits + 1;
    setHits(n);
    if (n >= GOAL && !doneRef.current) {
      doneRef.current = true;
      onComplete();
    }
  };

  return (
    <svg ref={svgRef} className="task-svg crosshair" viewBox="0 0 400 300" onPointerDown={fire}>
      <rect width="400" height="300" rx="10" fill="#07131f" />
      {Array.from({ length: 30 }, (_, i) => (
        <circle key={i} cx={(i * 137) % 400} cy={(i * 71) % 300} r={1} fill="#fff" opacity={0.5} />
      ))}
      {rocks.map((r) =>
        r.dead ? (
          <circle key={r.id} cx={r.x} cy={r.y} r={r.r + 6} fill="none" stroke="#ffb13b" strokeWidth={3} opacity={0.8} />
        ) : (
          <polygon
            key={r.id}
            points={Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const rr = r.r * (0.75 + ((r.id * (i + 3)) % 5) / 10);
              return `${r.x + Math.cos(a) * rr},${r.y + Math.sin(a) * rr}`;
            }).join(' ')}
            fill="#8b8f96"
            stroke="#3a3d42"
            strokeWidth={3}
          />
        ),
      )}
      {shot && performance.now() - shot.t < 150 && <line x1={200} y1={300} x2={shot.x} y2={shot.y} stroke="#4dff6a" strokeWidth={3} />}
      <text x="12" y="290" fill="#4dff6a" fontFamily="monospace" fontSize="16">
        Destroyed: {hits}/{GOAL}
      </text>
    </svg>
  );
}
