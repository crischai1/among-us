import { COLORS } from '../../shared/colors';
import { send } from '../net/session';
import { useSession } from '../store/session';
import { CrewmateSvg } from './CrewmateSvg';

export function ColorPicker({ onClose }: { onClose: () => void }) {
  const room = useSession((s) => s.room);
  const selfId = useSession((s) => s.selfId);
  if (!room) return null;
  const me = room.members.find((m) => m.id === selfId);
  const taken = new Map(room.members.filter((m) => m.id !== selfId).map((m) => [m.color, m.name]));
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="panel color-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>
          ✕
        </button>
        <div className="color-preview">
          <CrewmateSvg color={me?.color ?? 0} size={120} />
          <div className="outline-text color-name">{COLORS[me?.color ?? 0].name}</div>
        </div>
        <div className="color-grid">
          {COLORS.map((c, i) => (
            <button
              key={c.name}
              className={`color-swatch ${me?.color === i ? 'selected' : ''}`}
              style={{ background: c.body, borderColor: me?.color === i ? '#fff' : '#000' }}
              disabled={taken.has(i)}
              title={taken.has(i) ? `${c.name} (${taken.get(i)})` : c.name}
              onClick={() => send({ t: 'setColor', color: i })}
            >
              {taken.has(i) && <span>✕</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
