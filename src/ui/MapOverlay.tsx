import { DOOR_COOLDOWN_MS } from '../../shared/constants';
import { roomLabel } from '../../shared/map/compile';
import type { MapDef, Poly } from '../../shared/map/types';
import { isImpostorRole } from '../../shared/types';
import { closeOverlay } from '../game/actions';
import { TASK_THEME } from '../tasks/theme';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { world } from '../world/world';
import { CrewmateSvg } from './CrewmateSvg';
import { useNow } from './GameHud';

export const roomCenter = (id: string, def: MapDef = world.map.def) => roomLabel(def.rooms.find((x) => x.id === id)!);

const points = (p: Poly) => p.map((v) => `${v.x},${v.y}`).join(' ');

/** Markers are sized for the Skeld; bigger maps scale them up to stay readable. */
export const markScale = (def: MapDef = world.map.def) => Math.max(def.size.w, def.size.h * 1.65) / 3300;

/** Room-and-hall outline of a map (the current one unless `def` is given). */
export function ShipSvg({ def = world.map.def, children }: { def?: MapDef; children?: React.ReactNode }) {
  const k = markScale(def);
  return (
    <svg className="ship-map" viewBox={`-40 -40 ${def.size.w + 80} ${def.size.h + 80}`}>
      {/* Open ground (Polus' snow) under everything else. */}
      {def.rooms
        .filter((r) => r.outdoor)
        .map((r) => (
          <g key={r.id} className="map-outdoor">
            {r.rects.map((rc, i) => (
              <rect key={i} x={rc.x} y={rc.y} width={rc.w} height={rc.h} shapeRendering="crispEdges" />
            ))}
            {r.polys?.map((p, i) => <polygon key={`p${i}`} points={points(p)} />)}
          </g>
        ))}
      {def.halls.map((h, i) => (
        <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} className="map-hall" />
      ))}
      {def.hallPolys?.map((p, i) => <polygon key={`p${i}`} points={points(p)} className="map-hall map-seam" />)}
      {def.rooms.filter((r) => !r.outdoor).map((r) => {
        const polys = r.polys ?? [];
        const pieces = r.rects.length + polys.length;
        return (
          <g key={r.id}>
            {r.rects.map((rc, i) => (
              <rect key={i} x={rc.x} y={rc.y} width={rc.w} height={rc.h} className="map-room" rx={pieces > 1 ? 0 : 10} style={pieces > 1 ? { strokeWidth: 16 } : undefined} />
            ))}
            {polys.map((p, i) => (
              <polygon key={`p${i}`} points={points(p)} className="map-room" style={{ strokeWidth: 16 }} />
            ))}
            {/* Areas made of several pieces: fill again over the outlines so the seams between pieces vanish. */}
            {pieces > 1 &&
              r.rects.map((rc, i) => (
                <rect key={`f${i}`} x={rc.x} y={rc.y} width={rc.w} height={rc.h} className="map-room" style={{ stroke: 'none' }} shapeRendering="crispEdges" />
              ))}
            {pieces > 1 && polys.map((p, i) => <polygon key={`fp${i}`} points={points(p)} className="map-room map-seam" />)}
          </g>
        );
      })}
      {def.rooms.filter((r) => !r.outdoor).map((r) => {
        const c = roomCenter(r.id, def);
        return (
          <text key={r.id} x={c.x} y={c.y} className="map-label" style={{ fontSize: 46 * k, strokeWidth: 8 * k }}>
            {r.short ?? r.name}
          </text>
        );
      })}
      {children}
    </svg>
  );
}

/**
 * Grey wedge covering the remaining fraction of a cooldown, clockwise from
 * 12 o'clock, on a circle of radius r centred at (c, c).
 */
function CooldownWedge({ left, c, r }: { left: number; c: number; r: number }) {
  if (left <= 0) return null;
  if (left >= 0.999) return <circle cx={c} cy={c} r={r} className="cooldown-wedge" />;
  const a = left * Math.PI * 2;
  const x = c + r * Math.sin(a);
  const y = c - r * Math.cos(a);
  return <path d={`M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 ${left > 0.5 ? 1 : 0} 1 ${x} ${y} Z`} className="cooldown-wedge" />;
}

