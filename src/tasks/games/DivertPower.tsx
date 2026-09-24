import { useRef, useState } from 'react';
import { svgPoint, type TaskGameProps } from '../types';

const ROOMS = ['weapons', 'o2', 'navigation', 'shields', 'comms', 'upperEngine', 'lowerEngine', 'security'];
const SHORT: Record<string, string> = {
  weapons: 'WPN', o2: 'O2', navigation: 'NAV', shields: 'SHD', comms: 'COM', upperEngine: 'U.E', lowerEngine: 'L.E', security: 'SEC',
};

export function DivertPower({ step, params, onComplete }: TaskGameProps) {
  const target = String(params.target);
  const [level, setLevel] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const done = useRef(false);

  if (step === 1) {
    return (
      <div className="divert-accept">
        <div className="outline-text">Accept diverted power</div>
        <button
          className={`power-switch ${flipped ? 'on' : ''}`}
          onClick={() => {
            if (flipped) return;
            setFlipped(true);
            setTimeout(onComplete, 350);
          }}
        >
          <span />
        </button>
      </div>
    );
  }

  const idx = ROOMS.indexOf(target);
  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      onPointerMove={(e) => {
        if (!dragging.current || done.current) return;
        const p = svgPoint(svgRef.current!, e);
        const v = Math.max(0, Math.min(1, (250 - p.y) / 190));
        setLevel(v);
        if (v > 0.95) {
          done.current = true;
          setLevel(1);
          onComplete();
        }
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      <rect width="400" height="300" rx="10" fill="#2a2f37" />
      {ROOMS.map((r, i) => {
        const x = 30 + i * 46;
        const isT = i === idx;
        const y = isT ? 250 - level * 190 : 60;
        return (
          <g key={r}>
            <rect x={x + 8} y="55" width="10" height="200" rx="5" fill="#111" />
            <rect x={x + 8} y={y} width="10" height={250 - y} fill={isT ? '#ffd23b' : '#3dd0ff'} opacity={isT ? 0.9 : 0.35} />
            <g onPointerDown={() => isT && (dragging.current = true)} style={{ cursor: isT ? 'ns-resize' : 'default' }}>
              <rect x={x} y={y - 8} width="26" height="16" rx="3" fill={isT ? '#ffe56b' : '#9aa3ad'} stroke="#000" strokeWidth="2" />
            </g>
            <text x={x + 13} y="280" textAnchor="middle" fill={isT ? '#ffe56b' : '#9aa3ad'} fontSize="11" fontWeight="bold">
              {SHORT[r]}
            </text>
          </g>
        );
      })}
      <text x="200" y="30" textAnchor="middle" fill="#ddd" fontSize="14">
        Divert power to {SHORT[target]}
      </text>
    </svg>
  );
}
