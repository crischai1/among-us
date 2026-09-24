import { useEffect, useState } from 'react';
import type { TaskGameProps } from '../types';

export function SubmitScan({ params, onComplete }: TaskGameProps) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / 10000);
      setPct(p);
      if (p >= 1) {
        clearInterval(id);
        onComplete();
      }
    }, 100);
    return () => clearInterval(id);
  }, [onComplete]);
  const seed = Number(params.seed) || 1;
  const lines = [
    `ID: ${(seed % 900) + 100}`,
    `HT: ${3 + (seed % 2)}' ${seed % 12}"`,
    `WT: ${60 + (seed % 40)}lb`,
    `BT: ${['O', 'A', 'B', 'AB'][seed % 4]}${seed % 2 ? '+' : '-'}`,
  ];
  return (
    <div className="scan">
      <div className="scan-screen">
        <div className="scan-beam" />
        <div className="scan-text">
          {lines.slice(0, Math.floor(pct * 5)).map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="transfer-status">{pct < 1 ? `Scanning… ${Math.ceil((1 - pct) * 10)}s` : 'Scan complete'}</div>
    </div>
  );
}