/** Door sabotage button: a door with an orange cross; the grey wedge shows the cooldown left. */
function DoorButton({ room, x, y, scale, readyAt, now }: { room: string; x: number; y: number; scale: number; readyAt: number; now: number }) {
  const left = Math.min(1, Math.max(0, (readyAt - now) / DOOR_COOLDOWN_MS));
  const ready = left === 0;
  const secs = Math.ceil((readyAt - now) / 1000);
  return (
    <g
      className={`map-door-btn ${ready ? '' : 'cooling'}`}
      transform={`translate(${x - 50 * scale}, ${y - 50 * scale}) scale(${scale})`}
      onClick={() => ready && send({ t: 'sabotage', kind: 'doors', room })}
    >
      <title>{ready ? 'Close doors' : `Doors ready in ${secs}s`}</title>
      <circle cx={50} cy={50} r={46} className="door-btn-face" />
      <rect x={31} y={22} width={38} height={58} rx={4} className="door-btn-door" />
      <circle cx={61} cy={52} r={3} className="door-btn-knob" />
      <path d="M 30 30 L 70 70 M 70 30 L 30 70" className="door-btn-cross" />
      <CooldownWedge left={left} c={50} r={46} />
      <circle cx={50} cy={50} r={46} className="door-btn-rim" />
    </g>
  );
}

function SelfDot() {
  useNow(150);
  const s = world.self;
  return <circle cx={s.x} cy={s.y} r={26 * markScale()} className="map-self" />;
}

export function MapOverlay() {
  const pub = useGame((s) => s.pub);
  const priv = useGame((s) => s.priv);
  const now = useNow(100);
  if (!pub || !priv) return null;
  const imp = isImpostorRole(priv.role);
  const sab = pub.sabotage;
  const def = world.map.def;
  const k = markScale();
  const doorRooms = [...new Set(def.doors.filter((d) => !d.auto).map((d) => d.room))];
  const sabReady = now >= priv.sabotageReadyAt && !sab;
  const sabCd = Math.max(0, Math.ceil((priv.sabotageReadyAt - now) / 1000));

  return (
    <div className="overlay-backdrop" onClick={closeOverlay}>
      <div className={`panel map-panel ${imp ? 'imp' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={closeOverlay}>
          ✕
        </button>
        <ShipSvg>
          {/* Impostors see their fake tasks too, so they know where to pretend. */}
          {(imp || !priv.commsDown) &&
            priv.tasks
              .filter((t) => !t.done)
              .map((t) => {
                const st = world.map.stations.get(t.stationId);
                return st ? (
                  <g key={t.id} className="map-task">
                    <circle cx={st.x} cy={st.y} r={56 * k} />
                    <text x={st.x} y={st.y + 5 * k} style={{ fontSize: 64 * k }}>
                      {TASK_THEME[t.type].icon}
                    </text>
                  </g>
                ) : null;
              })}
          {sab &&
            sab.stations.map((id) => {
              const st = world.map.stations.get(id)!;
              return <circle key={id} cx={st.x} cy={st.y} r={36 * k} className="map-sab" />;
            })}
          {imp &&
            doorRooms.map((room) => {
              const c = roomCenter(room);
              return (
                <DoorButton key={room} room={room} x={c.x} y={c.y + 100 * k} scale={1.6 * k} readyAt={priv.doorReadyAt[room] ?? 0} now={now} />
              );
            })}
          {imp &&
            def.sabotages.map((b) => {
              const c = roomCenter(b.room);
              return (
                <g
                  key={b.kind}
                  className={`map-sab-btn ${sabReady ? '' : 'off'}`}
                  transform={`translate(${c.x - 80 * k}, ${Math.max(-30, c.y - 190 * k)}) scale(${1.35 * k})`}
                  onClick={() => {
                    if (!sabReady) return;
                    send({ t: 'sabotage', kind: b.kind });
                    closeOverlay();
                  }}
                >
                  <title>{b.label}</title>
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
  const k = markScale();
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
              const size = 80 * k;
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
