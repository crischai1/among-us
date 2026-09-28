import {
  DECON_MS, DOOR_LOG_MAX, EJECTION_MS, GAMEOVER_MS, INITIAL_KILL_COOLDOWN_MS, LIGHTS_FADE_MS, LIGHTS_VISION_FACTOR,
  MEETING_INTRO_MS, MIN_PLAYERS, RESULTS_MS, REVEAL_MS, SABOTAGE_AFTER_MEETING_MS, SENSOR_COOLDOWN_MS, TICK_MS, USE_RANGE, VISION_BASE,
} from '../../shared/constants';
import { clamp, dist, lerp, pointInRect, segsIntersect } from '../../shared/geom';
import { getMap, spawnPoint, type CompiledMap } from '../../shared/map';
import { stationDistance } from '../../shared/map/build';
import type { StationDef } from '../../shared/map/types';
import type { ServerMessage } from '../../shared/protocol';
import { makeRng, shuffle, type Rng } from '../../shared/rng';
import { COMMS_CODE_MS, commsCode } from '../../shared/rules/sabotage';
import { assignRoles } from '../../shared/rules/roles';
import { assignTasks } from '../../shared/rules/tasks';
import { tallyVotes } from '../../shared/rules/voting';
import { checkWin } from '../../shared/rules/win';
import type { GameSettings } from '../../shared/settings';
import { doorSegs, stepPlayer } from '../../shared/sim/movement';
import {
  CRITICAL_SABOTAGES, isImpostorRole, type DoorLogEntry, type EjectionInfo, type GameEvent, type GameOverInfo, type Phase, type Role,
  type SabotageState, type WinReason, type Winner,
} from '../../shared/types';
import { handleAction } from './actions';
import { INPUT_BURST, takeInputs, type Body, type Meeting, type SPlayer } from './types';
import { buildPriv, buildPub, buildSnap } from './views';

export interface GamePlayerInit {
  id: string;
  name: string;
  color: number;
  hat?: number;
}

export interface GameOptions {
  players: GamePlayerInit[];
  settings: GameSettings;
  seed: number;
  now: number;
  dev?: boolean;
  forcedRoles?: Record<string, Role>;
}

export type Send = (playerId: string, msg: ServerMessage) => void;

/**
 * One match on the ship. Fully deterministic given its inputs: time only
 * advances through update(now), so tests can drive it with a fake clock.
 */
export class Game {
  readonly map: CompiledMap;
  readonly settings: GameSettings;
  readonly dev: boolean;
  readonly rng: Rng;
  readonly players: SPlayer[] = [];
  readonly byId = new Map<string, SPlayer>();
  readonly byEid = new Map<number, SPlayer>();

  phase: Phase = 'reveal';
  phaseEndsAt: number;
  now: number;
  private simTime: number;

  bodies: Body[] = [];
  nextBodyId = 1;
  meeting: Meeting | null = null;
  ejection: EjectionInfo | null = null;
  gameOver: GameOverInfo | null = null;
  finished = false;

  sabotage: SabotageState | null = null;
  sabotageReadyAt: number;
  o2Code = '00000';
  reactorHolders = new Map<string, string>();
  doors = new Map<string, number>();
  doorReadyAt = new Map<string, number>();
  buttonReadyAt = 0;
  frozenTaskBar = 0;
  /** Door log, newest first. */
  doorLog: DoorLogEntry[] = [];
  /** Seed for keypad comms codes, drawn when comms is sabotaged. */
  commsSeed = 0;
  private commsWin = -1;

  /** Runs at the start of every simulation tick (server-played bots queue their input here). */
  beforeTick: (() => void) | null = null;

  private pubDirty = true;
  private privDirty = new Set<string>();
  private nextConsoleRefresh = 0;

