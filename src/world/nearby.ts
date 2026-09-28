import { BUTTON_RANGE, DOOR_USE_RANGE, KILL_RANGES, REPORT_RANGE, USE_RANGE } from '../../shared/constants';
import { dist, segDist } from '../../shared/geom';
import { stationDistance } from '../../shared/map/build';
import type { StationDef } from '../../shared/map/types';
import { taskReady } from '../../shared/rules/tasks';
import { hasLineOfSight } from '../../shared/sim/visibility';
import { serverNow } from '../net/clock';
import { doorSegs } from '../../shared/sim/movement';
import { canVentRole, F_GHOST, F_TEAMMATE, isImpostorRole } from '../../shared/types';
import { EMPTY_NEARBY, useGame, type Nearby, type UseTarget } from '../store/game';
import { useSession } from '../store/session';
import { world } from './world';

const CONSOLE_LABEL = { cams: 'Security', admin: 'Admin', vitals: 'Vitals', doorlog: 'Door Log' } as const;

/** What the player can interact with right now. */
export function computeNearby(): Nearby {
  const room = useSession.getState().room;
  const { pub, priv } = useGame.getState();
  const s = world.self;
  if (!s.ready) return EMPTY_NEARBY;
  const px = s.x;
  const py = s.y;
  const map = world.map;
  const use: { t: UseTarget; d: number }[] = [];
  const consider = (t: UseTarget, x: number, y: number, range = USE_RANGE) => {
    const d = dist(px, py, x, y);
    if (d <= range) use.push({ t, d });
  };
  const considerStation = (t: UseTarget, st: StationDef) => {
    const d = stationDistance(st, px, py);
    if (d <= USE_RANGE) use.push({ t, d });
  };

  if (!room?.inGame) {
    for (const st of map.def.stations) if (st.kind === 'laptop') consider({ kind: 'laptop', id: st.id, label: 'Customize' }, st.x, st.y);
    return { ...EMPTY_NEARBY, use: use.sort((a, b) => a.d - b.d)[0]?.t ?? null };
  }
  if (!pub || !priv || pub.phase !== 'playing') return EMPTY_NEARBY;

  const alive = (s.flags & F_GHOST) === 0;
  const imp = isImpostorRole(priv.role);
  const doors = doorSegs(map, world.closedDoors);
  const los = (x: number, y: number) => hasLineOfSight(px, py, x, y, map.visionGrid, doors);

  if (priv.venting) {
    return { ...EMPTY_NEARBY, vent: priv.venting };
  }

  // Security, admin, vitals and the door log work for ghosts too.
  for (const st of map.def.stations) {
    if (st.kind === 'cams' || st.kind === 'admin' || st.kind === 'vitals' || st.kind === 'doorlog') {
      considerStation({ kind: 'console', id: st.kind, label: CONSOLE_LABEL[st.kind] }, st);
    }
  }
  if (!imp) {
    const now = serverNow();
    for (const t of priv.tasks) {
      if (t.done || !taskReady(t, now)) continue;
      const st = map.stations.get(t.stationId);
      if (st) considerStation({ kind: 'task', id: st.id, label: t.name }, st);
    }
  }
  if (alive) {
    if (pub.sabotage) {
      for (const id of pub.sabotage.stations) {
        const st = map.stations.get(id);
        if (st) considerStation({ kind: 'fix', id, label: 'Fix' }, st);
      }
    }
    const btn = map.def.button;
    if (btn) consider({ kind: 'button', id: 'button', label: 'Emergency' }, btn.x, btn.y, BUTTON_RANGE);
    // Polus: a sabotaged door stays shut until someone opens it.
    if (map.def.manualDoors) {
      for (const id of world.closedDoors) {
        const d = map.doors.get(id);
        if (!d || d.auto) continue;
        const dd = segDist(px, py, d.seg);
        if (dd <= DOOR_USE_RANGE) use.push({ t: { kind: 'door', id, label: 'Open Door' }, d: dd });
      }
    }
  }

  let report: number | null = null;
  let kill: number | null = null;
  let vent: string | null = null;
  if (alive) {
    let best = Infinity;
    for (const [id, b] of world.bodies) {
      const d = dist(px, py, b.x, b.y);
      if (d <= REPORT_RANGE && d < best && los(b.x, b.y)) {
        best = d;
        report = id;
      }
    }
    if (imp) {
      best = Infinity;
      const range = KILL_RANGES[room.settings.killDistance];
      for (const e of world.ents.values()) {
        if (!e.present || e.flags & (F_GHOST | F_TEAMMATE)) continue;
        const d = dist(px, py, e.x, e.y);
        if (d <= range && d < best && los(e.x, e.y)) {
          best = d;
          kill = e.eid;
        }
      }
    }
    if (canVentRole(priv.role)) {
      best = Infinity;
      for (const v of map.def.vents) {
        const d = dist(px, py, v.x, v.y);
        if (d <= USE_RANGE && d < best) {
          best = d;
          vent = v.id;
        }
      }
    }
  }
  return { use: use.sort((a, b) => a.d - b.d)[0]?.t ?? null, report, kill, vent };
}

export function sameNearby(a: Nearby, b: Nearby): boolean {
  return a.report === b.report && a.kill === b.kill && a.vent === b.vent && a.use?.id === b.use?.id && a.use?.kind === b.use?.kind;
}
