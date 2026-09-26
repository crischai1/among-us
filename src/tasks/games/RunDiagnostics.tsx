import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

/** Step 1 starts a long scan; step 2 (after the wait) picks out the anomaly. */
export function RunDiagnostics({ step, params, onComplete }: TaskGameProps) {
  const anomaly = useMemo(() => Math.floor(seeded(params.seed)() * 4), [params.seed]);
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  if (step === 0) {
    return (
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill="#1d232d" />
        <rect x="20" y="20" width="360" height="190" rx="8" fill="#07131f" stroke="#000" strokeWidth="3" />
        <text x="200" y="60" textAnchor="middle" fill="#7fe0ff" fontFamily="monospace" fontSize="18">
          LAUNCHPAD DIAGNOSTICS
        </text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={45 + i * 82} y="90" width="66" height="90" rx="6" fill="#0e2233" stroke="#2c6d8f" strokeWidth="2" />
            <text x={78 + i * 82} y="142" textAnchor="middle" fill="#2c6d8f" fontFamily="monospace" fontSize="13">
              {started ? 'SCAN…' : 'IDLE'}
            </text>
          </g>
        ))}
        <g
          style={{ cursor: started ? 'default' : 'pointer' }}
          onClick={() => {
            if (started) return;
            setStarted(true);
            onComplete();
          }}
        >
          <rect x="110" y="225" width="180" height="56" rx="10" fill={started ? '#2f6d3f' : '#3fdc6c'} stroke="#000" strokeWidth="4" />
          <text x="200" y="260" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800" stroke="#000" strokeWidth="0.8">
            {started ? 'RUNNING…' : 'START'}
          </text>
        </g>
      </svg>
    );
  }

  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#1d232d" />
      <rect x="20" y="20" width="360" height="260" rx="8" fill="#07131f" stroke="#000" strokeWidth="3" />
      <text x="200" y="56" textAnchor="middle" fill="#7fe0ff" fontFamily="monospace" fontSize="17">
        {picked === null ? 'SELECT THE ANOMALY' : picked === anomaly ? 'ANOMALY FLAGGED' : 'NOT AN ANOMALY'}
      </text>
      {[0, 1, 2, 3].map((i) => {
        const bad = i === anomaly;
        const wrong = picked === i && !bad;
        return (
          <g
            key={i}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (picked === anomaly) return;
              setPicked(i);
              if (bad) onComplete();
              else setTimeout(() => setPicked(null), 700);
            }}
          >
            <rect x={45 + i * 82} y="80" width="66" height="170" rx="6" fill={wrong ? '#4a1418' : '#0e2233'} stroke={bad ? '#ff4a4a' : '#2c6d8f'} strokeWidth="3" />
            <polyline
              fill="none"
              stroke={bad ? '#ff4a4a' : '#3dff8a'}
              strokeWidth="2.5"
              points={Array.from({ length: 12 }, (_, k) => `${50 + i * 82 + k * 5},${165 + (bad ? Math.sin(k * 2.3) * 40 : Math.sin(k * 0.9) * 8)}`).join(' ')}
            />
            <text x={78 + i * 82} y="236" textAnchor="middle" fill={bad ? '#ff8080' : '#3dff8a'} fontFamily="monospace" fontSize="12">
              {bad ? 'ERR' : 'OK'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
