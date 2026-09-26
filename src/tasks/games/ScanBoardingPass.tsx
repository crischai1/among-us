import { useRef, useState } from 'react';
import { svgPoint, type TaskGameProps } from '../types';

type Stage = 'wallet' | 'front' | 'back' | 'scanned';

/** Take the pass out, flip it to the barcode, and hold it over the scanner. */
export function ScanBoardingPass({ onComplete }: TaskGameProps) {
  const [stage, setStage] = useState<Stage>('wallet');
  const [pos, setPos] = useState({ x: 60, y: 110 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drop = () => {
    if (!drag.current) return;
    drag.current = null;
    if (stage === 'back' && pos.x > 215 && pos.y > 40 && pos.y < 200) {
      setPos({ x: 245, y: 90 });
      setStage('scanned');
      onComplete();
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
        setPos({ x: p.x - drag.current.dx, y: p.y - drag.current.dy });
      }}
      onPointerUp={drop}
      onPointerLeave={drop}
    >
      <rect width="400" height="300" rx="10" fill="#2f3845" />
      {/* Scanner */}
      <rect x="230" y="60" width="150" height="170" rx="10" fill="#1b2230" stroke="#000" strokeWidth="4" />
      <rect x="245" y="75" width="120" height="110" rx="4" fill={stage === 'scanned' ? '#1d6b3a' : '#0d2b12'} stroke="#000" strokeWidth="2" />
      <text x="305" y="210" textAnchor="middle" fill={stage === 'scanned' ? '#3fdc6c' : '#9dffac'} fontFamily="monospace" fontSize="13">
        {stage === 'scanned' ? 'ACCEPTED' : 'SCAN PASS'}
      </text>
      {/* Wallet */}
      {stage === 'wallet' && (
        <g style={{ cursor: 'pointer' }} onClick={() => setStage('front')}>
          <rect x="30" y="150" width="160" height="110" rx="12" fill="#6b4226" stroke="#000" strokeWidth="4" />
          <rect x="45" y="120" width="130" height="60" rx="6" fill="#f2f6fa" stroke="#000" strokeWidth="3" />
          <text x="110" y="220" textAnchor="middle" fill="#f5deb3" fontSize="14" fontWeight="700">
            Take out the pass
          </text>
        </g>
      )}
      {stage !== 'wallet' && (
        <g
          transform={`translate(${pos.x}, ${pos.y})`}
          style={{ cursor: stage === 'back' ? 'grab' : 'pointer' }}
          onPointerDown={(e) => {
            if (stage !== 'back') return;
            const p = svgPoint(svgRef.current!, e);
            drag.current = { dx: p.x - pos.x, dy: p.y - pos.y };
          }}
          onClick={() => stage === 'front' && setStage('back')}
        >
          <rect width="110" height="150" rx="8" fill="#f2f6fa" stroke="#000" strokeWidth="3" />
          {stage === 'front' ? (
            <>
              <rect x="10" y="10" width="90" height="22" rx="3" fill="#3f8cff" />
              <text x="55" y="26" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">
                POLUS
              </text>
              <circle cx="55" cy="70" r="22" fill="#c51a1a" stroke="#000" strokeWidth="2" />
              <text x="55" y="130" textAnchor="middle" fill="#445" fontSize="10">
                tap to flip
              </text>
            </>
          ) : (
            Array.from({ length: 18 }, (_, i) => <rect key={i} x={12 + i * 5} y="40" width={(i * 7) % 3 === 0 ? 3 : 2} height="70" fill="#111" />)
          )}
        </g>
      )}
    </svg>
  );
}
