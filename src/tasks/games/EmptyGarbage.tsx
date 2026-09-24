import type { TaskGameProps } from '../types';
import { useHold } from './HoldProgress';

export function EmptyGarbage({ step, onComplete }: TaskGameProps) {
  const { pct, holding, bind } = useHold(1700, onComplete);
  return (
    <div className="garbage">
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill="#2a2f37" />
        <rect x="60" y="30" width="220" height="240" rx="8" fill="#4a525e" stroke="#000" strokeWidth="4" />
        {Array.from({ length: 14 }, (_, i) => (
          <rect
            key={i}
            x={75 + ((i * 53) % 180)}
            y={60 + ((i * 37) % 170) + pct * 260}
            width={22 + (i % 3) * 8}
            height={16 + (i % 4) * 5}
            rx="4"
            fill={['#8bc34a', '#795548', '#9e9e9e', '#ffc107'][i % 4]}
            stroke="#000"
            strokeWidth="2"
            opacity={1 - pct * 0.6}
          />
        ))}
        <rect x="60" y="262" width="220" height="8" fill={pct > 0 ? '#111' : '#666'} />
        <rect x="325" y="60" width="16" height="180" rx="8" fill="#111" />
        <g transform={`translate(0, ${holding || pct >= 1 ? 140 : 0})`} style={{ transition: 'transform 0.15s' }}>
          <rect x="310" y="50" width="46" height="36" rx="10" fill="#d23b3b" stroke="#000" strokeWidth="3" />
        </g>
        <text x="170" y="22" textAnchor="middle" fill="#ccc" fontSize="14">
          {step === 0 ? 'Chute' : 'Storage'}
        </text>
      </svg>
      <button className={`btn big-hold ${holding ? 'held' : ''}`} {...bind}>
        {pct >= 1 ? 'Emptied!' : 'Hold lever down'}
      </button>
    </div>
  );
}
