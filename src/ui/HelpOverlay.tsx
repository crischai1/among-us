import { useEffect, useMemo, useState } from 'react';
import { MAPS } from '../../shared/map';
import type { MapDef } from '../../shared/map/types';
import { pointInPolygon, pointInRect } from '../../shared/geom';
import type { MapId } from '../../shared/settings';
import { CrewmateSvg } from './CrewmateSvg';
import { markScale, roomCenter, ShipSvg } from './MapOverlay';

type Tab = 'rules' | 'map';

/** Colours for separate vent networks on the map preview. */
const NETWORK_COLORS = ['#ffd23b', '#46d2ff', '#ff7ad9', '#7dff7a', '#ff9a3b'];

/** Groups of vents you can travel between, each in link order. */
function ventNetworks(def: MapDef): string[][] {
  const seen = new Set<string>();
  const byId = new Map(def.vents.map((v) => [v.id, v]));
  const out: string[][] = [];
  for (const v of def.vents) {
    if (seen.has(v.id)) continue;
    const group: string[] = [];
    const stack = [v.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      group.push(id);
      stack.push(...(byId.get(id)?.links ?? []));
    }
    out.push(group);
  }
  return out;
}

const roomName = (def: MapDef, id: string) => def.rooms.find((r) => r.id === id)?.name ?? id;
const unique = (xs: string[]) => [...new Set(xs)];
const list = (xs: string[]) => (xs.length ? xs.join(', ') : 'None');

function MapFacts({ def }: { def: MapDef }) {
  const networks = ventNetworks(def);
  const consoles = (kind: 'cams' | 'admin' | 'vitals' | 'doorlog') =>
    list(unique(def.stations.filter((s) => s.kind === kind).map((s) => roomName(def, s.room))));
  const button = def.button;
  const buttonRoom = button
    ? def.rooms.find((r) => r.rects.some((rc) => pointInRect(button.x, button.y, rc)) || r.polys?.some((p) => pointInPolygon(button.x, button.y, p)))
    : null;
  const lockable = def.doors.filter((d) => !d.auto);
  return (
    <dl className="help-facts">
      <dt>Emergency button</dt>
      <dd>{buttonRoom?.name ?? 'None'}</dd>
      <dt>Sabotages</dt>
      <dd>
        {def.sabotages.map((s) => (
          <span key={s.kind} className="help-chip">
            {s.icon} {s.label} <small>({roomName(def, s.room)})</small>
          </span>
        ))}
        {lockable.length > 0 && <span className="help-chip">🚪 Doors</span>}
      </dd>
      <dt>Doors</dt>
      <dd>{lockable.length ? list(unique(lockable.map((d) => roomName(def, d.room)))) : 'None: impostors can’t lock rooms here'}</dd>
      <dt>Cameras</dt>
      <dd>{def.cameras.length ? `${consoles('cams')} (${def.cameras.length} views)` : 'None'}</dd>
      {!!def.sensors?.length && (
        <>
          <dt>Door log</dt>
          <dd>
            {consoles('doorlog')}: logs who passes the {def.sensors.map((s) => s.name.toLowerCase()).join(', ')} sensors
          </dd>
        </>
      )}
      {!!def.decon?.length && (
        <>
          <dt>Decontamination</dt>
          <dd>Walking in shuts both doors for a few seconds while the room is sprayed</dd>
        </>
      )}
      <dt>Admin map</dt>
      <dd>{consoles('admin')}</dd>
      <dt>Vitals</dt>
      <dd>{consoles('vitals')}</dd>
      <dt>Vents</dt>
      <dd>
        {def.vents.length} vents in {networks.length} network{networks.length === 1 ? '' : 's'}
      </dd>
    </dl>
  );
}

function MapPreview({ def }: { def: MapDef }) {
  const k = markScale(def);
  const networks = useMemo(() => ventNetworks(def), [def]);
  const color = new Map(networks.flatMap((g, i) => g.map((id) => [id, NETWORK_COLORS[i % NETWORK_COLORS.length]] as const)));
  const byId = new Map(def.vents.map((v) => [v.id, v]));
  return (
    <ShipSvg def={def}>
      {def.vents.flatMap((v) =>
        v.links
          .filter((l) => l > v.id)
          .map((l) => {
            const o = byId.get(l)!;
            return <line key={`${v.id}-${l}`} x1={v.x} y1={v.y} x2={o.x} y2={o.y} className="help-vent-link" stroke={color.get(v.id)} strokeWidth={10 * k} />;
          }),
      )}
      {def.vents.map((v) => (
        <rect key={v.id} x={v.x - 22 * k} y={v.y - 14 * k} width={44 * k} height={28 * k} rx={6 * k} fill={color.get(v.id)} className="help-vent" strokeWidth={5 * k} />
      ))}
      {def.button && <circle cx={def.button.x} cy={def.button.y} r={24 * k} className="help-button" strokeWidth={7 * k} />}
      {def.sensors?.map((s) => (
        <line key={s.id} x1={s.seg.x1} y1={s.seg.y1} x2={s.seg.x2} y2={s.seg.y2} className="help-sensor" strokeWidth={10 * k} />
      ))}
      {def.doors
        .filter((d) => d.auto)
        .map((d) => (
          <line key={d.id} x1={d.seg.x1} y1={d.seg.y1} x2={d.seg.x2} y2={d.seg.y2} className="help-decon" strokeWidth={12 * k} />
        ))}
      {def.sabotages.map((s) => {
        const c = roomCenter(s.room, def);
        return (
          <text key={s.kind} x={c.x} y={c.y - 70 * k} className="help-sab" style={{ fontSize: 90 * k }}>
            {s.icon}
          </text>
        );
      })}
    </ShipSvg>
  );
}

