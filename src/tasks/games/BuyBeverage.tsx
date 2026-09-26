import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

const ROWS = ['A', 'B', 'C'];
const DRINKS = [
  { can: '#e53935', band: '#fff' },
  { can: '#43a047', band: '#ffeb3b' },
  { can: '#1e88e5', band: '#fff' },
  { can: '#fb8c00', band: '#6d4c41' },
  { can: '#8e24aa', band: '#f8bbd0' },
  { can: '#fdd835', band: '#e53935' },
  { can: '#00acc1', band: '#004d40' },
  { can: '#6d4c41', band: '#ffcc80' },
  { can: '#eceff1', band: '#1e88e5' },
];

function Can({ x, y, i, s = 1 }: { x: number; y: number; i: number; s?: number }) {
  const d = DRINKS[i];
  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      <rect x="-12" y="-20" width="24" height="40" rx="5" fill={d.can} stroke="#000" strokeWidth="2.5" />
      <rect x="-12" y="-6" width="24" height="10" fill={d.band} stroke="#000" strokeWidth="1.5" />
      <rect x="-8" y="-24" width="16" height="5" rx="2" fill="#bbb" stroke="#000" strokeWidth="1.5" />
    </g>
  );
}

/** Match the drink on the note, then punch in its slot (letter + number). */
export function BuyBeverage({ params, onComplete }: TaskGameProps) {
  const want = useMemo(() => Math.floor(seeded(params.seed)() * 9), [params.seed]);
  const [row, setRow] = useState<string | null>(null);
  const [col, setCol] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [vended, setVended] = useState(false);

  const submit = () => {
    if (vended || row === null || col === null) return;
    const i = ROWS.indexOf(row) * 3 + (col - 1);
    if (i === want) {
      setVended(true);
      setMsg('Enjoy!');
      onComplete();
    } else {
      setMsg('Wrong drink');
      setRow(null);
      setCol(null);
      setTimeout(() => setMsg(''), 700);
    }
  };

  return (
    <div className="beverage">
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill="#2a2f37" />
        <rect x="20" y="15" width="250" height="270" rx="10" fill="#b0282e" stroke="#000" strokeWidth="4" />
        <rect x="35" y="30" width="220" height="200" rx="6" fill="#dfe8ef" stroke="#000" strokeWidth="3" />
        {DRINKS.map((_, i) => {
          const r = Math.floor(i / 3);
          const c = i % 3;
          const x = 75 + c * 70;
          const y = 70 + r * 62;
          return (
            <g key={i} opacity={vended && i === want ? 0.2 : 1}>
              <Can x={x} y={y} i={i} />
              <text x={x + 24} y={y + 24} fontSize="11" fontWeight="800" fill="#333">
                {ROWS[r]}
                {c + 1}
              </text>
            </g>
          );
        })}
        <rect x="60" y="244" width="170" height="30" rx="4" fill="#111" stroke="#000" strokeWidth="3" />
        {vended && <Can x={145} y={259} i={want} s={0.6} />}
        <g transform="rotate(-6 330 80)">
          <rect x="285" y="30" width="95" height="100" fill="#fff59d" stroke="#000" strokeWidth="2" />
          <text x="332" y="52" textAnchor="middle" fontSize="11" fill="#444">
            I want:
          </text>
          <Can x={332} y={92} i={want} s={1.2} />
        </g>
      </svg>
      <div className="bev-pad">
        <div className="keypad-screen">{msg || `${row ?? '_'}${col ?? '_'}`}</div>
        <div className="bev-keys">
          {ROWS.map((r) => (
            <button key={r} className={`key ${row === r ? 'sel' : ''}`} onClick={() => setRow(r)}>
              {r}
            </button>
          ))}
          {[1, 2, 3].map((c) => (
            <button key={c} className={`key ${col === c ? 'sel' : ''}`} onClick={() => setCol(c)}>
              {c}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={submit}>
          BUY
        </button>
      </div>
    </div>
  );
}
