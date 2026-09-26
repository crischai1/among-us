import { useRef, useState } from 'react';
import { svgPoint, type TaskGameProps } from '../types';

const SLOT = { x: 200, y: 120 };

/** Drag the key into the ignition, then turn it. */
export function InsertKeys({ onComplete }: TaskGameProps) {
  const [key, setKey] = useState({ x: 90, y: 240 });
  const [inserted, setInserted] = useState(false);
  const [turned, setTurned] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drop = () => {
    if (!drag.current) return;
    drag.current = null;
    if (Math.hypot(key.x - SLOT.x, key.y - SLOT.y) < 40) {
      setKey(SLOT);
      setInserted(true);
    }
  };

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => {
        if (!drag.current) return;
        const p = svgPoint(svgRef.current!, e);
        setKey({ x: p.x - drag.current.dx, y: p.y - drag.current.dy });
      }}
      onPointerUp={drop}
      onPointerLeave={drop}
    >
      <rect width="400" height="300" rx="10" fill="#39424e" />
      <circle cx={SLOT.x} cy={SLOT.y} r="70" fill="#222a33" stroke="#000" strokeWidth="4" />
      <circle cx={SLOT.x} cy={SLOT.y} r="52" fill="#4b5563" stroke="#000" strokeWidth="3" />
      <rect x={SLOT.x - 6} y={SLOT.y - 26} width="12" height="52" rx="4" fill="#0b0f14" />
      <text x={SLOT.x - 80} y={SLOT.y + 5} fill="#9aa6b8" fontSize="13" fontWeight="800" textAnchor="middle">
        OFF
      </text>
      <text x={SLOT.x + 80} y={SLOT.y + 5} fill={turned ? '#3fdc6c' : '#9aa6b8'} fontSize="13" fontWeight="800" textAnchor="middle">
        ON
      </text>
      <g
        transform={`translate(${key.x}, ${key.y}) rotate(${turned ? 90 : 0})`}
        style={{ cursor: inserted ? 'pointer' : 'grab', transition: 'transform 0.25s' }}
        onPointerDown={(e) => {
          if (inserted) return;
          const p = svgPoint(svgRef.current!, e);
          drag.current = { dx: p.x - key.x, dy: p.y - key.y };
        }}
        onClick={() => {
          if (!inserted || turned) return;
          setTurned(true);
          onComplete();
        }}
      >
        <rect x="-5" y="-22" width="10" height="44" rx="2" fill="#d9c27a" stroke="#000" strokeWidth="2" />
        <circle cx="0" cy="36" r="18" fill="#e8c95a" stroke="#000" strokeWidth="3" />
        <circle cx="0" cy="36" r="6" fill="#39424e" stroke="#000" strokeWidth="2" />
      </g>
      <text x="200" y="285" textAnchor="middle" fill="#dfe6ee" fontSize="14">
        {turned ? 'Engine keyed in.' : inserted ? 'Click the key to turn it' : 'Drag the key into the slot'}
      </text>
    </svg>
  );
}
