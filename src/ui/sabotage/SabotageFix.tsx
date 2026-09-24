import { useEffect, useMemo, useRef, useState } from 'react';
import { closeOverlay } from '../../game/actions';
import { send } from '../../net/session';
import { useGame } from '../../store/game';

function Frame({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className={`panel fix-panel ${className ?? ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <h2 className="outline-text">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function SabotageFix({ stationId }: { stationId: string }) {
  const kind = stationId.split(':')[0];
  if (kind === 'lights') return <LightsPanel stationId={stationId} />;
  if (kind === 'reactor') return <ReactorHand stationId={stationId} />;
  if (kind === 'o2') return <O2Keypad stationId={stationId} />;
  return <CommsDial stationId={stationId} />;
}

function LightsPanel({ stationId }: { stationId: string }) {
  const lights = useGame((s) => s.pub?.sabotage?.lights) ?? [];
  return (
    <Frame title="Fix Lights" className="lights">
      <div className="switches">
        {lights.map((on, i) => (
          <div key={i} className="switch-col">
            <div className={`bulb ${on ? 'on' : ''}`} />
            <button className={`switch ${on ? 'on' : ''}`} onClick={() => send({ t: 'fix', kind: 'lights', stationId, data: i })}>
              <span />
            </button>
          </div>
        ))}
      </div>
      <p className="fix-hint">Flip every switch until all lights are green.</p>
    </Frame>
  );
}

function ReactorHand({ stationId }: { stationId: string }) {
  const held = useGame((s) => s.pub?.sabotage?.reactorHeld) ?? [];
  const [holding, setHolding] = useState(false);
  const set = (v: boolean) => {
    if (v === holding) return;
    setHolding(v);
    send({ t: 'fix', kind: 'reactor', stationId, data: v });
  };
  useEffect(() => () => send({ t: 'fix', kind: 'reactor', stationId, data: false }), [stationId]);
  return (
    <Frame title="Reactor Meltdown" className="reactor">
      <div
        className={`hand-pad ${holding ? 'holding' : ''}`}
        onPointerDown={() => set(true)}
        onPointerUp={() => set(false)}
        onPointerLeave={() => set(false)}
      >
        <span>✋</span>
      </div>
      <p className="fix-hint">
        {holding ? (held.length >= 2 ? 'Stabilizing…' : 'Waiting for second user…') : 'Hold to stop meltdown'} ({held.length}/2)
      </p>
    </Frame>
  );
}

function O2Keypad({ stationId }: { stationId: string }) {
  const code = useGame((s) => s.priv?.o2Code);
  const done = useGame((s) => s.pub?.sabotage?.o2Done.includes(stationId));
  const [entry, setEntry] = useState('');
  const [bad, setBad] = useState(false);
  const press = (d: string) => {
    if (done) return;
    if (d === '⌫') return setEntry(entry.slice(0, -1));
    if (d === '✓') {
      send({ t: 'fix', kind: 'o2', stationId, data: entry });
      if (entry !== code) {
        setBad(true);
        setTimeout(() => setBad(false), 500);
      }
      setEntry('');
      return;
    }
    if (entry.length < 5) setEntry(entry + d);
  };
  return (
    <Frame title="Oxygen Depleted" className="o2">
      <div className="o2-wrap">
        <div className="sticky-note">
          today’s code:
          <b>{code ?? '·····'}</b>
        </div>
        <div className="keypad">
          <div className={`keypad-screen ${bad ? 'bad' : ''} ${done ? 'ok' : ''}`}>{done ? 'OK' : entry.padEnd(5, '_')}</div>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((d) => (
            <button key={d} className="key" onClick={() => press(d)}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function CommsDial({ stationId }: { stationId: string }) {
  const target = useMemo(() => 30 + Math.random() * 300, []);
  const [angle, setAngle] = useState(() => (target + 120 + Math.random() * 120) % 360);
  const dialRef = useRef<HTMLDivElement>(null);
  const tunedSince = useRef<number | null>(null);
  const [sent, setSent] = useState(false);
  const diff = Math.abs(((angle - target + 540) % 360) - 180);
  const strength = Math.max(0, 1 - diff / 90);

  useEffect(() => {
    if (sent) return;
    if (diff < 7) {
      tunedSince.current ??= performance.now();
      const t = setTimeout(() => {
        if (tunedSince.current && performance.now() - tunedSince.current >= 1400) {
          send({ t: 'fix', kind: 'comms', stationId, data: 'tuned' });
          setSent(true);
        }
      }, 1500);
      return () => clearTimeout(t);
    }
    tunedSince.current = null;
  }, [diff, sent, stationId]);

  const drag = (e: React.PointerEvent) => {
    if (e.buttons !== 1 || !dialRef.current) return;
    const r = dialRef.current.getBoundingClientRect();
    const a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    setAngle((a + 360) % 360);
  };
  const noise = (i: number) => Math.sin(i * 1.7 + performance.now() / 90) * (1 - strength) * 14 + Math.sin(i * 0.5) * 10 * strength;
  return (
    <Frame title="Comms Sabotaged" className="comms">
      <svg className="waveform" viewBox="0 0 300 60">
        <polyline points={Array.from({ length: 60 }, (_, i) => `${i * 5},${30 + noise(i) + (Math.random() - 0.5) * (1 - strength) * 20}`).join(' ')} />
      </svg>
      <div className="dial" ref={dialRef} onPointerMove={drag} onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag(e); }}>
        <div className="dial-knob" style={{ transform: `rotate(${angle}deg)` }}>
          <span />
        </div>
      </div>
      <p className="fix-hint">{sent ? 'Signal restored!' : diff < 7 ? 'Hold steady…' : 'Drag the dial to find the signal'}</p>
    </Frame>
  );
}
