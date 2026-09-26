import { BUTTON_RANGE, CHAT_INTERVAL_MS, DOOR_CLOSE_MS, DOOR_USE_RANGE, MANUAL_DOOR_MS, DOOR_COOLDOWN_MS, KILL_RANGES, MAX_CHAT_LENGTH, REPORT_RANGE, SABOTAGE_COOLDOWN_MS, USE_RANGE } from '../../shared/constants';
import { dist, segDist } from '../../shared/geom';
import type { ClientMessage } from '../../shared/protocol';
import { applyFix, makeO2Code, newSabotage } from '../../shared/rules/sabotage';
import { advanceTask, TASK_DEFS, taskReady } from '../../shared/rules/tasks';
import { hasLineOfSight } from '../../shared/sim/visibility';
import { canVentRole, type ConsoleKind, type SabotageKind } from '../../shared/types';
import { runDevCommand } from './devCommands';
import type { Game } from './Game';
import { latestSeq, queueInput, type SPlayer } from './types';

/** Small allowance for interpolation delay between what the client saw and the server state. */
const SLACK = 20;

export function handleAction(g: Game, p: SPlayer, msg: ClientMessage): void {
  switch (msg.t) {
    case 'input':
      queueInput(p, msg.seq, msg.dx, msg.dy);
      return;
    case 'kill':
      return kill(g, p, msg.target);
    case 'report':
      return report(g, p, msg.bodyId);
    case 'emergency':
      return emergency(g, p);
    case 'taskOpen':
      return taskOpen(g, p, msg.stationId);
    case 'taskDone':
      return taskDone(g, p, msg.stationId);
    case 'taskClose':
      if (p.openStation) g.releasePanels(p);
      return;
    case 'fix':
      return fix(g, p, msg.kind, msg.stationId, msg.data);
    case 'openDoor':
      return openDoor(g, p, msg.doorId);
    case 'sabotage':
      return sabotage(g, p, msg.kind, msg.room);
    case 'vent':
      return vent(g, p, msg.action, msg.ventId);
    case 'console':
      return consoleUse(g, p, msg.kind, msg.open);
    case 'portableVitals':
      return portableVitals(g, p, msg.open);
    case 'shapeshift':
      return shapeshift(g, p, msg.target);
    case 'revert':
      if (p.shift?.as) {
        p.shift.as = null;
        p.shift.readyAt = g.now + g.settings.shapeshiftCooldown * 1000;
        g.emitNear(p.x, p.y, { k: 'shift', x: p.x, y: p.y });
        g.markPriv(p);
      }
      return;
    case 'chat':
      return chat(g, p, msg.text);
    case 'vote':
      if (typeof msg.target === 'string') g.castVote(p, msg.target);
      return;
    case 'dev':
      if (g.dev) runDevCommand(g, p, msg.cmd);
      return;
    default:
      return;
  }
}

const canAct = (g: Game, p: SPlayer) => g.phase === 'playing' && p.alive && p.connected && !p.venting;

function kill(g: Game, p: SPlayer, targetEid: number): void {
  if (!canAct(g, p) || !g.isImpostor(p) || g.now < p.killReadyAt) return;
  const t = g.byEid.get(targetEid);
  if (!t || t.removed || !t.alive || t.venting || g.isImpostor(t)) return;
  if (dist(p.x, p.y, t.x, t.y) > KILL_RANGES[g.settings.killDistance] + SLACK) return;
  if (!hasLineOfSight(p.x, p.y, t.x, t.y, g.map.visionGrid, g.closedDoorSegs())) return;

  g.bodies.push({ id: g.nextBodyId++, x: t.x, y: t.y, color: t.color, victimId: t.id, at: g.now });
  g.teleport(p, t.x, t.y);
  t.alive = false;
  g.releasePanels(t);
  if (t.shift) t.shift.as = null;
  p.killReadyAt = g.now + g.settings.killCooldown * 1000;
  const look = p.shift?.as ? g.byId.get(p.shift.as)! : p;
  g.emit(t, { k: 'killed', killerColor: look.color });
  g.markPriv(p);
  g.markPriv(t);
  g.markPub();
  g.checkWin();
}

function report(g: Game, p: SPlayer, bodyId: number): void {
  if (!canAct(g, p)) return;
  const b = g.bodies.find((x) => x.id === bodyId);
  if (!b || dist(p.x, p.y, b.x, b.y) > REPORT_RANGE + SLACK) return;
  if (!hasLineOfSight(p.x, p.y, b.x, b.y, g.map.visionGrid, g.closedDoorSegs())) return;
  g.startMeeting('report', p, b.color);
}

