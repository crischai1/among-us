import { RELEVANCE_MULT } from '../../shared/constants';
import { dist2, pointInRect } from '../../shared/geom';
import type { SnapMessage } from '../../shared/protocol';
import { taskView } from '../../shared/rules/tasks';
import {
  F_DISCONNECTED, F_GHOST, F_SCANNING, F_TEAMMATE, type BodyTuple, type EntTuple, type PrivState, type PubState, type VitalsEntry,
} from '../../shared/types';
import type { Game } from './Game';
import type { SPlayer } from './types';

/**
 * Public state as one viewer is allowed to see it. Roles are never included
 * (until game over), and deaths are only revealed once they are public.
 */
export function buildPub(g: Game, viewer: SPlayer): PubState {
  const seesAllDeaths = !viewer.alive || g.phase === 'gameover';
  const m = g.meeting;
  return {
    phase: g.phase,
    phaseEndsAt: Number.isFinite(g.phaseEndsAt) ? g.phaseEndsAt : 0,
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      dead: !p.alive && (p.knownDead || seesAllDeaths || p.id === viewer.id),
      disconnected: p.removed || !p.connected,
    })),
    taskBar: g.taskBar(),
    sabotage: g.sabotage
      ? { ...g.sabotage, stations: [...g.sabotage.stations], lights: g.sabotage.lights && [...g.sabotage.lights] }
      : null,
    doors: Object.fromEntries(g.doors),
    camsInUse: !g.commsDown && g.players.some((p) => p.console === 'cams' && p.connected),
    buttonReadyAt: g.buttonReadyAt,
    meeting: m
      ? {
          stage: m.stage,
          endsAt: m.endsAt,
          kind: m.kind,
          callerId: m.callerId,
          bodyColor: m.bodyColor,
          votedIds: Object.keys(m.votes),
          results: m.results,
        }
      : null,
    ejection: g.ejection,
    gameOver: g.gameOver,
  };
}

function vitals(g: Game): VitalsEntry[] {
  return g.players.map((p) => ({
    id: p.id,
    state: p.removed ? 'disconnected' : p.alive ? 'alive' : 'dead',
  }));
}

function adminCounts(g: Game): Record<string, number> {
  const counts: Record<string, number> = {};
  const add = (x: number, y: number) => {
    const room = g.map.roomAt(x, y);
    if (room) counts[room] = (counts[room] ?? 0) + 1;
  };
  for (const p of g.players) if (!p.removed && p.alive && !p.venting) add(p.x, p.y);
  for (const b of g.bodies) add(b.x, b.y);
  return counts;
}

export function buildPriv(g: Game, p: SPlayer): PrivState {
  const imp = g.isImpostor(p);
  const hideTasks = g.commsDown && !imp;
  return {
    role: p.role,
    team: imp ? g.players.filter((q) => g.isImpostor(q)).map((q) => q.id) : [],
    tasks: hideTasks ? [] : p.tasks.map((t) => taskView(t, g.map)),
    commsDown: g.commsDown,
    killReadyAt: imp ? p.killReadyAt : 0,
    emergencyLeft: Math.max(0, g.settings.emergencyMeetings - p.emergencyUsed),
    venting: p.venting,
    ventReadyAt: p.ventReadyAt,
    ventEndsAt: p.ventEndsAt,
    sabotageReadyAt: imp ? g.sabotageReadyAt : 0,
    doorReadyAt: imp ? Object.fromEntries(g.doorReadyAt) : {},
    openStation: p.openStation?.id ?? null,
    console: p.console,
    admin: p.console === 'admin' && !g.commsDown ? adminCounts(g) : null,
    vitals: p.console === 'vitals' || p.battery?.open ? vitals(g) : null,
    battery: p.battery ? { ...p.battery } : null,
    shift: p.shift ? { ...p.shift } : null,
    o2Code: g.sabotage?.kind === 'o2' && p.openStation && g.sabotage.stations.includes(p.openStation.id) ? g.o2Code : null,
    vote: p.vote,
  };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Per-viewer snapshot. Living viewers only get living, non-venting players
 * near them (or on cameras they are watching); ghosts see everyone.
 */
export function buildSnap(g: Game, viewer: SPlayer): SnapMessage {
  const ghostView = !viewer.alive;
  const radius = g.visionRadius(viewer) * RELEVANCE_MULT;
  const r2 = radius * radius;
  const cams = viewer.console === 'cams' && !g.commsDown ? g.map.cameras.map((c) => c.view) : [];
  const visible = (x: number, y: number) =>
    ghostView || dist2(viewer.x, viewer.y, x, y) <= r2 || cams.some((r) => pointInRect(x, y, r));
  const viewerImp = g.isImpostor(viewer);
  const ents: EntTuple[] = [];
  const playing = g.phase === 'playing' || g.phase === 'reveal';

  if (playing) {
    for (const p of g.players) {
      if (p === viewer || p.removed || p.venting) continue;
      if (!p.alive && !ghostView) continue;
      if (!visible(p.x, p.y)) continue;
      let flags = 0;
      if (!p.alive) flags |= F_GHOST;
      if (!p.connected) flags |= F_DISCONNECTED;
      if (p.alive && g.settings.visualTasks && p.openStation && g.map.stations.get(p.openStation.id)?.kind === 'scan') flags |= F_SCANNING;
      if (viewerImp && g.isImpostor(p)) flags |= F_TEAMMATE;
      const look = p.shift?.as ? g.byId.get(p.shift.as)!.idx : p.idx;
      ents.push([p.eid, r1(p.x), r1(p.y), flags, look]);
    }
  }
  const bodies: BodyTuple[] = playing
    ? g.bodies.filter((b) => visible(b.x, b.y)).map((b) => [b.id, r1(b.x), r1(b.y), b.color, b.at])
    : [];

  return {
    t: 'snap',
    time: g.now,
    ack: viewer.lastSeq,
    gen: viewer.gen,
    you: [viewer.x, viewer.y, viewer.alive ? 0 : F_GHOST],
    ents,
    bodies,
  };
}
