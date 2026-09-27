import { useState } from 'react';
import { COLORS } from '../../shared/colors';
import { HATS } from '../../shared/cosmetics';
import { pickColor, pickHat } from '../net/session';
import { useSession } from '../store/session';
import { CrewmateSvg } from './CrewmateSvg';

type Tab = 'color' | 'hat';

export function ColorPicker({ onClose }: { onClose: () => void }) {
  const room = useSession((s) => s.room);
  const selfId = useSession((s) => s.selfId);
  const [tab, setTab] = useState<Tab>('color');
  if (!room) return null;
  const me = room.members.find((m) => m.id === selfId);
  const color = me?.color ?? 0;
  const hat = me?.hat ?? 0;
  const taken = new Map(room.members.filter((m) => m.id !== selfId).map((m) => [m.color, m.name]));
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="panel color-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>
          ✕
        </button>
        <div className="color-preview">
          <CrewmateSvg color={color} hat={hat} size={120} />
          <div className="outline-text color-name">{COLORS[color].name}</div>
          {hat > 0 && <div className="hat-name">{HATS[hat].name}</div>}
        </div>
        <div className="customize-body">
          <div className="customize-tabs">
            <button className={`btn ${tab === 'color' ? 'primary' : ''}`} onClick={() => setTab('color')}>
              Color
            </button>
            <button className={`btn ${tab === 'hat' ? 'primary' : ''}`} onClick={() => setTab('hat')}>
              Hat
            </button>
          </div>
          {tab === 'color' ? (
            <div className="color-grid">
              {COLORS.map((c, i) => (
                <button
                  key={c.name}
                  className={`color-swatch ${color === i ? 'selected' : ''}`}
                  style={{ background: c.body, borderColor: color === i ? '#fff' : '#000' }}
                  disabled={taken.has(i)}
                  title={taken.has(i) ? `${c.name} (${taken.get(i)})` : c.name}
                  onClick={() => pickColor(i)}
                >
                  {taken.has(i) && <span>✕</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="hat-grid">
              {HATS.map((h, i) => (
                <button key={h.name} className={`hat-swatch ${hat === i ? 'selected' : ''}`} title={h.name} onClick={() => pickHat(i)}>
                  {i === 0 ? <span className="hat-none">∅</span> : <CrewmateSvg color={color} hat={i} size={40} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
