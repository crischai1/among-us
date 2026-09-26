import { useMemo, useState } from 'react';
import { seeded, type TaskGameProps } from '../types';

const COLS = 8;
const ROWS = 5;
const CS = 44;
const OX = 24;
const OY = 40;

/** A perfect maze: `open[i]` lists the neighbour cells reachable from cell i. */
function makeMaze(seed: number | string | undefined): Set<number>[] {
  const r = seeded(seed);
  const open = Array.from({ length: COLS * ROWS }, () => new Set<number>());
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack[stack.length - 1];
    const c = i % COLS;
    const nb = [i - COLS, i + COLS, c > 0 ? i - 1 : -1, c < COLS - 1 ? i + 1 : -1].filter((j) => j >= 0 && j < COLS * ROWS && !seen.has(j));
    if (!nb.length) {
      stack.pop();
      continue;
    }
    const j = nb[Math.floor(r() * nb.length)];
    open[i].add(j);
    open[j].add(i);
    seen.add(j);
    stack.push(j);
  }
  return open;
}

/** Step 1 at an outdoor node: trace the path through the maze. Step 2 in the lab: switch that node back on. */
export function FixWeatherNode({ step, params, onComplete }: TaskGameProps) {
  const open = useMemo(() => makeMaze(params.seed), [params.seed]);
  const start = 0;
  const end = COLS * ROWS - 1;
  const [path, setPath] = useState([start]);
  const [on, setOn] = useState(false);

  if (step > 0) {
    const node = String(params.node ?? 'n1');
    return (
      <svg className="task-svg" viewBox="0 0 400 300">
        <rect width="400" height="300" rx="10" fill="#1d232d" />
        <text x="200" y="36" textAnchor="middle" fill="#7fe0ff" fontFamily="monospace" fontSize="16">
          WEATHER NODES
        </text>
        {['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((n, i) => {
          const x = 40 + (i % 3) * 115;
          const y = 70 + Math.floor(i / 3) * 105;
          const mine = n === node;
          const lit = !mine || on;
          return (
            <g
              key={n}
              style={{ cursor: mine ? 'pointer' : 'default' }}
              onClick={() => {
                if (!mine || on) return;
                setOn(true);
                onComplete();
              }}
            >
              <rect x={x} y={y} width="95" height="80" rx="8" fill="#0e2233" stroke={mine ? '#ffd23b' : '#2c6d8f'} strokeWidth="3" />
              <circle cx={x + 47} cy={y + 32} r="16" fill={lit ? '#3fdc6c' : '#e53935'} stroke="#000" strokeWidth="2" />
              <text x={x + 47} y={y + 68} textAnchor="middle" fill="#dfe6ee" fontSize="12" fontWeight="700">
                {`NODE ${i + 1}`} {mine && !on ? '· OFF' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const done = path[path.length - 1] === end;
  const cx = (i: number) => OX + (i % COLS) * CS + CS / 2;
  const cy = (i: number) => OY + Math.floor(i / COLS) * CS + CS / 2;
  const click = (i: number) => {
    if (done) return;
    const at = path.indexOf(i);
    if (at >= 0) return setPath(path.slice(0, at + 1));
    const last = path[path.length - 1];
    if (!open[last].has(i)) return;
    const next = [...path, i];
    setPath(next);
    if (i === end) onComplete();
  };
  const walls: string[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const x = OX + (i % COLS) * CS;
    const y = OY + Math.floor(i / COLS) * CS;
    if ((i % COLS) < COLS - 1 && !open[i].has(i + 1)) walls.push(`M${x + CS} ${y} V${y + CS}`);
    if (i + COLS < COLS * ROWS && !open[i].has(i + COLS)) walls.push(`M${x} ${y + CS} H${x + CS}`);
  }
  return (
    <svg className="task-svg" viewBox="0 0 400 300">
      <rect width="400" height="300" rx="10" fill="#0e1b12" />
      <text x="200" y="26" textAnchor="middle" fill="#9dffac" fontFamily="monospace" fontSize="14">
        {done ? 'NODE REPAIRED' : 'Click a path from ▶ to ■'}
      </text>
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <rect key={i} x={OX + (i % COLS) * CS} y={OY + Math.floor(i / COLS) * CS} width={CS} height={CS} fill="transparent" onClick={() => click(i)} style={{ cursor: 'pointer' }} />
      ))}
      <polyline points={path.map((i) => `${cx(i)},${cy(i)}`).join(' ')} fill="none" stroke="#3dff8a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      <path d={walls.join(' ')} stroke="#6fbf85" strokeWidth="4" strokeLinecap="round" pointerEvents="none" />
      <rect x={OX} y={OY} width={COLS * CS} height={ROWS * CS} fill="none" stroke="#6fbf85" strokeWidth="5" pointerEvents="none" />
      <text x={cx(start)} y={cy(start) + 6} textAnchor="middle" fill="#fff" fontSize="16" pointerEvents="none">
        ▶
      </text>
      <text x={cx(end)} y={cy(end) + 6} textAnchor="middle" fill="#ffd23b" fontSize="18" pointerEvents="none">
        ■
      </text>
    </svg>
  );
}
