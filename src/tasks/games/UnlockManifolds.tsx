import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

/** Press the buttons 1 to 10 in order; a mistake resets the panel. */
export function UnlockManifolds({ params, onComplete }: TaskGameProps) {
  const order = useMemo(() => {
    const r = seeded(params.seed);
    const a = Array.from({ length: 10 }, (_, i) => i + 1);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [params.seed]);
  const [next, setNext] = useState(1);
  const [error, setError] = useState(false);

  const press = (n: number) => {
    if (next > 10 || error) return;
    if (n !== next) {
      setError(true);
      setTimeout(() => {
        setError(false);
        setNext(1);
      }, 500);
      return;
    }
    setNext(n + 1);
    if (n === 10) onComplete();
  };

  return (
    <svg className="task-svg" viewBox="0 0 400 240">
      <rect width="400" height="240" rx="10" fill="#3a4250" />
      <rect x="15" y="15" width="370" height="210" rx="8" fill={error ? '#5a1a1a' : '#262c36'} stroke="#000" strokeWidth="3" />
      {order.map((n, i) => {
        const x = 30 + (i % 5) * 70;
        const y = 40 + Math.floor(i / 5) * 90;
        const lit = n < next;
        return (
          <g key={n} style={{ cursor: 'pointer' }} onClick={() => press(n)}>
            <rect x={x} y={y} width="60" height="70" rx="8" fill={lit ? '#3fdc6c' : '#d5dbe2'} stroke="#000" strokeWidth="3" />
            <text x={x + 30} y={y + 46} textAnchor="middle" fontSize="30" fontWeight="900" fill={lit ? '#0b3d18' : '#1b2533'}>
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
