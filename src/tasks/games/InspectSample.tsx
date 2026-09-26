import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

const VIALS = 5;

/** Step 1: start the analysis. Step 2 (a minute later): pick the sample that came back anomalous. */
export function InspectSample({ step, params, onComplete }: TaskGameProps) {
  const bad = useMemo(() => Math.floor(seeded(params.seed)() * VIALS), [params.seed]);
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const results = step > 0;
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#dfe6ec" />
      <rect x="20" y="20" width="360" height="50" rx="6" fill="#0d2b12" stroke="#000" strokeWidth="3" />
      <text x="200" y="52" textAnchor="middle" fill="#9dffac" fontFamily="monospace" fontSize="15">
        {results
          ? picked === bad
            ? 'ANOMALY SELECTED. THANK YOU.'
            : picked !== null
              ? 'THAT SAMPLE IS FINE.'
              : 'SELECT THE ANOMALY'
          : started
            ? 'ANALYSING… COME BACK IN 60s'
            : 'PRESS TO START'}
      </text>
      {Array.from({ length: VIALS }, (_, i) => {
        const x = 70 + i * 65;
        const anomalous = results && i === bad;
        return (
          <g
            key={i}
            style={{ cursor: results ? 'pointer' : 'default' }}
            onClick={() => {
              if (!results || picked === bad) return;
              setPicked(i);
              if (i === bad) onComplete();
            }}
          >
            <rect x={x - 16} y="100" width="32" height="120" rx="14" fill="rgba(255,255,255,0.7)" stroke="#000" strokeWidth="3" />
            <rect x={x - 12} y={started || results ? 150 : 200} width="24" height={started || results ? 66 : 16} rx="10" fill={anomalous ? '#e53935' : '#46d2ff'} style={{ transition: 'y 0.6s, height 0.6s' }} />
          </g>
        );
      })}
      {!results && (
        <g
          style={{ cursor: started ? 'default' : 'pointer' }}
          onClick={() => {
            if (started) return;
            setStarted(true);
            onComplete();
          }}
        >
          <rect x="140" y="240" width="120" height="44" rx="8" fill={started ? '#7a8a9a' : '#3f8cff'} stroke="#000" strokeWidth="3" />
          <text x="200" y="268" textAnchor="middle" fill="#fff" fontWeight="800" fontSize="15">
            {started ? 'RUNNING' : 'START'}
          </text>
        </g>
      )}
    </svg>
  );
}
