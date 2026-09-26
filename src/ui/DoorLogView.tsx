import { colorOf } from '../../shared/colors';
import { closeOverlay } from '../game/actions';
import { useGame } from '../store/game';
import { world } from '../world/world';
import { CrewmateSvg } from './CrewmateSvg';
import { useNow } from './GameHud';

/** MIRA HQ's door log: who walked through which hallway sensor, newest first. */
export function DoorLogView() {
  const log = useGame((s) => s.priv?.doorLog);
  const now = useNow(1000);
  const sensors = world.map.def.sensors ?? [];
  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className="panel doorlog" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <h2 className="outline-text">Door Log</h2>
        <div className="doorlog-sensors">
          {sensors.map((s) => (
            <span key={s.id} className="doorlog-sensor">
              {s.name} sensor
            </span>
          ))}
        </div>
        <div className="doorlog-list">
          {!log && <div className="doorlog-empty">Comms disrupted</div>}
          {log && log.length === 0 && <div className="doorlog-empty">No one has passed a sensor yet.</div>}
          {log?.map((e, i) => (
            <div key={`${e.at}-${i}`} className="doorlog-row">
              <CrewmateSvg color={e.color} size={22} />
              <b>{colorOf(e.color).name}</b>
              <span>passed {e.sensor}</span>
              <span className="when">{Math.max(0, Math.round((now - e.at) / 1000))}s ago</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
