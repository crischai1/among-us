import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

/** Pull the ID card from the wallet and type its code on the keypad. */
export function EnterIdCode({ params, onComplete }: TaskGameProps) {
  const code = useMemo(() => {
    const r = seeded(params.seed);
    return Array.from({ length: 5 }, () => Math.floor(r() * 10)).join('');
  }, [params.seed]);
  const [out, setOut] = useState(false);
  const [entry, setEntry] = useState('');
  const [state, setState] = useState<'idle' | 'bad' | 'ok'>('idle');

  const press = (k: string) => {
    if (state === 'ok') return;
    if (k === '⌫') return setEntry(entry.slice(0, -1));
    if (k === '✓') {
      if (entry === code) {
        setState('ok');
        onComplete();
      } else {
        setState('bad');
        setTimeout(() => setState('idle'), 500);
        setEntry('');
      }
      return;
    }
    if (entry.length < 5) setEntry(entry + k);
  };

  return (
    <div className="idcode">
      <svg className="task-svg idcode-wallet" viewBox="0 0 220 260" onClick={() => setOut(true)} style={{ cursor: out ? 'default' : 'pointer' }}>
        <rect x="10" y="90" width="200" height="160" rx="14" fill="#6b4226" stroke="#000" strokeWidth="4" />
        <g transform={`translate(0, ${out ? -80 : 0})`} style={{ transition: 'transform 0.35s' }}>
          <rect x="30" y="60" width="160" height="100" rx="8" fill="#e9f2f7" stroke="#000" strokeWidth="3" />
          <rect x="42" y="72" width="44" height="54" rx="4" fill="#7fc4ff" stroke="#000" strokeWidth="2" />
          <circle cx="64" cy="92" r="10" fill="#c51a1a" stroke="#000" strokeWidth="2" />
          <rect x="52" y="104" width="24" height="16" rx="5" fill="#c51a1a" stroke="#000" strokeWidth="2" />
          <text x="140" y="92" textAnchor="middle" fontSize="12" fill="#333" fontWeight="700">
            MIRA ID
          </text>
          <text x="140" y="118" textAnchor="middle" fontSize="20" fill="#111" fontFamily="monospace" fontWeight="700" className="idcode-number">
            {code}
          </text>
        </g>
        <rect x="10" y="150" width="200" height="100" rx="14" fill="#8a5632" stroke="#000" strokeWidth="4" />
        {!out && (
          <text x="110" y="210" textAnchor="middle" fill="#f5deb3" fontSize="15" fontWeight="700">
            Tap the wallet
          </text>
        )}
      </svg>
      <div className="keypad">
        <div className={`keypad-screen ${state === 'bad' ? 'bad' : ''} ${state === 'ok' ? 'ok' : ''}`}>{state === 'ok' ? 'OK' : entry.padEnd(5, '_')}</div>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((d) => (
          <button key={d} className="key" onClick={() => press(d)}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
