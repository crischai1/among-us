import { useState } from 'react';
import type { TaskGameProps } from '../types';

/** Step 1: take the watering can from Storage. Step 2: water every plant in the Greenhouse. */
export function WaterPlants({ step, onComplete }: TaskGameProps) {
  const [taken, setTaken] = useState(false);
  const [watered, setWatered] = useState<boolean[]>([false, false, false, false]);

  if (step === 0) {
    return (
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill="#4a3d31" />
        <rect x="30" y="200" width="340" height="16" fill="#2d241c" stroke="#000" strokeWidth="3" />
        <g
          transform={`translate(${taken ? 0 : 0}, ${taken ? -160 : 0})`}
          style={{ transition: 'transform 0.4s', cursor: taken ? 'default' : 'pointer' }}
          onClick={() => {
            if (taken) return;
            setTaken(true);
            onComplete();
          }}
        >
          <path d="M150 120 h90 v80 h-90 z" fill="#3fa9d6" stroke="#000" strokeWidth="4" />
          <path d="M240 140 l60 -40 l8 10 l-60 44 z" fill="#3fa9d6" stroke="#000" strokeWidth="4" />
          <path d="M165 120 q30 -50 60 0" fill="none" stroke="#000" strokeWidth="8" />
          <path d="M165 120 q30 -50 60 0" fill="none" stroke="#3fa9d6" strokeWidth="4" />
        </g>
        <text x="200" y="260" textAnchor="middle" fill="#f5deb3" fontSize="16" fontWeight="700">
          {taken ? 'Got it! Take it to the Greenhouse.' : 'Pick up the watering can'}
        </text>
      </svg>
    );
  }

  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#2f4a36" />
      <rect x="20" y="210" width="360" height="70" rx="6" fill="#5a3d24" stroke="#000" strokeWidth="3" />
      {watered.map((w, i) => {
        const x = 70 + i * 87;
        return (
          <g
            key={i}
            style={{ cursor: w ? 'default' : 'pointer' }}
            onClick={() => {
              if (w) return;
              const next = watered.map((v, j) => v || j === i);
              setWatered(next);
              if (next.every(Boolean)) onComplete();
            }}
          >
            <rect x={x - 26} y="190" width="52" height="40" rx="4" fill="#b5652f" stroke="#000" strokeWidth="3" />
            <path
              d={w ? `M${x} 190 C${x} 150 ${x} 130 ${x} 100` : `M${x} 190 C${x} 160 ${x + 20} 150 ${x + 36} 160`}
              fill="none"
              stroke={w ? '#3fcf5a' : '#8a7a3a'}
              strokeWidth="6"
              style={{ transition: 'd 0.4s' }}
            />
            <ellipse cx={w ? x - 16 : x + 20} cy={w ? 130 : 170} rx="16" ry="8" fill={w ? '#4fdc6a' : '#a09046'} stroke="#000" strokeWidth="2" />
            <ellipse cx={w ? x + 16 : x + 36} cy={w ? 112 : 162} rx="16" ry="8" fill={w ? '#4fdc6a' : '#a09046'} stroke="#000" strokeWidth="2" />
            {w && <circle cx={x} cy="96" r="10" fill="#ffd23b" stroke="#000" strokeWidth="2" />}
          </g>
        );
      })}
      <text x="200" y="40" textAnchor="middle" fill="#dfffd9" fontSize="16" fontWeight="700">
        Tap each plant to water it
      </text>
    </svg>
  );
}
