import { COLORS } from '../../shared/colors';
import { BUTTON_RANGE, DOOR_USE_RANGE, KILL_RANGES, REPORT_RANGE, USE_RANGE } from '../../shared/constants';
import { dist, segDist } from '../../shared/geom';
import { roomLabel } from '../../shared/map';
import { stationDistance } from '../../shared/map/build';
import type { StationDef } from '../../shared/map/types';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';
import { makeRng, pick, type Rng } from '../../shared/rng';
import { TASK_DEFS, taskName, taskReady } from '../../shared/rules/tasks';
import { hasLineOfSight } from '../../shared/sim/visibility';
import type { Phase, SabotageKind } from '../../shared/types';
import type { Game } from '../game/Game';
import type { SPlayer } from '../game/types';
import { botLine, llmConfig, templateLine, type ChatContext } from './chat';
import { Mover } from './mover';
import { pointGoal, type Goal } from './nav';

export const BOT_NAMES = [
  'Pip', 'Nova', 'Bolt', 'Echo', 'Juno', 'Rex', 'Mochi', 'Ziggy', 'Luna', 'Taco',
  'Pixel', 'Nugget', 'Sprout', 'Biscuit', 'Wally', 'Pebble', 'Comet', 'Waffle',
];

/** Shared by a room's bots so they split multi-station fixes instead of all running to one. */
export class BotTeam {
  /** stationId -> bot id heading there. */
  readonly claims = new Map<string, string>();
  private sabKey = -1;

  sync(g: Game): void {
    const key = g.sabotage?.startedAt ?? -1;
    if (key !== this.sabKey) {
      this.sabKey = key;
      this.claims.clear();
    }
  }
}

type Work =
  | { kind: 'task'; stationId: string; doneAt: number }
  | { kind: 'fake'; stationId: string; until: number }
  | { kind: 'fix'; stationId: string; nextAt: number; sent: boolean };

interface MeetingMemory {
  kind: 'emergency' | 'report';
  reporter: boolean;
  caller: string | null;
  victim: string | null;
  bodyRoom: string | null;
  myRoom: string | null;
  planned: boolean;
  linesLeft: number;
  nextLineAt: number;
  spoke: number;
  pending: boolean;
  accuser: string | null;
  accuserId: string | null;
  defendAt: number;
  defended: boolean;
  voteAt: number;
  accusations: Map<string, number>;
  chat: { name: string; text: string }[];
  unread: { fromId: string; name: string; text: string }[];
  lastSentAt: number;
}