function emergency(g: Game, p: SPlayer): void {
  const btn = g.map.def.button;
  // No emergency meetings while any sabotage is active (body reports still work).
  if (!canAct(g, p) || !btn || g.sabotage) return;
  if (g.now < g.buttonReadyAt || p.emergencyUsed >= g.settings.emergencyMeetings) return;
  if (dist(p.x, p.y, btn.x, btn.y) > BUTTON_RANGE + SLACK) return;
  p.emergencyUsed++;
  g.startMeeting('emergency', p, null);
}

function currentTask(p: SPlayer, stationId: string) {
  return p.tasks.find((t) => !t.done && t.stations[t.step] === stationId);
}

function taskOpen(g: Game, p: SPlayer, stationId: string): void {
  if (g.phase !== 'playing' || p.venting || !p.connected) return;
  const st = g.map.stations.get(stationId);
  if (!st || !g.atStation(p, st)) return;
  if (g.isSabotageStation(stationId)) {
    if (!p.alive || !g.sabotage || !g.sabotage.stations.includes(stationId)) return;
  } else {
    const t = currentTask(p, stationId);
    if (g.isImpostor(p) || !t || !taskReady(t, g.now)) return;
  }
  if (p.openStation) g.releasePanels(p);
  p.openStation = { id: stationId, at: g.now, seq: latestSeq(p) };
  p.console = null;
  g.markPriv(p);
}

function taskDone(g: Game, p: SPlayer, stationId: string): void {
  if (g.phase !== 'playing' || p.openStation?.id !== stationId) return;
  const t = currentTask(p, stationId);
  if (!t || t.fake) return;
  const minMs = TASK_DEFS[t.type].minMs[t.step] ?? 0;
  if (g.now - p.openStation.at < minMs) return;
  advanceTask(t, g.now);
  p.openStation = null;
  g.markPriv(p);
  g.markPub();
  g.checkWin();
}

function fix(g: Game, p: SPlayer, kind: SabotageKind, stationId: string, data: number | boolean | string): void {
  const s = g.sabotage;
  if (g.phase !== 'playing' || !p.alive || !s || s.kind !== kind || p.openStation?.id !== stationId) return;
  const st = g.map.stations.get(stationId);
  if (!st || !g.atStation(p, st)) return;
  let held: string[] | undefined;
  if (kind === 'reactor') {
    if (data === true) g.reactorHolders.set(stationId, p.id);
    else if (g.reactorHolders.get(stationId) === p.id) g.reactorHolders.delete(stationId);
    held = [...g.reactorHolders.keys()];
    // Both scanners must be held by two different people.
    if (new Set(g.reactorHolders.values()).size < g.reactorHolders.size) return;
  }
  const commsCodes = kind === 'comms' && s.keypad ? g.commsCodesFor(stationId) : undefined;
  const fixed = applyFix(s, stationId, data, { o2Code: g.o2Code, held, commsCodes });
  g.markPub();
  if (!fixed) {
    g.markPriv(p);
    return;
  }
  g.sabotage = null;
  g.reactorHolders.clear();
  for (const q of g.players) {
    if (q.openStation && s.stations.includes(q.openStation.id)) q.openStation = null;
  }
  g.markAllPriv();
}

function sabotage(g: Game, p: SPlayer, kind: SabotageKind | 'doors', room?: string): void {
  if (g.phase !== 'playing' || !g.isImpostor(p) || !p.connected) return;
  const now = g.now;
  if (kind === 'doors') {
    if (typeof room !== 'string') return;
    const doors = g.map.def.doors.filter((d) => d.room === room && !d.auto);
    if (!doors.length || now < (g.doorReadyAt.get(room) ?? 0)) return;
    for (const d of doors) g.doors.set(d.id, now + (g.map.def.manualDoors ? MANUAL_DOOR_MS : DOOR_CLOSE_MS));
    g.doorReadyAt.set(room, now + DOOR_COOLDOWN_MS);
    g.emitAll({ k: 'doorSlam', room });
    for (const q of g.players) if (g.isImpostor(q)) g.markPriv(q);
    g.markPub();
    return;
  }
  if (g.sabotage || now < g.sabotageReadyAt) return;
  startSabotage(g, kind);
}

/** Polus: a living player next to a sabotaged door flipped its switches. */
function openDoor(g: Game, p: SPlayer, doorId: unknown): void {
  if (!canAct(g, p) || !g.map.def.manualDoors || typeof doorId !== 'string') return;
  const d = g.map.doors.get(doorId);
  if (!d || d.auto || !g.doors.has(doorId)) return;
  if (segDist(p.x, p.y, d.seg) > DOOR_USE_RANGE + SLACK) return;
  g.doors.delete(doorId);
  g.markPub();
}