  constructor(opts: GameOptions, readonly send: Send) {
    this.settings = opts.settings;
    this.map = getMap(opts.settings.map ?? 'skeld');
    this.dev = !!opts.dev;
    this.rng = makeRng(opts.seed);
    this.now = opts.now;
    this.simTime = opts.now;
    this.phaseEndsAt = opts.now + REVEAL_MS;
    this.sabotageReadyAt = opts.now + REVEAL_MS + SABOTAGE_AFTER_MEETING_MS;

    const ids = opts.players.map((p) => p.id);
    const roles = assignRoles(ids, this.settings, this.rng, opts.forcedRoles);
    const impostors = new Set(ids.filter((id) => isImpostorRole(roles[id])));
    const tasks = assignTasks(ids, impostors, this.settings, this.rng, this.map.def);
    const eids = shuffle(this.rng, ids.map((_, i) => 10 + i * 7 + Math.floor(this.rng() * 5)));

    opts.players.forEach((init, i) => {
      const role = roles[init.id];
      const sp = spawnPoint(this.map.def, i, opts.players.length, this.map.def.start);
      const p: SPlayer = {
        ...init,
        hat: init.hat ?? 0,
        eid: eids[i],
        idx: i,
        role,
        alive: true,
        connected: true,
        removed: false,
        knownDead: false,
        x: sp.x,
        y: sp.y,
        gen: 1,
        inputs: [],
        lastSeq: 0,
        inputBudget: INPUT_BURST,
        tasks: tasks.get(init.id) ?? [],
        killReadyAt: opts.now + REVEAL_MS + INITIAL_KILL_COOLDOWN_MS,
        emergencyUsed: 0,
        venting: null,
        ventReadyAt: 0,
        ventEndsAt: null,
        openStation: null,
        console: null,
        consoleSeq: 0,
        battery: role === 'scientist' ? { leftMs: this.settings.scientistBattery * 1000, readyAt: 0, open: false } : null,
        shift: role === 'shapeshifter' ? { as: null, endsAt: 0, readyAt: opts.now + REVEAL_MS + 10_000 } : null,
        vote: null,
        lastChatAt: 0,
        noclip: false,
        prevX: sp.x,
        prevY: sp.y,
        deconDone: null,
        sensorAt: {},
      };
      this.players.push(p);
      this.byId.set(p.id, p);
      this.byEid.set(p.eid, p);
    });
    this.markAllPriv();
  }

  // ---- helpers ----

  get active(): SPlayer[] {
    return this.players.filter((p) => !p.removed);
  }

  isImpostor(p: SPlayer): boolean {
    return isImpostorRole(p.role);
  }

  get commsDown(): boolean {
    return this.sabotage?.kind === 'comms';
  }

  get criticalActive(): boolean {
    return !!this.sabotage && CRITICAL_SABOTAGES.includes(this.sabotage.kind);
  }

  closedDoorSegs() {
    return doorSegs(this.map, this.doors.keys());
  }

  visionRadius(p: SPlayer): number {
    if (this.isImpostor(p)) return this.settings.impostorVision * VISION_BASE;
    let r = this.settings.crewVision * VISION_BASE;
    if (this.sabotage?.kind === 'lights') {
      const t = clamp((this.now - this.sabotage.startedAt) / LIGHTS_FADE_MS, 0, 1);
      r *= lerp(1, LIGHTS_VISION_FACTOR, t);
    }
    return r;
  }

  inRange(p: SPlayer, x: number, y: number, range = USE_RANGE): boolean {
    return dist(p.x, p.y, x, y) <= range + 12;
  }

  /** Close enough to use a station (from any side of its area, if it has one). */
  atStation(p: SPlayer, st: StationDef): boolean {
    return stationDistance(st, p.x, p.y) <= USE_RANGE + 12;
  }

  taskProgress(): { done: number; total: number } {
    let done = 0;
    let total = 0;
    for (const p of this.active) {
      for (const t of p.tasks) {
        if (t.fake) continue;
        total++;
        if (t.done) done++;
      }
    }
    return { done, total };
  }

  taskBar(): number | null {
    const mode = this.settings.taskBarUpdates;
    if (mode === 'never') return null;
    if (mode === 'meetings') return this.frozenTaskBar;
    const { done, total } = this.taskProgress();
    return total ? done / total : 0;
  }

  markPub(): void {
    this.pubDirty = true;
  }

  markPriv(p: SPlayer | string): void {
    this.privDirty.add(typeof p === 'string' ? p : p.id);
  }

  markAllPriv(): void {
    for (const p of this.players) this.privDirty.add(p.id);
  }

  emit(p: SPlayer, ev: GameEvent): void {
    if (!p.removed && p.connected) this.send(p.id, { t: 'ev', ev });
  }

  emitAll(ev: GameEvent, filter: (p: SPlayer) => boolean = () => true): void {
    for (const p of this.active) if (filter(p)) this.emit(p, ev);
  }

