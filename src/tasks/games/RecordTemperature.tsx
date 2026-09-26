import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

/** Read the thermometer and click the log up or down until it matches. */
export function RecordTemperature({ params, onComplete }: TaskGameProps) {
  const { actual, start } = useMemo(() => {
    const r = seeded(params.seed);
    // The probe by the lava pit reads hot; the lab's probe reads the planet's cold.
    const actual = params.from === 'outside' ? 60 + Math.floor(r() * 40) : -90 + Math.floor(r() * 40);
    const off = 5 + Math.floor(r() * 12);
    return { actual, start: actual + (r() < 0.5 ? off : -off) };
  }, [params.seed, params.from]);
  const [logged, setLogged] = useState(start);
  const [done, setDone] = useState(false);
  const nudge = (d: number) => {
    if (done) return;
    const v = logged + d;
    setLogged(v);
    if (v === actual) {
      setDone(true);
      onComplete();
    }
  };
  const level = Math.max(0.05, Math.min(1, (actual + 100) / 200));
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#2b3342" />
      <rect x="50" y="30" width="36" height="200" rx="18" fill="#e8edf3" stroke="#000" strokeWidth="4" />
      <rect x="60" y={40 + 180 * (1 - level)} width="16" height={180 * level} rx="8" fill="#e53935" />
      <circle cx="68" cy="248" r="26" fill="#e53935" stroke="#000" strokeWidth="4" />
      <rect x="120" y="100" width="100" height="60" rx="6" fill="#0d2b12" stroke="#000" strokeWidth="3" />
      <text x="170" y="140" textAnchor="middle" fill="#9dffac" fontFamily="monospace" fontSize="26">
        {actual}°
      </text>
      <text x="170" y="90" textAnchor="middle" fill="#9aa6b8" fontSize="12">
        READING
      </text>
      <rect x="250" y="100" width="110" height="60" rx="6" fill="#111" stroke="#000" strokeWidth="3" />
      <text x="305" y="140" textAnchor="middle" fill={done ? '#3fdc6c' : '#ffd23b'} fontFamily="monospace" fontSize="26">
        {logged}°
      </text>
      <text x="305" y="90" textAnchor="middle" fill="#9aa6b8" fontSize="12">
        LOG
      </text>
      <g style={{ cursor: 'pointer' }} onClick={() => nudge(1)}>
        <path d="M285 70 L305 45 L325 70 Z" fill="#e8edf3" stroke="#000" strokeWidth="3" />
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => nudge(-1)}>
        <path d="M285 190 L305 215 L325 190 Z" fill="#e8edf3" stroke="#000" strokeWidth="3" />
      </g>
    </svg>
  );
}