const SUS_WORDS = /\b(sus|vote|voting|impostor|imposter|kill|killed|vent|vented|it'?s|faking|fake|lying|liar)\b/;
const CLEAR_WORDS = /\b(clear|clean|safe|trust|with|not)\b/;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Drives one bot. It plays through the same messages a browser sends, so the
 * server validates everything it does, and only uses what that player could
 * see (vision radius and line of sight), apart from knowing its own panels.
 */
export class BotBrain {
  private rng: Rng;
  private mover: Mover;
  private seq = 0;
  private outbox: string[] = [];

  // Per game
  private lastPhase: Phase | null = null;
  private waitUntil = 0;
  private work: Work | null = null;
  private target: string | null = null;
  private skip = new Set<string>();
  private fakeDone = new Set<string>();
  private wander: Goal | null = null;
  private lastObs = 0;
  private visible = new Set<string>();
  /** name -> where and when we last saw them. */
  private seen = new Map<string, { room: string; at: number }>();
  /** player id -> (id of someone seen near them -> when). */
  private together = new Map<string, Map<string, number>>();
  private withVictim: string[] = [];
  private risk: { id: string; until: number; ok: boolean } | null = null;
  private ventNoted = new Set<string>();
  private sus = new Map<string, number>();
  private knownBodies = new Set<number>();
  private myKills = new Set<string>();
  private reportBody: number | null = null;
  private reportAt = 0;
  private reportRoom: string | null = null;
  private killTarget: string | null = null;
  private killAt = 0;
  private chaseUntil = 0;
  private chaseRestUntil = 0;
  private escapeVent: string | null = null;
  private ventHops = 0;
  private ventNextAt = 0;
  private nextSabAt = 0;
  private fixDecision = new Map<number, boolean>();
  private lastRoom: string | null = null;
  private lastTask: string | null = null;
  private sawKill: ChatContext['sawKill'] = null;
  private sawVent: ChatContext['sawVent'] = null;
  private nearBody: string[] = [];
  private mtg: MeetingMemory | null = null;
  private mtgKey = 0;

  constructor(seed: number) {
    this.rng = makeRng(seed);
    this.mover = new Mover(this.rng);
  }

  /** Forget everything from the last game. */
  reset(): void {
    Object.assign(this, new BotBrain(Math.floor(this.rng() * 2 ** 31)));
  }

  /** Events the game sends this bot (it has no socket). */
  onMessage(msg: ServerMessage): void {
    if (msg.t !== 'ev' || msg.ev.k !== 'chat' || msg.ev.channel !== 'meeting' || !this.mtg) return;
    const { fromId, name, text } = msg.ev;
    this.mtg.chat.push({ name, text });
    this.mtg.unread.push({ fromId, name, text });
  }

  tick(g: Game, self: SPlayer, now: number, team: BotTeam): void {
    if (self.removed) return;
    if (g.phase !== this.lastPhase) {
      this.onPhase(g, self, now);
      this.lastPhase = g.phase;
    }
    if (g.phase === 'meeting') return this.meetingTick(g, self, now);
    if (g.phase !== 'playing') return;
    team.sync(g);
    if (now - this.lastObs >= 150) {
      this.lastObs = now;
      this.observe(g, self, now);
    }
    if (now < this.waitUntil) return;
    this.playTick(g, self, now, team);
  }

  // ---- helpers ----

  private act(g: Game, self: SPlayer, msg: ClientMessage, now: number): void {
    g.handle(self.id, msg, now);
  }

  private move(g: Game, self: SPlayer, goal: Goal, now: number): boolean {
    const inp = this.mover.step(g, self, goal, now);
    if (!inp) return false;
    if (inp[0] || inp[1]) this.act(g, self, { t: 'input', seq: ++this.seq, dx: inp[0], dy: inp[1] }, now);
    return true;
  }

  private stationGoal(st: StationDef): Goal {
    return { key: `st:${st.id}`, x: st.x, y: st.y, range: USE_RANGE, dist: (x, y) => stationDistance(st, x, y) };
  }

  private roomName(g: Game, x: number, y: number): string | null {
    const id = g.map.roomAt(x, y);
    return id ? g.map.rooms.get(id)?.name ?? id : null;
  }

  private canSee(g: Game, self: SPlayer, x: number, y: number): boolean {
    if (!self.alive) return true;
    return dist(self.x, self.y, x, y) <= g.visionRadius(self) && hasLineOfSight(self.x, self.y, x, y, g.map.visionGrid, g.closedDoorSegs());
  }

  /** What another player looks like right now (a shapeshifter looks like its target). */
  private look(g: Game, q: SPlayer): SPlayer {
    return q.shift?.as ? g.byId.get(q.shift.as) ?? q : q;
  }

  private teammate(g: Game, self: SPlayer, q: SPlayer): boolean {
    return g.isImpostor(self) && g.isImpostor(q);
  }

  // ---- phases ----

  private onPhase(g: Game, self: SPlayer, now: number): void {
    if (g.phase === 'playing') {
      this.mover.clear();
      this.work = null;
      this.target = null;
      this.wander = null;
      this.reportBody = null;
      this.escapeVent = null;
      this.killTarget = null;
      this.waitUntil = now + 400 + this.rng() * 2200;
      if (this.mtg) {
        // A new round: old evidence counts for less.
        for (const [id, v] of this.sus) this.sus.set(id, v * 0.5);
        this.sawKill = null;
        this.sawVent = null;
        this.nearBody = [];
        this.withVictim = [];
      }
      this.mtg = null;
      this.outbox = [];
    } else if (g.phase === 'meeting' && g.meeting) {
      const m = g.meeting;
      const reporter = m.callerId === self.id;
      this.mtg = {
        kind: m.kind,
        reporter,
        caller: g.byId.get(m.callerId)?.name ?? null,
        victim: m.bodyColor !== null ? g.players.find((p) => p.color === m.bodyColor)?.name ?? null : null,
        bodyRoom: reporter ? this.reportRoom : null,
        myRoom: this.roomName(g, self.x, self.y) ?? this.lastRoom,
        planned: false,
        linesLeft: 0,
        nextLineAt: 0,
        spoke: 0,
        pending: false,
        accuser: null,
        accuserId: null,
        defendAt: 0,
        defended: false,
        voteAt: 0,
        accusations: new Map(),
        chat: [],
        unread: [],
        lastSentAt: 0,
      };
      this.mtgKey++;
      this.work = null;
      // Whoever we last saw hanging around the victim looks bad now.
      this.withVictim = [];
      const victim = m.bodyColor !== null ? g.players.find((p) => p.color === m.bodyColor) : undefined;
      if (victim && self.alive) {
        for (const [id, at] of this.together.get(victim.id) ?? []) {
          const q = g.byId.get(id);
          if (!q || q === self || !q.alive || now - at > 30_000 || this.teammate(g, self, q)) continue;
          this.withVictim.push(q.name);
          this.sus.set(id, (this.sus.get(id) ?? 0) + 25);
        }
      }
    }
  }

  // ---- seeing ----

  private observe(g: Game, self: SPlayer, now: number): void {
    const here = this.roomName(g, self.x, self.y);
    if (here) this.lastRoom = here;
    const imp = g.isImpostor(self);
    const vis = new Set<string>();
    for (const q of g.players) {
      if (q === self || q.removed || !q.alive) continue;
      const look = this.look(g, q);
      if (q.venting) {
        const key = `${q.id}:${q.venting}`;
        if (this.visible.has(q.id) && !this.ventNoted.has(key) && this.canSee(g, self, q.x, q.y)) {
          this.ventNoted.add(key);
          if (!this.teammate(g, self, q) && self.alive) {
            this.sawVent = { who: look.name, room: this.roomName(g, q.x, q.y) };
            this.sus.set(look.id, Math.max(this.sus.get(look.id) ?? 0, 60));
          }
        }
        continue;
      }
      for (const k of this.ventNoted) if (k.startsWith(`${q.id}:`)) this.ventNoted.delete(k);
      if (!this.canSee(g, self, q.x, q.y)) continue;
      vis.add(q.id);
      const room = this.roomName(g, q.x, q.y);
      if (room) this.seen.set(look.name, { room, at: now });
    }
    this.visible = vis;
    if (self.alive) {
      const vs = [...vis].map((id) => g.byId.get(id)!);
      for (const a of vs) {
        for (const b of vs) {
          if (a === b || dist(a.x, a.y, b.x, b.y) > 300) continue;
          let m = this.together.get(a.id);
          if (!m) this.together.set(a.id, (m = new Map()));
          m.set(this.look(g, b).id, now);
        }
      }
    }

    for (const b of g.bodies) {
      if (this.knownBodies.has(b.id) || !this.canSee(g, self, b.x, b.y)) continue;
      this.knownBodies.add(b.id);
      if (this.myKills.has(b.victimId)) continue;
      const room = this.roomName(g, b.x, b.y);
      const victim = g.byId.get(b.victimId)?.name ?? COLORS[b.color]?.name ?? 'someone';
      let teammateNear = false;
      // A body that just dropped: whoever is standing on it did it.
      if (now - b.at < 500) {
        const killer = g.players.find((q) => q !== self && q.alive && !q.removed && dist(q.x, q.y, b.x, b.y) < 30);
        if (killer) {
          if (this.teammate(g, self, killer)) teammateNear = true;
          else if (self.alive) {
            const look = this.look(g, killer);
            this.sawKill = { killer: look.name, victim, room };
            this.sus.set(look.id, 100);
          }
        }
      }
      this.nearBody = [];
      for (const q of g.players) {
        if (q === self || q.removed || !q.alive || !vis.has(q.id) || dist(q.x, q.y, b.x, b.y) > 220) continue;
        if (this.teammate(g, self, q)) {
          teammateNear = true;
          continue;
        }
        const look = this.look(g, q);
        this.nearBody.push(look.name);
        this.sus.set(look.id, (this.sus.get(look.id) ?? 0) + 15);
      }
      if (!self.alive || this.reportBody !== null) continue;
      if (!imp || (!teammateNear && this.rng() < 0.35)) {
        this.reportBody = b.id;
        this.reportRoom = room;
        this.reportAt = now + 300 + this.rng() * 900;
      }
    }
  }

  // ---- playing ----

  private playTick(g: Game, self: SPlayer, now: number, team: BotTeam): void {
    const imp = g.isImpostor(self);

    // Polus: open shut doors in our way.
    if (self.alive && g.map.def.manualDoors) {
      for (const id of g.doors.keys()) {
        const d = g.map.doors.get(id);
        if (d && !d.auto && segDist(self.x, self.y, d.seg) < DOOR_USE_RANGE) this.act(g, self, { t: 'openDoor', doorId: id }, now);
      }
    }

    if (self.venting) return this.ventTick(g, self, now);
    // Impostors keep an eye out for kills while pretending, so they handle fake work themselves.
    if (this.work && !imp && this.workTick(g, self, now)) return;

    if (self.alive && this.reportBody !== null && this.reportTick(g, self, now)) return;

    if (imp) return this.impostorTick(g, self, now);
    if (self.alive && g.sabotage && this.shouldFix(g, self) && this.fixTick(g, self, now, team)) return;
    if (self.alive && this.buttonTick(g, self, now)) return;
    if (this.taskTick(g, self, now)) return;
    this.wanderTick(g, self, now);
  }

  /** Keep working an open panel. Returns true while busy. */
  private workTick(g: Game, self: SPlayer, now: number): boolean {
    const w = this.work!;
    if (w.kind === 'fake') {
      if (now < w.until) return true;
      this.fakeDone.add(w.stationId);
      this.work = null;
      this.target = null;
      return false;
    }
    if (self.openStation?.id !== w.stationId) {
      this.work = null;
      this.target = null;
      return false;
    }
    if (w.kind === 'task') {
      if (now >= w.doneAt) {
        this.act(g, self, { t: 'taskDone', stationId: w.stationId }, now);
        this.work = null;
        this.target = null;
      }
      return true;
    }
    const s = g.sabotage;
    if (!s) {
      this.act(g, self, { t: 'taskClose' }, now);
      this.work = null;
      return false;
    }
    if (now < w.nextAt) return true;
    switch (s.kind) {
      case 'lights': {
        const i = s.lights?.findIndex((on) => !on) ?? -1;
        if (i >= 0) this.act(g, self, { t: 'fix', kind: 'lights', stationId: w.stationId, data: i }, now);
        w.nextAt = now + 250 + this.rng() * 450;
        return true;
      }
      case 'reactor':
        if (!w.sent) this.act(g, self, { t: 'fix', kind: 'reactor', stationId: w.stationId, data: true }, now);
        w.sent = true;
        return true;
      case 'o2':
      case 'comms': {
        const data = s.kind === 'o2' ? g.o2Code : s.keypad ? g.commsCodesFor(w.stationId)[0] : 'tuned';
        this.act(g, self, { t: 'fix', kind: s.kind, stationId: w.stationId, data }, now);
        if (g.sabotage && self.openStation) this.act(g, self, { t: 'taskClose' }, now);
        this.work = null;
        this.target = null;
        return true;
      }
    }
  }

  private reportTick(g: Game, self: SPlayer, now: number): boolean {
    const b = g.bodies.find((x) => x.id === this.reportBody);
    if (!b) {
      this.reportBody = null;
      return false;
    }
    const inRange = dist(self.x, self.y, b.x, b.y) <= REPORT_RANGE - 8 && hasLineOfSight(self.x, self.y, b.x, b.y, g.map.visionGrid, g.closedDoorSegs());
    if (inRange) {
      if (now >= this.reportAt) this.act(g, self, { t: 'report', bodyId: b.id }, now);
      return true;
    }
    if (this.move(g, self, pointGoal(`body:${b.id}`, b.x, b.y, REPORT_RANGE - 20), now)) return true;
    this.reportBody = null;
    return false;
  }

  /** Seen something damning (a vent) and nobody's found a body: call a meeting. */
  private buttonTick(g: Game, self: SPlayer, now: number): boolean {
    const btn = g.map.def.button;
    if (!btn || g.sabotage || self.emergencyUsed >= g.settings.emergencyMeetings || now < g.buttonReadyAt) return false;
    const sure = g.players.some((q) => q !== self && q.alive && !q.removed && (this.sus.get(q.id) ?? 0) >= 60);
    if (!sure) return false;
    if (this.move(g, self, pointGoal('button', btn.x, btn.y, BUTTON_RANGE - 15), now)) return true;
    if (dist(self.x, self.y, btn.x, btn.y) > BUTTON_RANGE) return false;
    this.act(g, self, { t: 'emergency' }, now);
    return true;
  }

  private shouldFix(g: Game, self: SPlayer): boolean {
    const s = g.sabotage!;
    let d = this.fixDecision.get(s.startedAt);
    if (d === undefined) {
      const near = s.stations.some((id) => {
        const st = g.map.stations.get(id);
        return st && dist(self.x, self.y, st.x, st.y) < 500;
      });
      d = s.kind === 'reactor' || s.kind === 'o2' || near || this.rng() < 0.55;
      this.fixDecision.set(s.startedAt, d);
    }
    return d;
  }

  private fixTick(g: Game, self: SPlayer, now: number, team: BotTeam): boolean {
    const s = g.sabotage!;
    const everyStation = s.kind === 'reactor' || s.kind === 'o2' || (s.kind === 'comms' && !!s.keypad);
    let ids = s.stations;
    if (everyStation) {
      const done = s.kind === 'reactor' ? s.reactorHeld : s.panelsDone;
      ids = ids.filter((id) => !done.includes(id));
      const mine = ids.filter((id) => team.claims.get(id) === self.id);
      const free = ids.filter((id) => !team.claims.has(id));
      ids = mine.length ? mine : free.length ? free : ids;
    }
    const stations = ids.map((id) => g.map.stations.get(id)!).filter(Boolean);
    if (!stations.length) return false;
    const st = stations.reduce((a, b) => (dist(self.x, self.y, a.x, a.y) <= dist(self.x, self.y, b.x, b.y) ? a : b));
    if (everyStation) {
      for (const [id, who] of team.claims) if (who === self.id && id !== st.id) team.claims.delete(id);
      team.claims.set(st.id, self.id);
    }
    const goal = this.stationGoal(st);
    if (this.move(g, self, goal, now)) return true;
    if (goal.dist(self.x, self.y) > goal.range) return false;
    this.act(g, self, { t: 'taskOpen', stationId: st.id }, now);
    if (self.openStation?.id === st.id) this.work = { kind: 'fix', stationId: st.id, nextAt: now + 700 + this.rng() * 1500, sent: false };
    return true;
  }

  private taskTick(g: Game, self: SPlayer, now: number): boolean {
    const todo = self.tasks.filter((t) => !t.done && taskReady(t, now) && !this.skip.has(t.stations[t.step]));
    if (!todo.length) return false;
    let t = todo.find((x) => x.stations[x.step] === this.target);
    if (!t) {
      t = todo.reduce((a, b) => {
        const sa = g.map.stations.get(a.stations[a.step])!;
        const sb = g.map.stations.get(b.stations[b.step])!;
        return dist(self.x, self.y, sa.x, sa.y) <= dist(self.x, self.y, sb.x, sb.y) ? a : b;
      });
    }
    const id = t.stations[t.step];
    const st = g.map.stations.get(id);
    if (!st) {
      this.skip.add(id);
      return true;
    }
    this.target = id;
    this.lastTask = taskName(t);
    const goal = this.stationGoal(st);
    if (this.move(g, self, goal, now)) return true;
    if (goal.dist(self.x, self.y) > goal.range) {
      if (this.mover.unreachable) this.skip.add(id);
      return true;
    }
    this.act(g, self, { t: 'taskOpen', stationId: id }, now);
    if (self.openStation?.id === id) {
      const min = TASK_DEFS[t.type].minMs[t.step] ?? 0;
      this.work = { kind: 'task', stationId: id, doneAt: now + min + 400 + this.rng() * 1600 };
    } else {
      this.skip.add(id);
    }
    return true;
  }

  private wanderTick(g: Game, self: SPlayer, now: number): void {
    if (!this.wander || this.mover.unreachable) {
      const room = pick(this.rng, g.map.def.rooms.filter((r) => !r.outdoor));
      const c = roomLabel(room);
      this.wander = pointGoal(`wander:${room.id}:${now}`, c.x, c.y, 70);
    }
    if (this.move(g, self, this.wander, now)) return;
    this.wander = null;
    this.waitUntil = now + 1000 + this.rng() * 4000;
  }

  // ---- impostor ----

  private impostorTick(g: Game, self: SPlayer, now: number): void {
    this.maybeSabotage(g, self, now);
    if (self.alive) {
      if (now >= self.killReadyAt) {
        const victim = this.killCandidate(g, self, now);
        if (victim) {
          if (this.killTarget !== victim.id) {
            this.killTarget = victim.id;
            this.killAt = now + 150 + this.rng() * 500;
          }
          if (now >= this.killAt) {
            this.act(g, self, { t: 'kill', target: victim.eid }, now);
            if (!victim.alive) this.afterKill(g, self, victim);
          }
          return;
        }
        this.killTarget = null;
        const prey = now >= this.chaseRestUntil ? this.prey(g, self) : null;
        if (prey) {
          if (!this.chaseUntil) this.chaseUntil = now + 9000;
          if (now < this.chaseUntil) {
            this.work = null;
            const key = `chase:${prey.id}:${Math.round(prey.x / 60)}:${Math.round(prey.y / 60)}`;
            if (this.move(g, self, pointGoal(key, prey.x, prey.y, KILL_RANGES[g.settings.killDistance] * 0.5), now)) return;
          } else {
            this.chaseUntil = 0;
            this.chaseRestUntil = now + 6000;
          }
        } else {
          this.chaseUntil = 0;
        }
      }
      if (this.escapeVent && this.escapeTick(g, self, now)) return;
    }
    this.fakeTaskTick(g, self, now);
  }

  /** A crewmate we can kill right now with nobody else watching (or, now and then, just one). */
  private killCandidate(g: Game, self: SPlayer, now: number): SPlayer | null {
    const range = KILL_RANGES[g.settings.killDistance] - 10;
    const segs = g.closedDoorSegs();
    for (const q of g.players) {
      if (q === self || q.removed || !q.alive || q.venting || g.isImpostor(q)) continue;
      if (dist(self.x, self.y, q.x, q.y) > range) continue;
      if (!hasLineOfSight(self.x, self.y, q.x, q.y, g.map.visionGrid, segs)) continue;
      const w = this.witnesses(g, self, q, self.x, self.y);
      if (w === 0) return q;
      if (w === 1) {
        if (!this.risk || this.risk.id !== q.id || now > this.risk.until) this.risk = { id: q.id, until: now + 5000, ok: this.rng() < 0.15 };
        if (this.risk.ok) return q;
      }
    }
    return null;
  }

  /** Living crewmates other than `except` who could see (x, y). */
  private witnesses(g: Game, self: SPlayer, except: SPlayer, x: number, y: number): number {
    const segs = g.closedDoorSegs();
    let n = 0;
    for (const w of g.players) {
      if (w === self || w === except || w.removed || !w.alive || w.venting || g.isImpostor(w)) continue;
      if (dist(w.x, w.y, x, y) <= g.visionRadius(w) && hasLineOfSight(w.x, w.y, x, y, g.map.visionGrid, segs)) n++;
    }
    return n;
  }

  /** A crewmate we can see who is on their own. */
  private prey(g: Game, self: SPlayer): SPlayer | null {
    let best: SPlayer | null = null;
    let bestD = 450;
    for (const q of g.players) {
      if (q === self || q.removed || !q.alive || q.venting || g.isImpostor(q) || !this.visible.has(q.id)) continue;
      const d = dist(self.x, self.y, q.x, q.y);
      if (d < bestD && this.witnesses(g, self, q, q.x, q.y) === 0) {
        best = q;
        bestD = d;
      }
    }
    return best;
  }

  private afterKill(g: Game, self: SPlayer, victim: SPlayer): void {
    this.myKills.add(victim.id);
    this.killTarget = null;
    this.chaseUntil = 0;
    this.work = null;
    this.target = null;
    this.mover.clear();
    const vents = [...g.map.vents.values()].filter((v) => dist(self.x, self.y, v.x, v.y) < 260);
    if (vents.length && this.rng() < 0.5) {
      const v = vents.reduce((a, b) => (dist(self.x, self.y, a.x, a.y) <= dist(self.x, self.y, b.x, b.y) ? a : b));
      this.escapeVent = v.id;
      this.ventHops = 1 + Math.floor(this.rng() * 2);
    } else {
      // Walk off to some far-away pretend task.
      const far = self.tasks.map((t) => t.stations[t.step]).filter((id) => {
        const st = g.map.stations.get(id);
        return st && dist(self.x, self.y, st.x, st.y) > 500;
      });
      if (far.length) this.target = pick(this.rng, far);
    }
  }

  private escapeTick(g: Game, self: SPlayer, now: number): boolean {
    const v = g.map.vents.get(this.escapeVent!);
    if (!v) {
      this.escapeVent = null;
      return false;
    }
    if (this.move(g, self, pointGoal(`vent:${v.id}`, v.x, v.y, USE_RANGE - 5), now)) return true;
    this.act(g, self, { t: 'vent', action: 'enter', ventId: v.id }, now);
    this.escapeVent = null;
    this.ventNextAt = now + 500 + this.rng() * 700;
    return !!self.venting;
  }

  private ventTick(g: Game, self: SPlayer, now: number): void {
    if (now < this.ventNextAt) return;
    const cur = g.map.vents.get(self.venting!);
    if (this.ventHops > 0 && cur?.links.length) {
      this.act(g, self, { t: 'vent', action: 'move', ventId: pick(this.rng, cur.links) }, now);
      this.ventHops--;
      this.ventNextAt = now + 600 + this.rng() * 800;
      return;
    }
    // Wait for the coast to be clear before popping out.
    if (this.witnesses(g, self, self, self.x, self.y) > 0 && this.rng() < 0.85) {
      this.ventNextAt = now + 400;
      return;
    }
    this.act(g, self, { t: 'vent', action: 'exit' }, now);
    this.mover.clear();
  }

  private maybeSabotage(g: Game, self: SPlayer, now: number): void {
    if (g.sabotage || now < g.sabotageReadyAt) return;
    if (this.nextSabAt < g.sabotageReadyAt) this.nextSabAt = Math.max(now, g.sabotageReadyAt) + 3000 + this.rng() * 35_000;
    if (now < this.nextSabAt) return;
    this.nextSabAt = 0;
    const doorRooms = [...new Set(g.map.def.doors.filter((d) => !d.auto).map((d) => d.room))].filter((r) => now >= (g.doorReadyAt.get(r) ?? 0));
    if (doorRooms.length && this.rng() < 0.25) {
      this.act(g, self, { t: 'sabotage', kind: 'doors', room: pick(this.rng, doorRooms) }, now);
      return;
    }
    const weights: Record<SabotageKind, number> = { lights: 3, comms: 2, reactor: 1.5, o2: 1.5 };
    const kinds = [...g.map.sabotages.keys()];
    if (!kinds.length) return;
    let r = this.rng() * kinds.reduce((s, k) => s + weights[k], 0);
    let kind = kinds[0];
    for (const k of kinds) {
      r -= weights[k];
      if (r <= 0) {
        kind = k;
        break;
      }
    }
    this.act(g, self, { t: 'sabotage', kind }, now);
  }

  /** Walk between our fake tasks and stand at each for a believable time. */
  private fakeTaskTick(g: Game, self: SPlayer, now: number): void {
    if (this.work?.kind === 'fake') {
      if (now < this.work.until) return;
      this.fakeDone.add(this.work.stationId);
      this.work = null;
      this.target = null;
    }
    let ids = self.tasks.map((t) => t.stations[0]).filter((id) => g.map.stations.has(id) && !this.fakeDone.has(id) && !this.skip.has(id));
    if (!ids.length) {
      this.fakeDone.clear();
      ids = self.tasks.map((t) => t.stations[0]).filter((id) => g.map.stations.has(id) && !this.skip.has(id));
    }
    if (!ids.length) return this.wanderTick(g, self, now);
    if (!this.target || !g.map.stations.has(this.target)) this.target = pick(this.rng, ids);
    const st = g.map.stations.get(this.target)!;
    const t = self.tasks.find((x) => x.stations.includes(st.id));
    if (t) this.lastTask = taskName(t);
    const goal = this.stationGoal(st);
    if (this.move(g, self, goal, now)) return;
    if (goal.dist(self.x, self.y) > goal.range) {
      if (this.mover.unreachable) this.skip.add(st.id);
      this.target = null;
      return;
    }
    this.work = { kind: 'fake', stationId: st.id, until: now + 1500 + this.rng() * 5000 };
  }

  // ---- meetings ----

  private meetingTick(g: Game, self: SPlayer, now: number): void {
    const m = g.meeting;
    const mm = this.mtg;
    if (!m || !mm) return;
    for (const line of mm.unread.splice(0)) this.readChat(g, self, line, now);

    if (this.outbox.length && now - mm.lastSentAt >= 1300) {
      this.act(g, self, { t: 'chat', text: this.outbox.shift()! }, now);
      mm.lastSentAt = now;
    }
    if (!self.alive) return;

    if (m.stage === 'discussion' || m.stage === 'voting') {
      if (!mm.planned) {
        mm.planned = true;
        const important = mm.reporter || !!this.sawKill || !!this.sawVent;
        mm.linesLeft = important ? 2 : this.rng() < 0.15 ? 0 : this.rng() < 0.7 ? 1 : 2;
        mm.nextLineAt = now + (important ? 600 + this.rng() * 1500 : 1500 + this.rng() * 6000);
      }
      if (mm.linesLeft > 0 && now >= mm.nextLineAt && !mm.pending) {
        this.say(g, self, mm.spoke === 0 ? 'open' : 'followup', now);
        mm.linesLeft--;
        mm.nextLineAt = now + 4000 + this.rng() * 8000;
      }
      if (mm.accuser && !mm.defended && now >= mm.defendAt && !mm.pending) {
        mm.defended = true;
        this.say(g, self, 'defend', now);
      }
    }

    if (m.stage === 'voting' && self.vote === null) {
      if (!mm.voteAt) mm.voteAt = now + 2000 + this.rng() * Math.min(18_000, g.settings.votingTime * 400);
      if (now >= mm.voteAt) this.act(g, self, { t: 'vote', target: this.voteTarget(g, self) }, now);
    }
  }

  private readChat(g: Game, self: SPlayer, line: { fromId: string; name: string; text: string }, now: number): void {
    if (line.fromId === self.id) return;
    const lower = line.text.toLowerCase();
    if (!SUS_WORDS.test(lower)) return;
    const clearing = CLEAR_WORDS.test(lower);
    for (const q of g.players) {
      if (q.removed || !q.alive || q.id === line.fromId) continue;
      const names = [q.name, COLORS[q.color]?.name ?? ''].filter(Boolean).map((n) => n.toLowerCase());
      if (!names.some((n) => new RegExp(`\\b${escapeRe(n)}\\b`).test(lower))) continue;
      if (clearing && !/\b(sus|vote|impostor|imposter|killed|vented)\b/.test(lower)) continue;
      const mm = this.mtg!;
      mm.accusations.set(q.id, (mm.accusations.get(q.id) ?? 0) + 1);
      if (q === self && !mm.accuser) {
        mm.accuser = line.name;
        mm.accuserId = line.fromId;
        mm.defendAt = now + 1200 + this.rng() * 2500;
      }
    }
  }

  private voteTarget(g: Game, self: SPlayer): string {
    const mm = this.mtg!;
    const others = g.players.filter((q) => q !== self && !q.removed && q.alive);
    const acc = (q: SPlayer) => mm.accusations.get(q.id) ?? 0;
    if (g.isImpostor(self)) {
      const crew = others.filter((q) => !g.isImpostor(q));
      const top = crew.reduce<SPlayer | null>((a, b) => (!a || acc(b) > acc(a) ? b : a), null);
      if (top && (acc(top) >= 2 || (acc(top) >= 1 && this.rng() < 0.5))) return top.id;
      const accuser = mm.accuserId ? g.byId.get(mm.accuserId) : undefined;
      if (accuser && accuser.alive && !g.isImpostor(accuser) && this.rng() < 0.35) return accuser.id;
      return 'skip';
    }
    const score = (q: SPlayer) => (this.sus.get(q.id) ?? 0) + acc(q) * 12;
    const top = others.reduce<SPlayer | null>((a, b) => (!a || score(b) > score(a) ? b : a), null);
    if (!top) return 'skip';
    const s = score(top);
    return s >= 25 || (s >= 12 && this.rng() < 0.3) ? top.id : 'skip';
  }

  private say(g: Game, self: SPlayer, purpose: ChatContext['purpose'], now: number): void {
    const mm = this.mtg!;
    mm.spoke++;
    const vote = this.voteTarget(g, self);
    const imp = g.isImpostor(self);
    const alive = g.players.filter((q) => !q.removed && q.alive);
    const ctx: ChatContext = {
      name: self.name,
      impostor: imp,
      teammates: imp ? alive.filter((q) => q !== self && g.isImpostor(q)).map((q) => q.name) : [],
      purpose,
      reporter: mm.reporter,
      caller: mm.caller,
      kind: mm.kind,
      victim: mm.victim,
      bodyRoom: mm.bodyRoom,
      myRoom: mm.myRoom,
      myTask: this.lastTask,
      sawKill: this.sawKill,
      sawVent: this.sawVent,
      nearBody: this.nearBody,
      withVictim: this.withVictim,
      lastSeen: [...this.seen]
        .filter(([name, s]) => name !== self.name && now - s.at < 60_000)
        .sort((a, b) => b[1].at - a[1].at)
        .slice(0, 4)
        .map(([name, s]) => ({ name, room: s.room })),
      suspect: vote === 'skip' ? null : g.byId.get(vote)?.name ?? null,
      accuser: mm.accuser,
      alive: alive.map((q) => q.name),
      chat: mm.chat,
    };
    if (!llmConfig()) {
      this.outbox.push(templateLine(ctx, this.rng));
      return;
    }
    const key = this.mtgKey;
    mm.pending = true;
    botLine(ctx, this.rng)
      .then((line) => {
        if (this.mtgKey === key && this.mtg) this.outbox.push(line);
      })
      .finally(() => {
        if (this.mtg === mm) mm.pending = false;
      });
  }
}