  /** Send an event to everyone who could plausibly see point (x, y). */
  emitNear(x: number, y: number, ev: GameEvent): void {
    this.emitAll(ev, (p) => !p.alive || dist(p.x, p.y, x, y) <= this.visionRadius(p) * 1.35);
  }

  teleport(p: SPlayer, x: number, y: number): void {
    p.x = x;
    p.y = y;
    p.gen++;
    p.inputs.length = 0;
  }

  // ---- lifecycle ----

  update(now: number): void {
    while (this.simTime + TICK_MS <= now) {
      this.simTime += TICK_MS;
      this.now = this.simTime;
      this.beforeTick?.();
      this.tick();
    }
    this.now = Math.max(this.now, now);
    this.flush();
  }

  handle(playerId: string, msg: import('../../shared/protocol').ClientMessage, now: number): void {
    const p = this.byId.get(playerId);
    if (!p || p.removed) return;
    this.now = Math.max(this.now, now);
    handleAction(this, p, msg);
  }

  setConnected(playerId: string, connected: boolean): void {
    const p = this.byId.get(playerId);
    if (!p || p.removed) return;
    p.connected = connected;
    p.inputs.length = 0;
    if (!connected) this.releasePanels(p);
    else {
      p.gen++;
      this.markPriv(p);
      this.forcePub.add(p.id);
    }
    this.markPub();
  }

  private forcePub = new Set<string>();

  /** Grace period expired or the player left: drop them from the match. */
  removePlayer(playerId: string): void {
    const p = this.byId.get(playerId);
    if (!p || p.removed) return;
    this.releasePanels(p);
    p.removed = true;
    p.connected = false;
    p.alive = false;
    p.knownDead = true;
    this.markPub();
    this.markAllPriv();
    if (this.phase === 'playing') this.checkWin();
  }

  releasePanels(p: SPlayer): void {
    p.openStation = null;
    p.console = null;
    if (p.battery) p.battery.open = false;
    for (const [st, holder] of this.reactorHolders) if (holder === p.id) this.reactorHolders.delete(st);
    if (this.sabotage?.kind === 'reactor') this.sabotage.reactorHeld = [...this.reactorHolders.keys()];
    this.markPriv(p);
  }

  // ---- tick ----

  private tick(): void {
    const now = this.now;
    if (now >= this.phaseEndsAt) this.advancePhase();

    const moving = this.phase === 'playing';
    const segs = moving ? this.closedDoorSegs() : [];
    for (const p of this.players) {
      if (p.removed) continue;
      p.prevX = p.x;
      p.prevY = p.y;
      if (!moving || p.venting || !p.connected) {
        // Acknowledge but ignore movement while frozen.
        if (p.inputs.length) {
          p.lastSeq = p.inputs[p.inputs.length - 1].seq;
          p.inputs.length = 0;
        }
        continue;
      }
      for (const inp of takeInputs(p)) {
        // A panel (task, fix, console) holds the player still. Inputs sent before it
        // opened still apply. The client never sends movement while a panel is open,
        // so a real move sent after opening means its panel is gone: close ours too,
        // rather than freezing the player on a desync.
        const lock = p.openStation ? p.openStation.seq : p.console ? p.consoleSeq : null;
        if (lock !== null && inp.seq > lock) {
          if (inp.dx === 0 && inp.dy === 0) {
            p.lastSeq = inp.seq;
            continue;
          }
          this.releasePanels(p);
          this.markPub();
        }
        stepPlayer(p, inp.dx, inp.dy, {
          map: this.map,
          doors: segs,
          speed: this.settings.playerSpeed,
          noclip: !p.alive || p.noclip,
        });
        p.lastSeq = inp.seq;
      }
    }

    if (this.phase !== 'playing') return;

    // Doors reopen
    for (const [id, at] of this.doors) {
      if (now >= at) {
        this.doors.delete(id);
        this.markPub();
      }
    }
    this.tickDecon(now);
    this.tickSensors(now);

    // Sabotage
    if (this.sabotage) {
      if (this.sabotage.endsAt !== null && now >= this.sabotage.endsAt) {
        this.endGame('impostors', 'sabotage');
        return;
      }
      if (this.sabotage.kind === 'reactor') {
        let changed = false;
        for (const [st, holder] of this.reactorHolders) {
          const hp = this.byId.get(holder);
          const station = this.map.stations.get(st)!;
          if (!hp || !hp.alive || !hp.connected || hp.openStation?.id !== st || !this.atStation(hp, station)) {
            this.reactorHolders.delete(st);
            changed = true;
          }
        }
        if (changed) {
          this.sabotage.reactorHeld = [...this.reactorHolders.keys()];
          this.markPub();
        }
      }
    }

    for (const p of this.players) {
      if (p.removed) continue;
      // Engineer max vent time
      if (p.venting && p.ventEndsAt !== null && now >= p.ventEndsAt) {
        handleAction(this, p, { t: 'vent', action: 'exit' });
      }
      // Shapeshift duration
      if (p.shift?.as && now >= p.shift.endsAt) {
        p.shift.as = null;
        p.shift.readyAt = now + this.settings.shapeshiftCooldown * 1000;
        this.emitNear(p.x, p.y, { k: 'shift', x: p.x, y: p.y });
        this.markPriv(p);
      }
      // Scientist battery
      if (p.battery) {
        if (p.battery.open) {
          p.battery.leftMs -= TICK_MS;
          if (p.battery.leftMs <= 0) {
            p.battery.leftMs = 0;
            p.battery.open = false;
            p.battery.readyAt = now + this.settings.scientistCooldown * 1000;
            this.markPriv(p);
          }
        } else if (p.battery.leftMs <= 0 && now >= p.battery.readyAt) {
          p.battery.leftMs = this.settings.scientistBattery * 1000;
          this.markPriv(p);
        }
      }
    }

    // Keypad comms codes roll over: panels that are open need the new one.
    if (this.sabotage?.keypad) {
      const win = Math.floor(now / COMMS_CODE_MS);
      if (win !== this.commsWin) {
        this.commsWin = win;
        for (const p of this.players) if (p.openStation && this.sabotage.stations.includes(p.openStation.id)) this.markPriv(p);
      }
    }

    if (now >= this.nextConsoleRefresh) {
      this.nextConsoleRefresh = now + 500;
      for (const p of this.players) if (p.console === 'admin' || p.console === 'vitals' || p.battery?.open) this.markPriv(p);
    }
  }

