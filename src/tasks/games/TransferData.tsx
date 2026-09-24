import { useEffect, useState } from 'react';
import type { TaskGameProps } from '../types';

export function TransferData({ step, onComplete }: TaskGameProps) {
  const [start, setStart] = useState<number | null>(null);
  const [pct, setPct] = useState(0);
  const upload = step === 1;
  useEffect(() => {
    if (start === null) return;
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / 4200);
      setPct(p);
      if (p >= 1) {
        clearInterval(id);
        onComplete();
      }
    }, 50);
    return () => clearInterval(id);
  }, [start, onComplete]);
  const secsLeft = Math.ceil((1 - pct) * 4.2);
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
        {start === null ? '' : pct >= 1 ? 'Complete' : `Estimated time: ${secsLeft}s`}
      </div>
      <button className="btn primary" disabled={start !== null} onClick={() => setStart(performance.now())}>
        {upload ? 'Upload' : 'Download'}
      </button>
    </div>
  );
}