/** Start a sabotage this map supports. Returns false if it has none of that kind. */
export function startSabotage(g: Game, kind: SabotageKind): boolean {
  const def = g.map.sabotages.get(kind);
  if (!def) return false;
  g.sabotage = newSabotage(def, g.now, g.rng);
  g.sabotageReadyAt = g.now + SABOTAGE_COOLDOWN_MS;
  if (kind === 'o2') g.o2Code = makeO2Code(g.rng);
  if (kind === 'comms') {
    g.commsSeed = Math.floor(g.rng() * 2 ** 31);
    for (const q of g.players) if (q.console && q.console !== 'vitals') q.console = null;
  }
  g.markPub();
  g.markAllPriv();
  return true;
}

function vent(g: Game, p: SPlayer, action: 'enter' | 'move' | 'exit', ventId?: string): void {
  if (g.phase !== 'playing' || !p.alive || !canVentRole(p.role)) return;
  const now = g.now;
  if (action === 'enter') {
    if (p.venting || typeof ventId !== 'string') return;
    const v = g.map.vents.get(ventId);
    if (!v || !g.inRange(p, v.x, v.y, USE_RANGE)) return;
    if (p.role === 'engineer' && now < p.ventReadyAt) return;
    g.releasePanels(p);
    g.teleport(p, v.x, v.y);
    p.venting = v.id;
    p.ventEndsAt = p.role === 'engineer' ? now + g.settings.engineerVentDuration * 1000 : null;
    g.emitNear(v.x, v.y, { k: 'vent', x: v.x, y: v.y });
  } else if (action === 'move') {
    const cur = p.venting ? g.map.vents.get(p.venting) : undefined;
    if (!cur || typeof ventId !== 'string' || !cur.links.includes(ventId)) return;
    const v = g.map.vents.get(ventId)!;
    g.teleport(p, v.x, v.y);
    p.venting = v.id;
  } else {
    if (!p.venting) return;
    const v = g.map.vents.get(p.venting)!;
    p.venting = null;
    p.ventEndsAt = null;
    if (p.role === 'engineer') p.ventReadyAt = now + g.settings.engineerVentCooldown * 1000;
    g.teleport(p, v.x, v.y);
    g.emitNear(v.x, v.y, { k: 'vent', x: v.x, y: v.y });
  }
  g.markPriv(p);
  g.markPub();
}

function consoleUse(g: Game, p: SPlayer, kind: ConsoleKind, open: boolean): void {
  if (!open) {
    if (p.console) {
      p.console = null;
      g.markPriv(p);
      g.markPub();
    }
    return;
  }
  if (!canAct(g, p)) return;
  // Any panel of that kind works, in case a map has more than one.
  if (!g.map.def.stations.some((s) => s.kind === kind && g.atStation(p, s))) return;
  if (g.commsDown && kind !== 'vitals') return;
  p.openStation = null;
  p.console = kind;
  p.consoleSeq = latestSeq(p);
  g.markPriv(p);
  g.markPub();
}

function portableVitals(g: Game, p: SPlayer, open: boolean): void {
  const b = p.battery;
  if (!b || p.role !== 'scientist') return;
  if (!open) {
    if (b.open) {
      b.open = false;
      if (b.leftMs <= 0) b.readyAt = g.now + g.settings.scientistCooldown * 1000;
      g.markPriv(p);
    }
    return;
  }
  if (!canAct(g, p) || b.leftMs <= 0 || g.now < b.readyAt) return;
  b.open = true;
  g.markPriv(p);
}

function shapeshift(g: Game, p: SPlayer, targetId: string): void {
  const s = p.shift;
  if (!s || p.role !== 'shapeshifter' || !canAct(g, p) || s.as || g.now < s.readyAt) return;
  const t = g.byId.get(targetId);
  if (!t || t === p || !t.alive || t.removed) return;
  s.as = t.id;
  s.endsAt = g.now + g.settings.shapeshiftDuration * 1000;
  g.emitNear(p.x, p.y, { k: 'shift', x: p.x, y: p.y });
  g.markPriv(p);
}

function chat(g: Game, p: SPlayer, raw: unknown): void {
  if (typeof raw !== 'string') return;
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_LENGTH);
  if (!text) return;
  if (g.dev && text.startsWith('/')) {
    runDevCommand(g, p, text.slice(1));
    return;
  }
  if (g.now - p.lastChatAt < CHAT_INTERVAL_MS) return;
  const inMeeting = g.phase === 'meeting' && g.meeting && g.meeting.stage !== 'intro';
  if (p.alive && !inMeeting) return;
  p.lastChatAt = g.now;
  const ev = {
    k: 'chat' as const,
    channel: p.alive ? ('meeting' as const) : ('ghost' as const),
    fromId: p.id,
    name: p.name,
    color: p.color,
    text,
    dead: !p.alive,
    at: g.now,
  };
  g.emitAll(ev, (q) => p.alive || !q.alive);
}
