import { useRef, useState } from 'react';
import { svgPoint, type TaskGameProps } from '../types';

export function SwipeCard({ onComplete }: TaskGameProps) {
  const [inSlot, setInSlot] = useState(false);
  const [x, setX] = useState(40);
  const [msg, setMsg] = useState('Please insert card');
  const [ok, setOk] = useState(false);
  const drag = useRef<{ start: number; off: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const END = 320;

  const release = () => {
    const d = drag.current;
    if (!d || ok) return;
    drag.current = null;
    const t = performance.now() - d.start;
    if (x < END) setMsg('Bad read. Try again.');
    else if (t < 450) setMsg('Too fast. Try again.');
    else if (t > 1400) setMsg('Too slow. Try again.');
    else {
      setMsg('Accepted. Thank you.');
      setOk(true);
      onComplete();
      return;
    }
    setX(40);
  };

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => {
        if (!drag.current) return;
        const p = svgPoint(svgRef.current!, e);
        setX(Math.max(40, Math.min(END, p.x - drag.current.off)));
      }}
      onPointerUp={release}
      onPointerLeave={release}
    >
      <rect width="400" height="300" rx="10" fill="#3c4450" />
      <rect x="20" y="20" width="360" height="40" rx="6" fill="#0d2b12" stroke="#000" strokeWidth={3} />
      <text x="200" y="47" textAnchor="middle" fill={ok ? '#4dff6a' : '#9dffac'} fontFamily="monospace" fontSize="16">
        {msg}
      </text>
      <rect x="20" y="80" width="360" height="40" rx="4" fill="#222" stroke="#000" strokeWidth={3} />
      <circle cx="355" cy="100" r="7" fill={ok ? '#4dff6a' : msg.includes('Try') ? '#ff3b3b' : '#555'} />
      <rect x="20" y="170" width="360" height="110" rx="10" fill="#6b4a2d" stroke="#000" strokeWidth={3} />
      <g
        transform={`translate(${inSlot ? x - 40 : 0}, ${inSlot ? 0 : 110})`}
        style={{ cursor: 'grab', transition: inSlot && !drag.current ? 'transform 0.2s' : undefined }}
        onPointerDown={(e) => {
          if (!inSlot) {
            setInSlot(true);
            setMsg('Please swipe card');
            return;
          }
          const p = svgPoint(svgRef.current!, e);
          drag.current = { start: performance.now(), off: p.x - x };
        }}
      >
        <rect x="40" y="70" width="120" height="75" rx="8" fill="#f5f0c8" stroke="#000" strokeWidth={3} />
        <rect x="52" y="85" width="34" height="42" rx="4" fill="#9ec3d6" stroke="#000" strokeWidth={2} />
        <rect x="95" y="90" width="52" height="7" fill="#555" />
        <rect x="95" y="105" width="40" height="7" fill="#555" />
      </g>
    </svg>
  );
}
