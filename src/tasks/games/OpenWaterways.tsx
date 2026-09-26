import { useRef, useState } from 'react';
import { svgPoint, type TaskGameProps } from '../types';

const TURNS = 2;
const CX = 200;
const CY = 150;

/** Spin the valve wheel round twice (step 3 is the waterway outside). */
export function OpenWaterways({ step, onComplete }: TaskGameProps) {
  const [angle, setAngle] = useState(0);
  const last = useRef<number | null>(null);
  const done = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const progress = Math.min(1, Math.abs(angle) / (360 * TURNS));

  const at = (e: React.PointerEvent) => {
    const p = svgPoint(svgRef.current!, e);
    return (Math.atan2(p.y - CY, p.x - CX) * 180) / Math.PI;
  };

  return (
    <svg
      ref={svgRef}
      className="task-svg"
      viewBox="0 0 400 300"
      style={{ cursor: 'grab' }}
      onPointerDown={(e) => (last.current = at(e))}
      onPointerMove={(e) => {
        if (last.current === null || done.current) return;
        const a = at(e);
        let d = a - last.current;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        last.current = a;
        // Only clockwise turns open the valve.
        const next = Math.max(0, angle + d);
        setAngle(next);
        if (next >= 360 * TURNS) {
          done.current = true;
          onComplete();
        }
      }}
      onPointerUp={() => (last.current = null)}
      onPointerLeave={() => (last.current = null)}
    >
      <rect width="400" height="300" rx="10" fill={step === 2 ? '#2b3a4d' : '#3b3026'} />
      <rect x="0" y={260 - progress * 60} width="400" height={40 + progress * 60} fill="#3f8cff" opacity="0.5" />
      <g transform={`rotate(${angle} ${CX} ${CY})`}>
        <circle cx={CX} cy={CY} r="100" fill="none" stroke="#b33a2a" strokeWidth="18" />
        <circle cx={CX} cy={CY} r="100" fill="none" stroke="#000" strokeWidth="3" />
        {[0, 60, 120].map((a) => (
          <rect key={a} x={CX - 8} y={CY - 100} width="16" height="200" rx="5" fill="#8a2c20" stroke="#000" strokeWidth="2" transform={`rotate(${a} ${CX} ${CY})`} />
        ))}
        <circle cx={CX} cy={CY} r="24" fill="#6b7480" stroke="#000" strokeWidth="3" />
      </g>
      <text x="200" y="290" textAnchor="middle" fill="#f5deb3" fontSize="13" fontWeight="700">
        {progress >= 1 ? 'Waterway open' : 'Drag the wheel clockwise'}
      </text>
    </svg>
  );
}
