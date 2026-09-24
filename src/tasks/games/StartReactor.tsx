import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

const ROUNDS = 5;

export function StartReactor({ params, onComplete }: TaskGameProps) {
  const seq = useMemo(() => {
    const r = seeded(params.seed);
    return Array.from({ length: ROUNDS }, () => Math.floor(r() * 9));
  }, [params.seed]);
  const [round, setRound] = useState(1);
  const [lit, setLit] = useState<number | null>(null);
  const [input, setInput] = useState<number[]>([]);
  const [showing, setShowing] = useState(true);
  const [error, setError] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(
    (n: number) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setShowing(true);
      setInput([]);
      for (let i = 0; i < n; i++) {
        timers.current.push(setTimeout(() => setLit(seq[i]), 600 + i * 550));
        timers.current.push(setTimeout(() => setLit(null), 600 + i * 550 + 380));
      }
      timers.current.push(setTimeout(() => setShowing(false), 600 + n * 550));
    },
    [seq],
  );

  useEffect(() => {
    play(round);
  }, [round, play]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const press = (i: number) => {
    if (showing) return;
    const next = [...input, i];
    if (seq[next.length - 1] !== i) {
      setError(true);
      setTimeout(() => {
        setError(false);
        if (round === 1) play(1);
        else setRound(1);
      }, 600);
      return;
    }
    setInput(next);
    if (next.length === round) {
      if (round === ROUNDS) onComplete();
      else setTimeout(() => setRound(round + 1), 400);
    }
  };

  return (
    <div className="simon">
      <div className="simon-side">
        <div className="simon-lights">
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span key={i} className={i < round - (showing ? 1 : 0) || (i < round && input.length === round) ? 'on' : ''} />
          ))}
        </div>
        <div className={`simon-grid display ${error ? 'error' : ''}`}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className={`cell ${lit === i ? 'lit' : ''}`} />
          ))}
        </div>
      </div>
      <div className="simon-side">
        <div className="simon-lights">
          {Array.from({ length: round }, (_, i) => (
            <span key={i} className={i < input.length ? 'on' : ''} />
          ))}
        </div>
        <div className={`simon-grid input ${showing ? 'locked' : ''}`}>
          {Array.from({ length: 9 }, (_, i) => (
            <button key={i} className="cell" onClick={() => press(i)} />
          ))}
        </div>
      </div>
    </div>
  );
}