  /**
   * Walking into a decontamination zone shuts its doors for a spray cycle.
   * Anyone in the chamber for a cycle is clean until they leave the room, so
   * stepping back from a door that just opened doesn't start another one.
   */
  private tickDecon(now: number): void {
    for (const dc of this.map.def.decon ?? []) {
      const cycling = dc.doors.some((d) => this.doors.has(d));
      let trigger = false;
      const inRoom: SPlayer[] = [];
      for (const p of this.players) {
        const here = !p.removed && p.alive && !p.venting;
        if (here && this.map.roomAt(p.x, p.y) === dc.room) inRoom.push(p);
        else if (p.deconDone === dc.id) p.deconDone = null;
        if (here && p.deconDone !== dc.id && pointInRect(p.x, p.y, dc.zone)) trigger = true;
      }
      if (trigger && !cycling) {
        for (const d of dc.doors) this.doors.set(d, now + DECON_MS);
        this.markPub();
      }
      if (trigger || cycling) for (const p of inRoom) p.deconDone = dc.id;
    }
  }

  /** Door log: note everyone who walked across a sensor this tick. */
  private tickSensors(now: number): void {
    const sensors = this.map.def.sensors;
    if (!sensors?.length) return;
    let logged = false;
    for (const p of this.players) {
      if (p.removed || !p.alive || p.venting) continue;
      if (p.x === p.prevX && p.y === p.prevY) continue;
      // A teleport (vent, meeting) isn't walking through anything.
      if (dist(p.x, p.y, p.prevX, p.prevY) > 40) continue;
      for (const s of sensors) {
        if (!segsIntersect(p.prevX, p.prevY, p.x, p.y, s.seg)) continue;
        if (now - (p.sensorAt[s.id] ?? -Infinity) < SENSOR_COOLDOWN_MS) continue;
        p.sensorAt[s.id] = now;
        const look = p.shift?.as ? this.byId.get(p.shift.as) ?? p : p;
        this.doorLog.unshift({ color: look.color, sensor: s.name, at: now });
        logged = true;
      }
    }
    if (!logged) return;
    this.doorLog.length = Math.min(this.doorLog.length, DOOR_LOG_MAX);
    for (const p of this.players) if (p.console === 'doorlog') this.markPriv(p);
  }

