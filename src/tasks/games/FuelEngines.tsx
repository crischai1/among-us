import type { TaskGameProps } from '../types';
import { useHold } from './HoldProgress';

export function FuelEngines({ step, onComplete }: TaskGameProps) {
  const { pct, holding, bind } = useHold(2600, onComplete);
  // Fill the can on even steps, pour it into an engine on odd ones (Polus has two engines).
  const engine = step % 2 === 1;
  return (
    <div className="fuel">
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill="#2f3540" />
        {engine ? (
          <>
            <rect x="120" y="40" width="160" height="220" rx="16" fill="#555d69" stroke="#000" strokeWidth={4} />
            <rect x="140" y={60 + 180 * (1 - pct)} width="120" height={180 * pct} fill="#e0b72a" />
            <text x="200" y="30" textAnchor="middle" fill="#ddd" fontSize="16">
              ENGINE
            </text>
          </>
        ) : (
          <>
            <path d="M130 70 h110 l30 30 v160 h-140 z" fill="#c62d2d" stroke="#000" strokeWidth={4} />
            <rect x="145" y={110 + 135 * (1 - pct)} width="110" height={135 * pct} fill="#e0b72a" opacity="0.85" />
            <rect x="240" y="50" width="25" height="30" fill="#888" stroke="#000" strokeWidth={3} />
          </>
        )}
        <rect x="320" y="60" width="30" height="180" rx="6" fill="#111" stroke="#000" strokeWidth={3} />
        <rect x="324" y={64 + 172 * (1 - pct)} width="22" height={172 * pct} fill="#4dff6a" />
      </svg>
      <button className={`btn big-hold ${holding ? 'held' : ''}`} {...bind}>
        {pct >= 1 ? 'Full!' : 'Hold to fill'}
      </button>
    </div>
  );
}
