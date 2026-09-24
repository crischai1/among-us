import { closeOverlay } from '../game/actions';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { CrewmateSvg } from './CrewmateSvg';
import { useNow } from './GameHud';

export function VitalsView({ portable }: { portable?: boolean }) {
  const pub = useGame((s) => s.pub);
  const priv = useGame((s) => s.priv);
  const now = useNow(200);
  const maxBattery = useSession((s) => (s.room?.settings.scientistBattery ?? 10) * 1000);
  if (!pub || !priv) return null;
  const vitals = priv.vitals ?? [];
  const battery = priv.battery;
  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className="panel vitals" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <h2 className="outline-text">Vitals</h2>
        {portable && battery && (
          <div className="battery">
            <div className="battery-fill" style={{ width: `${(Math.max(0, battery.leftMs) / maxBattery) * 100}%` }} />
            <span>Battery</span>
          </div>
        )}
        <div className="vitals-grid">
          {vitals.map((v) => {
            const p = pub.players.find((x) => x.id === v.id);
            if (!p) return null;
            return (
              <div key={v.id} className={`vital ${v.state}`}>
                <CrewmateSvg color={p.color} size={34} dead={v.state === 'dead'} />
                <span className="vital-name">{p.name}</span>
                <svg className="ekg" viewBox="0 0 100 30" preserveAspectRatio="none">
                  {v.state === 'alive' ? (
                    <path
                      d="M0 15 L30 15 L35 5 L40 25 L45 15 L100 15"
                      style={{ strokeDashoffset: -((now / 8) % 100) }}
                    />
                  ) : (
                    <path d="M0 15 L100 15" />
                  )}
                </svg>
                <span className="vital-state">{v.state === 'alive' ? 'OK' : v.state === 'dead' ? 'DEAD' : 'D/C'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