  /** Codes a keypad comms station accepts right now (the previous one briefly too, for lag). */
  commsCodesFor(stationId: string): string[] {
    const win = Math.floor(this.now / COMMS_CODE_MS);
    const out = [commsCode(this.commsSeed, stationId, win)];
    if (this.now - win * COMMS_CODE_MS < 1500) out.push(commsCode(this.commsSeed, stationId, win - 1));
    return out;
  }

  private advancePhase(): void {
    const now = this.now;
    switch (this.phase) {
      case 'reveal':
        this.phase = 'playing';
        this.phaseEndsAt = Infinity;
        this.buttonReadyAt = now + this.settings.emergencyCooldown * 1000;
        this.markPub();
        this.checkWin();
        return;
      case 'meeting':
        this.advanceMeeting();
        return;
      case 'ejection':
        this.resumePlay();
        return;
      case 'gameover':
        this.finished = true;
        this.phaseEndsAt = Infinity;
        return;
      default:
        this.phaseEndsAt = Infinity;
    }
  }

  // ---- meetings ----

  startMeeting(kind: 'emergency' | 'report', caller: SPlayer, bodyColor: number | null): void {
    const now = this.now;
    if (this.criticalActive) this.sabotage = null;
    this.reactorHolders.clear();
    for (const p of this.players) {
      if (p.venting) {
        const v = this.map.vents.get(p.venting)!;
        p.venting = null;
        p.ventEndsAt = null;
        this.teleport(p, v.x, v.y);
      }
      p.openStation = null;
      p.console = null;
      if (p.battery) p.battery.open = false;
      if (p.shift?.as) {
        p.shift.as = null;
        p.shift.readyAt = now + this.settings.shapeshiftCooldown * 1000;
      }
      p.vote = null;
      if (!p.alive) p.knownDead = true;
    }
    this.doors.clear();
    this.bodies = [];
    const { done, total } = this.taskProgress();
    this.frozenTaskBar = total ? done / total : 0;
    this.meeting = {
      stage: 'intro',
      endsAt: now + MEETING_INTRO_MS,
      kind,
      callerId: caller.id,
      bodyColor,
      votes: {},
      results: null,
    };
    this.phase = 'meeting';
    this.phaseEndsAt = this.meeting.endsAt;
    this.emitAll({ k: 'meeting', kind, callerColor: caller.color, bodyColor });
    this.markPub();
    this.markAllPriv();
  }

  private advanceMeeting(): void {
    const m = this.meeting!;
    const now = this.now;
    if (m.stage === 'intro' && this.settings.discussionTime > 0) {
      m.stage = 'discussion';
      m.endsAt = now + this.settings.discussionTime * 1000;
    } else if (m.stage === 'intro' || m.stage === 'discussion') {
      m.stage = 'voting';
      m.endsAt = now + this.settings.votingTime * 1000;
    } else if (m.stage === 'voting') {
      this.endVoting();
      return;
    } else {
      this.startEjection();
      return;
    }
    this.phaseEndsAt = m.endsAt;
    this.markPub();
  }

  castVote(p: SPlayer, target: string): void {
    const m = this.meeting;
    if (!m || m.stage !== 'voting' || !p.alive || p.vote !== null) return;
    if (target !== 'skip') {
      const t = this.byId.get(target);
      if (!t || !t.alive || t.removed) return;
    }
    p.vote = target;
    m.votes[p.id] = target;
    this.emitAll({ k: 'voted', voterId: p.id });
    this.markPub();
    this.markPriv(p);
    const alive = this.active.filter((q) => q.alive);
    if (alive.every((q) => q.vote !== null || !q.connected)) this.endVoting();
  }

  private endVoting(): void {
    const m = this.meeting!;
    const alive = this.active.filter((p) => p.alive).map((p) => p.id);
    const tally = tallyVotes(m.votes, alive);
    m.results = {
      votes: this.settings.anonymousVotes ? null : { ...m.votes },
      counts: tally.counts,
      ejectedId: tally.ejectedId,
      tie: tally.tie,
    };
    m.stage = 'results';
    m.endsAt = this.now + RESULTS_MS;
    this.phaseEndsAt = m.endsAt;
    this.markPub();
  }

