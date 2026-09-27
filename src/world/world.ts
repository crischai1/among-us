import { INTERP_DELAY_MS } from '../../shared/constants';
import { serverNow } from '../net/clock';
import { JitterBuffer, sampleAt } from '../net/jitter';
import { getMap, type CompiledMap, type WorldId } from '../../shared/map';
import type { SnapMessage } from '../../shared/protocol';
import { doorSegs, stepPlayer, type MoveCtx } from '../../shared/sim/movement';
import { F_GHOST } from '../../shared/types';

export interface Sample {
  t: number;
  x: number;
  y: number;
  flags: number;
  look: number;
}

export interface RemoteEnt {
  eid: number;
  samples: Sample[];
  x: number;
  y: number;
  flags: number;
  look: number;
  facing: 1 | -1;
  walk: number;
  moving: boolean;
  /** Eased walk blend for animation (0 standing .. 1 walking) */
  amp: number;
  /** Fade in/out alpha */
  alpha: number;
  present: boolean;
}

/** Walk cycle radians per world unit travelled. */
export const WALK_RATE = 0.085;

/** Ease the walk blend towards moving/standing so strides start and stop smoothly. */
export function easeAmp(amp: number, moving: boolean, dtMs: number): number {
  const k = 1 - Math.exp(-dtMs / (moving ? 60 : 90));
  return amp + ((moving ? 1 : 0) - amp) * k;
}

/** Shared jitter buffer for remote-player interpolation. */
export const jitter = new JitterBuffer();

export interface PendingInput {
  seq: number;
  dx: number;
  dy: number;
}

export interface Effect {
  kind: 'vent' | 'shift';
  x: number;
  y: number;
  at: number;
}

/**
 * High-frequency world state, mutated directly by the network layer and read
 * by the canvas every frame. Kept out of React on purpose.
 */
export const world = {
  mapId: 'lobby' as WorldId,
  map: getMap('lobby') as CompiledMap,
  closedDoors: [] as string[],
  speed: 1,
  self: {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    offX: 0,
    offY: 0,
    gen: -1,
    flags: 0,
    facing: 1 as 1 | -1,
    walk: 0,
    moving: false,
    amp: 0,
    ready: false,
  },
  seq: 0,
  pending: [] as PendingInput[],
  ents: new Map<number, RemoteEnt>(),
  bodies: new Map<number, { x: number; y: number; color: number; at: number; hat: number }>(),
  effects: [] as Effect[],
};

export function setWorldMap(id: WorldId): void {
  if (world.mapId === id && world.self.ready) return;
  world.mapId = id;
  world.map = getMap(id);
  world.ents.clear();
  world.bodies.clear();
  world.pending = [];
  world.self.gen = -1;
  world.self.ready = false;
  world.closedDoors = [];
}

export function moveCtx(): MoveCtx {
  return {
    map: world.map,
    doors: doorSegs(world.map, world.closedDoors),
    speed: world.speed,
    noclip: (world.self.flags & F_GHOST) !== 0,
  };
}

/** Apply a server snapshot: reconcile our own prediction and buffer others. */
export function applySnap(msg: SnapMessage): void {
  const s = world.self;
  // After a page reload our counter restarts at 0, but the server drops any
  // input numbered at or below the last one it applied for this seat.
  if (msg.ack > world.seq) world.seq = msg.ack;
  if (msg.you) {
    const [x, y, flags] = msg.you;
    s.flags = flags;
    if (msg.gen !== s.gen || !s.ready) {
      s.gen = msg.gen;
      s.x = s.prevX = x;
      s.y = s.prevY = y;
      s.offX = s.offY = 0;
      world.pending = [];
      s.ready = true;
    } else {
      const oldX = s.x;
      const oldY = s.y;
      world.pending = world.pending.filter((p) => p.seq > msg.ack);
      const p = { x, y };
      const ctx = moveCtx();
      for (const inp of world.pending) stepPlayer(p, inp.dx, inp.dy, ctx);
      const ex = oldX - p.x;
      const ey = oldY - p.y;
      if (Math.hypot(ex, ey) > 40) {
        s.offX = s.offY = 0;
      } else {
        s.offX += ex;
        s.offY += ey;
      }
      s.prevX += p.x - oldX;
      s.prevY += p.y - oldY;
      s.x = p.x;
      s.y = p.y;
    }
  }

  jitter.note(serverNow() - msg.time);

  const seen = new Set<number>();
  for (const [eid, x, y, flags, look] of msg.ents) {
    seen.add(eid);
    let e = world.ents.get(eid);
    if (!e) {
      e = { eid, samples: [], x, y, flags, look, facing: 1, walk: 0, moving: false, amp: 0, alpha: 0, present: true };
      world.ents.set(eid, e);
    }
    if (!e.present) {
      // Reappearing after being out of range: don't interpolate across the gap.
      e.samples = [];
      e.x = x;
      e.y = y;
    }
    e.present = true;
    e.samples.push({ t: msg.time, x, y, flags, look });
    if (e.samples.length > 30) e.samples.shift();
  }
  for (const e of world.ents.values()) if (!seen.has(e.eid)) e.present = false;

  world.bodies.clear();
  for (const [id, x, y, color, at, hat] of msg.bodies) world.bodies.set(id, { x, y, color, at, hat });
}

/** Interpolate remote entities to renderTime and advance their animation. */
export function updateEnts(renderTime: number, dtMs: number): void {
  for (const e of world.ents.values()) {
    e.alpha = Math.max(0, Math.min(1, e.alpha + (e.present ? 1 : -1) * (dtMs / 150)));
    if (!e.present && e.alpha <= 0) {
      world.ents.delete(e.eid);
      continue;
    }
    const sm = e.samples;
    if (!sm.length) continue;
    const at = sampleAt(sm, renderTime);
    const nx = at.x;
    const ny = at.y;
    const latest = at;
    // Drop samples we've fully passed (keep one before renderTime)
    while (sm.length > 2 && sm[1].t < renderTime - INTERP_DELAY_MS) sm.shift();
    const dx = nx - e.x;
    const dy = ny - e.y;
    const d = Math.hypot(dx, dy);
    if (d > 200) {
      e.x = nx;
      e.y = ny;
    } else {
      e.x = nx;
      e.y = ny;
      if (Math.abs(dx) > 0.2) e.facing = dx > 0 ? 1 : -1;
    }
    e.moving = d > 0.3 && d < 200;
    if (e.moving) e.walk += d * WALK_RATE;
    e.amp = easeAmp(e.amp, e.moving, dtMs);
    e.flags = latest.flags;
    e.look = latest.look;
  }
  const s = world.self;
  const decay = Math.exp(-dtMs / 90);
  s.offX *= decay;
  s.offY *= decay;
  const now = performance.now();
  world.effects = world.effects.filter((f) => now - f.at < 800);
}
