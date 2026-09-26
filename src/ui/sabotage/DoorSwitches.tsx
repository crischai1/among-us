import { useMemo, useState } from 'react';
import { closeOverlay } from '../../game/actions';
import { send } from '../../net/session';
import { Frame } from './SabotageFix';

/** Polus door panel: flip every switch up to open a sabotaged door. */
export function DoorSwitches({ doorId }: { doorId: string }) {
  const start = useMemo(() => {
    const s = Array.from({ length: 4 }, () => Math.random() < 0.5);
    s[Math.floor(Math.random() * s.length)] = false;
    return s;
  }, []);
  const [on, setOn] = useState(start);
  const [opened, setOpened] = useState(false);
  const flip = (i: number) => {
    if (opened) return;
    const next = on.map((v, j) => (j === i ? !v : v));
    setOn(next);
    if (next.every(Boolean)) {
      setOpened(true);
      send({ t: 'openDoor', doorId });
      setTimeout(closeOverlay, 350);
    }
  };
  return (
    <Frame title="Door Locked" className="door-panel">
      <div className="switches">
        {on.map((v, i) => (
          <div key={i} className="switch-col">
            <div className={`bulb ${v ? 'on' : ''}`} />
            <button className={`switch ${v ? 'on' : ''}`} onClick={() => flip(i)}>
              <span />
            </button>
          </div>
        ))}
      </div>
      <p className="fix-hint">{opened ? 'Door open!' : 'Flip every switch up to open the door.'}</p>
    </Frame>
  );
}
