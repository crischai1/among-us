import { closeOverlay } from '../game/actions';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { CrewmateSvg } from './CrewmateSvg';

export function ShapeshiftPicker() {
  const pub = useGame((s) => s.pub);
  const selfId = useSession((s) => s.selfId);
  if (!pub) return null;
  const targets = pub.players.filter((p) => p.id !== selfId && !p.dead && !p.disconnected);
  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className="panel shift-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <h2 className="outline-text">Shapeshift into…</h2>
        <div className="shift-grid">
          {targets.map((p) => (
            <button
              key={p.id}
              className="shift-card"
              onClick={() => {
                send({ t: 'shapeshift', target: p.id });
                closeOverlay();
              }}
            >
              <CrewmateSvg color={p.color} hat={p.hat} size={56} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
