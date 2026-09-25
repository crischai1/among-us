import { SKELD } from '../../shared/map/skeld';
import { SABOTAGE_STATIONS } from '../../shared/rules/sabotage';
import { isImpostorRole, type SabotageKind } from '../../shared/types';
import { closeOverlay } from '../game/actions';
import { TASK_THEME } from '../tasks/theme';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { world } from '../world/world';
import { CrewmateSvg } from './CrewmateSvg';
import { useNow } from './GameHud';

const SAB_BUTTONS: { kind: SabotageKind; room: string; icon: string; label: string }[] = [
  { kind: 'lights', room: 'electrical', icon: '💡', label: 'Lights' },
  { kind: 'reactor', room: 'reactor', icon: '☢', label: 'Reactor' },
  { kind: 'o2', room: 'o2', icon: '🫧', label: 'O2' },
  { kind: 'comms', room: 'comms', icon: '📡', label: 'Comms' },
];

const roomCenter = (id: string) => {
  const r = SKELD.rooms.find((x) => x.id === id)!.rects[0];
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

function ShipSvg({ children }: { children?: React.ReactNode }) {
  return (
    <svg className="ship-map" viewBox={`-40 -40 ${SKELD.size.w + 80} ${SKELD.size.h + 80}`}>
      {SKELD.halls.map((h, i) => (
        <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} className="map-hall" />
      ))}
      {SKELD.rooms.map((r) => (
        <g key={r.id}>
          {r.rects.map((rc, i) => (
            <rect key={i} x={rc.x} y={rc.y} width={rc.w} height={rc.h} className="map-room" rx={10} />
          ))}
        </g>
      ))}
      {SKELD.rooms.map((r) => {
        const c = roomCenter(r.id);
        return (
          <text key={r.id} x={c.x} y={c.y} className="map-label">
            {r.name}
          </text>
        );
      })}
      {children}
    </svg>
  );
}

function SelfDot() {
  useNow(150);
  const s = world.self;
  return <circle cx={s.x} cy={s.y} r={26} className="map-self" />;
}

export function MapOverlay() {
  const pub = useGame((s) => s.pub);
  const priv = useGame((s) => s.priv);
  const now = useNow(250);
  if (!pub || !priv) return null;
  const imp = isImpostorRole(priv.role);
  const sab = pub.sabotage;
  const doorRooms = [...new Set(SKELD.doors.map((d) => d.room))];
  const sabReady = now >= priv.sabotageReadyAt && !sab;
  const sabCd = Math.max(0, Math.ceil((priv.sabotageReadyAt - now) / 1000));

  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className={`panel map-panel ${imp ? 'imp' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <ShipSvg>
          {!imp &&
            !priv.commsDown &&
            priv.tasks
              .filter((t) => !t.done)
              .map((t) => {
                const st = world.map.stations.get(t.stationId);
                return st ? (
                  <g key={t.id} className="map-task">
                    <circle cx={st.x} cy={st.y} r={42} />
                    <text x={st.x} y={st.y + 4}>
                      {TASK_THEME[t.type].icon}
                    </text>
                  </g>
                ) : null;
              })}
          {sab &&
            SABOTAGE_STATIONS[sab.kind].map((id) => {
              const st = world.map.stations.get(id)!;
              return <circle key={id} cx={st.x} cy={st.y} r={36} className="map-sab" />;
            })}
          {imp &&
            doorRooms.map((room) => {
              const c = roomCenter(room);
              const ready = now >= (priv.doorReadyAt[room] ?? 0);
              const closed = SKELD.doors.some((d) => d.room === room && pub.doors[d.id]);
              return (
                <g
                  key={room}
                  className={`map-door-btn ${ready && !closed ? '' : 'off'}`}
                  transform={`translate(${c.x - 70}, ${c.y + 40}) scale(1.3)`}
                  onClick={() => ready && send({ t: 'sabotage', kind: 'doors', room })}
                >
                  <rect width={110} height={70} rx={14} />
                  <text x={55} y={50}>
                    🚪
                  </text>
                </g>
              );
            })}
          {imp &&
            SAB_BUTTONS.map((b) => {
              const c = roomCenter(b.room);
              return (
                <g
                  key={b.kind}
                  className={`map-sab-btn ${sabReady ? '' : 'off'}`}
                  transform={`translate(${c.x - 80}, ${c.y - 190}) scale(1.35)`}
                  onClick={() => {
                    if (!sabReady) return;
                    send({ t: 'sabotage', kind: b.kind });
                    closeOverlay();
                  }}
                >
                  <circle cx={60} cy={60} r={62} />
                  <text x={60} y={82}>
                    {b.icon}
                  </text>
                </g>
              );
            })}
          <SelfDot />
        </ShipSvg>
        {imp && <div className="map-foot">{sab ? 'A sabotage is active' : sabCd > 0 ? `Sabotage ready in ${sabCd}s` : 'Click a room to sabotage it'}</div>}
      </div>
    </div>
  );
}

export function AdminView() {
  const priv = useGame((s) => s.priv);
  if (!priv) return null;
  const counts = priv.admin;
  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className="panel map-panel admin" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <h2 className="outline-text">Admin</h2>
        <ShipSvg>
          {counts &&
            Object.entries(counts).map(([room, n]) => {
              const c = roomCenter(room);
              const size = 80;
              const cols = Math.min(n, 4);
              return (
                <g key={room}>
                  {Array.from({ length: n }, (_, i) => (
                    <foreignObject
                      key={i}
                      x={c.x - (cols * size) / 2 + (i % cols) * size}
                      y={c.y + 16 + Math.floor(i / cols) * size}
                      width={size}
                      height={size}
                    >
                      <CrewmateSvg color={15} size={size * 0.8} />
                    </foreignObject>
                  ))}
                </g>
              );
            })}
        </ShipSvg>
        {!counts && <div className="map-foot bad">Comms disrupted</div>}
      </div>
    </div>
  );
}
