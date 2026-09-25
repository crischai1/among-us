import { useEffect, useMemo, useState } from 'react';
import type { TaskGameProps } from '../types';

const TRANSFER_MS = 7000;

/** Random bursts and stalls that still finish in exactly TRANSFER_MS. */
function makeSchedule(): { t: number; p: number }[] {
  const n = 6 + Math.floor(Math.random() * 4);
  const times = Array.from({ length: n }, () => 0.3 + Math.random());
  const gains = Array.from({ length: n }, () => (Math.random() < 0.3 ? 0.02 : 0.2 + Math.random()));
  const tSum = times.reduce((a, b) => a + b, 0);
  const pSum = gains.reduce((a, b) => a + b, 0);
  const pts = [{ t: 0, p: 0 }];
  let t = 0;
  let p = 0;
  for (let i = 0; i < n; i++) {
    t += (times[i] / tSum) * TRANSFER_MS;
    p += gains[i] / pSum;
    pts.push({ t, p: Math.min(1, p) });
  }
  pts[pts.length - 1] = { t: TRANSFER_MS, p: 1 };
  return pts;
}

function progressAt(pts: { t: number; p: number }[], t: number): number {
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i].t) {
      const a = pts[i - 1];
      const b = pts[i];
      return a.p + ((b.p - a.p) * (t - a.t)) / (b.t - a.t);
    }
  }
  return 1;
}

const r = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

/** Wildly unreliable estimates, like a real file transfer dialog. */
function sillyEstimate(pct: number): string {
  if (pct > 0.9) return `${r(1, 2)}s`;
  const roll = Math.random();
  if (roll < 0.12) return 'Calculating…';
  if (roll < 0.3) return `${r(1, 9)}d ${r(0, 23)}hr ${r(0, 59)}m ${r(0, 59)}s`;
  if (roll < 0.5) return `${r(1, 14)}hr ${r(0, 59)}m`;
  if (roll < 0.7) return `${r(1, 59)}m ${r(0, 59)}s`;
  if (roll < 0.8) return `${r(2, 40)}s`;
  if (roll < 0.88) return `${r(1, 3)} weeks`;
  return `${r(1, 9)}s`;
}

export function TransferData({ step, onComplete }: TaskGameProps) {
  const [start, setStart] = useState<number | null>(null);
  const [pct, setPct] = useState(0);
  const [estimate, setEstimate] = useState('Calculating…');
  const schedule = useMemo(makeSchedule, []);
  const upload = step === 1;

  useEffect(() => {
    if (start === null) return;
    const id = setInterval(() => {
      const p = progressAt(schedule, performance.now() - start);
      setPct(p);
      if (p >= 1) {
        clearInterval(id);
        onComplete();
      }
    }, 50);
    return () => clearInterval(id);
  }, [start, schedule, onComplete]);

  useEffect(() => {
    if (start === null) return;
    const id = setInterval(() => setEstimate(sillyEstimate(progressAt(schedule, performance.now() - start))), 650);
    return () => clearInterval(id);
  }, [start, schedule]);

  return (
    <div className="transfer">
      <div className="transfer-row">
        <div className="folder">📁</div>
        <div className="transfer-files">
          {start !== null && pct < 1 && <span className="flying-file" style={{ animationDirection: upload ? 'normal' : 'reverse' }}>📄</span>}
        </div>
        <div className="folder">{upload ? '🌐' : '📁'}</div>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="transfer-status">
        {start === null ? '' : pct >= 1 ? 'Complete' : `${Math.floor(pct * 100)}% · Estimated time: ${estimate}`}
      </div>
      <button className="btn primary" disabled={start !== null} onClick={() => setStart(performance.now())}>
        {upload ? 'Upload' : 'Download'}
      </button>
    </div>
  );
}
