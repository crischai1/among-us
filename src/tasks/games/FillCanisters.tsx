import type { TaskGameProps } from '../types';
import { useHold } from './HoldProgress';

/** Hold the valve open to fill both oxygen canisters, one after the other. */
export function FillCanisters({ onComplete }: TaskGameProps) {
  const { pct, holding, bind } = useHold(3000, onComplete);
  const levels = [Math.min(1, pct * 2), Math.max(0, pct * 2 - 1)];
  return (
    <div className="fuel">
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill="#2b3342" />
        <rect x="20" y="40" width="360" height="18" rx="6" fill="#4b5563" stroke="#000" strokeWidth="3" />
        {levels.map((l, i) => {
          const x = 90 + i * 150;
          return (
            <g key={i}>
              <rect x={x + 25} y="58" width="10" height="36" fill="#6b7480" stroke="#000" strokeWidth="2" />
              <rect x={x} y="94" width="60" height="180" rx="26" fill="#1b2230" stroke="#000" strokeWidth="4" />
              <rect x={x + 6} y={100 + 168 * (1 - l)} width="48" height={168 * l} rx="20" fill="#46d2ff" opacity="0.85" />
              <text x={x + 30} y="190" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="800" stroke="#000" strokeWidth="0.6">
                O₂
              </text>
            </g>
          );
        })}
      </svg>
      <button className={`btn big-hold ${holding ? 'held' : ''}`} {...bind}>
        {pct >= 1 ? 'Full!' : 'Hold to fill'}
      </button>
    </div>
  );
}
