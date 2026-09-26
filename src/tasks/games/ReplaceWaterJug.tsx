import type { TaskGameProps } from '../types';
import { useHold } from './HoldProgress';

/** Step 1 in the Boiler Room: fill the jug. Step 2 in the Office: tip it into the water cooler. */
export function ReplaceWaterJug({ step, onComplete }: TaskGameProps) {
  const { pct, holding, bind } = useHold(2400, onComplete);
  const cooler = step > 0;
  const jug = cooler ? 1 - pct : pct;
  return (
    <div className="fuel">
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill={cooler ? '#2f3a4d' : '#3b3026'} />
        {cooler && (
          <>
            <rect x="230" y="150" width="110" height="130" rx="8" fill="#e8edf3" stroke="#000" strokeWidth="4" />
            <rect x="250" y="180" width="70" height="40" rx="4" fill="#46b1ff" opacity={0.3 + pct * 0.6} />
          </>
        )}
        <g transform={cooler ? `rotate(${Math.min(1, pct * 3) * 150} 180 120)` : undefined}>
          <path d="M120 50 h120 v30 q30 10 30 50 v120 q0 20 -20 20 h-140 q-20 0 -20 -20 v-120 q0 -40 30 -50 z" fill="rgba(160,215,255,0.35)" stroke="#000" strokeWidth="4" />
          <rect x="95" y={130 + 138 * (1 - jug)} width="170" height={138 * jug} rx="10" fill="#46b1ff" opacity="0.85" />
          <rect x="150" y="30" width="60" height="24" rx="4" fill="#3f8cff" stroke="#000" strokeWidth="3" />
        </g>
      </svg>
      <button className={`btn big-hold ${holding ? 'held' : ''}`} {...bind}>
        {pct >= 1 ? 'Done!' : cooler ? 'Hold to pour' : 'Hold to fill'}
      </button>
    </div>
  );
}