function MapTab() {
  const [id, setId] = useState<MapId>('skeld');
  const def = MAPS[id];
  return (
    <div className="help-maps">
      <div className="help-map-pick" role="tablist" aria-label="Maps">
        {(Object.keys(MAPS) as MapId[]).map((m) => (
          <button key={m} role="tab" aria-selected={m === id} className={`btn small ${m === id ? 'blue' : ''}`} onClick={() => setId(m)}>
            {MAPS[m].name}
          </button>
        ))}
      </div>
      <p className="help-blurb">
        <b>{def.name}</b>: {def.blurb}
      </p>
      <div className="help-map-body">
        <div className="help-map-view map-panel">
          <MapPreview def={def} />
          <div className="help-legend">
            <span>
              <i className="dot button" /> Emergency button
            </span>
            <span>
              <i className="dot vent" /> Vents (same colour = connected)
            </span>
            <span>💡 ☢ Sabotage rooms</span>
            {!!def.sensors?.length && (
              <span>
                <i className="dot sensor" /> Door-log sensors
              </span>
            )}
            {!!def.decon?.length && (
              <span>
                <i className="dot decon" /> Decontamination doors
              </span>
            )}
          </div>
        </div>
        <MapFacts def={def} />
      </div>
    </div>
  );
}

function RulesTab() {
  return (
    <div className="help-rules">
      <section className="help-teams">
        <div className="help-team crew">
          <CrewmateSvg color={1} size={44} />
          <div>
            <h3>Crewmates</h3>
            <p>Win by finishing every task, or by voting out all the impostors.</p>
          </div>
        </div>
        <div className="help-team imp">
          <CrewmateSvg color={0} size={44} />
          <div>
            <h3>Impostors</h3>
            <p>Win when they equal the crew in number, or when a critical sabotage runs out the clock.</p>
          </div>
        </div>
      </section>

      <section>
        <h3>How a round plays</h3>
        <ul>
          <li>Everyone gets a secret role. Impostors know each other; crewmates know nobody.</li>
          <li>
            Crewmates walk to their <b>tasks</b> (listed top left, shown on the map) and play the short minigame at each one. The task bar fills
            as the whole crew makes progress.
          </li>
          <li>
            Impostors have fake tasks to blend in. They can <b>kill</b> nearby crewmates (with a cooldown), <b>vent</b> between connected
            vents, and <b>sabotage</b> the map.
          </li>
          <li>
            Find a body? <b>Report</b> it. Suspicious? Press the <b>emergency button</b> (limited uses each, and locked while a sabotage is active). Either starts a meeting.
          </li>
        </ul>
      </section>

      <section>
        <h3>Meetings</h3>
        <ul>
          <li>Everyone is pulled to the table to discuss, then vote. You can vote for a player or skip.</li>
          <li>The player with the most votes is ejected. If skip gets the most votes, or there’s a tie, nobody is ejected.</li>
          <li>Dead players can’t talk to the living; ghosts chat among themselves.</li>
          <li>Afterwards the impostors’ kill cooldown restarts in full.</li>
        </ul>
      </section>

      <section>
        <h3>Sabotages</h3>
        <ul className="help-sabs">
          <li>
            <b>💡 Lights</b>: crew vision shrinks. Flip every switch on the light panel to fix.
          </li>
          <li>
            <b>📡 Comms</b>: hides task lists and knocks out cameras, admin and the door log. Tune the radio to fix (on MIRA HQ, type the code shown at both keypads).
          </li>
          <li>
            <b>☢ Reactor</b> (Seismic Stabilizers on Polus): a countdown! Two players must hold the two panels at the same time.
          </li>
          <li>
            <b>🫧 Oxygen</b>: a countdown! Enter the code at both keypads.
          </li>
          <li>
            <b>🚪 Doors</b>: lock every door of a room for a few seconds. On Polus they stay locked until a crewmate flips the door’s switches.
          </li>
        </ul>
      </section>

      <section>
        <h3>Special roles</h3>
        <p className="help-note">Off by default; the host turns them on in Settings.</p>
        <ul>
          <li>
            <b>Engineer</b> (crew): can use vents for a limited time.
          </li>
          <li>
            <b>Scientist</b> (crew): checks vitals from anywhere on a rechargeable battery.
          </li>
          <li>
            <b>Shapeshifter</b> (impostor): takes on another player’s look for a while.
          </li>
        </ul>
      </section>

      <section>
        <h3>After you die</h3>
        <p>
          You become a ghost who can fly through walls. Dead crewmates should keep doing tasks, since they still count; dead impostors can
          still sabotage.
        </p>
      </section>

      <section>
        <h3>Controls</h3>
        <div className="help-keys">
          {[
            ['WASD / Arrows', 'Move'],
            ['E / Space', 'Use, do task, fix'],
            ['Q', 'Kill'],
            ['R', 'Report body'],
            ['V', 'Vent'],
            ['Tab / M', 'Map (sabotage map for impostors)'],
            ['F', 'Shapeshift'],
            ['Esc', 'Close panel'],
          ].map(([k, v]) => (
            <div key={k} className="help-key">
              <kbd>{k}</kbd>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('rules');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="panel help-panel" role="dialog" aria-label="How to play" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="outline-text">How to Play</h2>
        <div className="help-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'rules'} className={`btn small ${tab === 'rules' ? 'primary' : ''}`} onClick={() => setTab('rules')}>
            Rules
          </button>
          <button role="tab" aria-selected={tab === 'map'} className={`btn small ${tab === 'map' ? 'primary' : ''}`} onClick={() => setTab('map')}>
            Map
          </button>
        </div>
        <div className="help-body">{tab === 'rules' ? <RulesTab /> : <MapTab />}</div>
      </div>
    </div>
  );
}
