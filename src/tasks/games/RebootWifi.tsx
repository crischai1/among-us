import { useState } from 'react';
import type { TaskGameProps } from '../types';

/** Step 1: pull the lever down to cut the wifi. Step 2 (a minute later): push it back up. */
export function RebootWifi({ step, onComplete }: TaskGameProps) {
  const [pulled, setPulled] = useState(false);
  const turningOff = step === 0;
  // Lever starts up when turning off, down when turning back on.
  const up = turningOff ? !pulled : pulled;
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#2a2f37" />
      <rect x="40" y="40" width="170" height="220" rx="10" fill="#1b2230" stroke="#000" strokeWidth="4" />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${125 - 25 - i * 22} ${130 - i * 18} Q125 ${100 - i * 28} ${125 + 25 + i * 22} ${130 - i * 18}`}
          fill="none"
          stroke={up ? '#46d2ff' : '#3a4559'}
          strokeWidth="8"
          strokeLinecap="round"
        />
      ))}
      <circle cx="125" cy="150" r="9" fill={up ? '#46d2ff' : '#3a4559'} />
      <text x="125" y="215" textAnchor="middle" fill={up ? '#7fe0ff' : '#ff8080'} fontFamily="monospace" fontSize="15">
        {up ? (turningOff ? 'WIFI ON' : 'REBOOTED') : turningOff ? 'WIFI OFF' : 'OFFLINE'}
      </text>
      <rect x="275" y="50" width="30" height="200" rx="15" fill="#111" stroke="#000" strokeWidth="3" />
      <g
        style={{ cursor: pulled ? 'default' : 'pointer', transition: 'transform 0.3s' }}
        transform={`translate(0, ${up ? 0 : 150})`}
        onClick={() => {
          if (pulled) return;
          setPulled(true);
          onComplete();
        }}
      >
        <rect x="255" y="45" width="70" height="44" rx="10" fill="#e53935" stroke="#000" strokeWidth="4" />
      </g>
      <text x="290" y="285" textAnchor="middle" fill="#dfe6ee" fontSize="12">
        {pulled ? (turningOff ? 'Come back in a minute' : 'Done') : turningOff ? 'Pull the lever down' : 'Push the lever up'}
      </text>
    </svg>
  );
}