  private startEjection(): void {
    const res = this.meeting!.results!;
    const ej = res.ejectedId ? this.byId.get(res.ejectedId) : undefined;
    let text: string;
    let subtext = '';
    if (ej) {
      ej.alive = false;
      ej.knownDead = true;
      this.releasePanels(ej);
      const remaining = this.active.filter((p) => p.alive && this.isImpostor(p)).length;
      if (this.settings.confirmEjects) {
        const imps = this.players.filter((p) => this.isImpostor(p)).length;
        text = this.isImpostor(ej) ? `${ej.name} was ${imps === 1 ? 'The' : 'An'} Impostor.` : `${ej.name} was not ${imps === 1 ? 'The' : 'An'} Impostor.`;
        subtext = `${remaining} Impostor${remaining === 1 ? '' : 's'} remain${remaining === 1 ? 's' : ''}.`;
      } else {
        text = `${ej.name} was ejected.`;
      }
    } else {
      text = `No one was ejected. (${res.tie ? 'Tie' : 'Skipped'})`;
    }
    this.ejection = { ejectedId: ej?.id ?? null, color: ej?.color ?? null, text, subtext };
    this.phase = 'ejection';
    this.phaseEndsAt = this.now + EJECTION_MS;
    this.markPub();
    this.markAllPriv();
  }

  private resumePlay(): void {
    const now = this.now;
    this.phase = 'playing';
    this.phaseEndsAt = Infinity;
    this.meeting = null;
    this.ejection = null;
    const active = this.active;
    active.forEach((p, i) => {
      const sp = spawnPoint(this.map.def, i, active.length, this.map.def.spawn);
      this.teleport(p, sp.x, sp.y);
      p.vote = null;
      if (this.isImpostor(p)) p.killReadyAt = now + this.settings.killCooldown * 1000;
      if (p.role === 'engineer') p.ventReadyAt = now;
    });
    this.buttonReadyAt = now + this.settings.emergencyCooldown * 1000;
    this.sabotageReadyAt = Math.max(this.sabotageReadyAt, now + SABOTAGE_AFTER_MEETING_MS);
    this.markPub();
    this.markAllPriv();
    this.checkWin();
  }

  // ---- win ----

  checkWin(): void {
    if (this.phase !== 'playing') return;
    const active = this.active;
    const impostorsAlive = active.filter((p) => p.alive && this.isImpostor(p)).length;
    const crewAlive = active.filter((p) => p.alive && !this.isImpostor(p)).length;
    const { done, total } = this.taskProgress();
    const solo = this.dev && this.players.length < MIN_PLAYERS;
    const res = checkWin({
      impostorsAlive: solo ? 1 : impostorsAlive,
      crewAlive: solo ? 2 : crewAlive,
      tasksDone: done,
      tasksTotal: total,
      criticalExpired: false,
    });
    if (!res) return;
    const byDisconnect = res.reason === 'vote' && this.players.some((p) => p.removed && this.isImpostor(p)) && !this.players.some((p) => !p.removed && !p.alive && this.isImpostor(p));
    this.endGame(res.winner, byDisconnect ? 'disconnect' : res.reason);
  }

  endGame(winner: Winner, reason: WinReason): void {
    if (this.phase === 'gameover') return;
    this.phase = 'gameover';
    this.phaseEndsAt = this.now + GAMEOVER_MS;
    this.sabotage = null;
    this.reactorHolders.clear();
    this.doors.clear();
    for (const p of this.players) {
      p.openStation = null;
      p.console = null;
      p.venting = null;
    }
    const roles: Record<string, Role> = {};
    for (const p of this.players) roles[p.id] = p.role;
    this.gameOver = { winner, reason, roles };
    this.markPub();
    this.markAllPriv();
  }

  // ---- output ----

  private flush(): void {
    for (const p of this.players) {
      if (p.removed || !p.connected) continue;
      if (this.pubDirty || this.forcePub.has(p.id)) this.send(p.id, { t: 'pub', state: buildPub(this, p) });
      if (this.privDirty.has(p.id)) this.send(p.id, { t: 'priv', state: buildPriv(this, p) });
      this.send(p.id, buildSnap(this, p));
    }
    this.pubDirty = false;
    this.forcePub.clear();
    this.privDirty.clear();
  }

  /** Whether a station is a sabotage fix panel (as opposed to a task). */
  isSabotageStation(id: string): boolean {
    return [...this.map.sabotages.values()].some((s) => s.stations.includes(id));
  }
}
