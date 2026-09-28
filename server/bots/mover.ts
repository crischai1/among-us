import type { Vec } from '../../shared/geom';
import type { Game } from '../game/Game';
import type { SPlayer } from '../game/types';
import { navFor, type Goal } from './nav';

const REPATH_MS = 4000;
/** No real progress for this long means we're stuck. */
const STUCK_MS = 700;
/** How far ahead along the path we try to aim, longest first. */
const LOOKAHEAD = [150, 100, 65, 40, 22];
/** Keep holding the same keys until the path bends more than this away from them. */
const HOLD_ANGLE = (32 * Math.PI) / 180;

/** Turn a direction into the 8-way input a keyboard player would send. */
export function toInput(vx: number, vy: number): [number, number] {
  const len = Math.hypot(vx, vy);
  if (len < 1e-6) return [0, 0];
  // Within 22.5° of an axis, move straight along it.
  const t = Math.tan(Math.PI / 8);
  const dx = Math.abs(vx) < t * Math.abs(vy) ? 0 : Math.sign(vx);
  const dy = Math.abs(vy) < t * Math.abs(vx) ? 0 : Math.sign(vy);
  return [dx, dy];
}

function angleBetween(ax: number, ay: number, bx: number, by: number): number {
  const d = Math.hypot(ax, ay) * Math.hypot(bx, by);
  return d < 1e-9 ? Math.PI : Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / d)));
}

/**
 * Walks A* paths like a person on a keyboard: aims at a point a little way
 * down the path (pure pursuit), holds the same keys until the path turns, and
 * backs off into open floor if it ever gets wedged.
 */
export class Mover {
  private goal: Goal | null = null;
  private path: Vec[] | null = null;
  /** Index of the path segment we're on (path[seg] -> path[seg + 1]). */
  private seg = 0;
  private plannedAt = 0;
  private doorsKey = '';
  private progressAt = 0;
  private progressPos: Vec = { x: 0, y: 0 };
  private stuckCount = 0;
  private unstick: { x: number; y: number; until: number } | null = null;
  private held: [number, number] = [0, 0];
  /** Cells next to closed doors that the current path avoids (unset if it has to go through one). */
  private blocked: Set<number> | undefined;
  /** Cells next to every closed door. */
  private doorCells: Set<number> | undefined;
  /** The last goal had no path even through closed doors. */
  unreachable = false;

  constructor(private rng: () => number) {}

  get goalKey(): string | null {
    return this.goal?.key ?? null;
  }

  clear(): void {
    this.goal = null;
    this.path = null;
    this.unreachable = false;
    this.unstick = null;
    this.held = [0, 0];
    this.stuckCount = 0;
  }

  /** One tick of movement toward `goal`. Returns the input, or null once in range (or hopeless). */
  step(g: Game, p: SPlayer, goal: Goal, now: number): [number, number] | null {
    if (goal.dist(p.x, p.y) <= goal.range) {
      this.path = null;
      this.goal = goal;
      this.held = [0, 0];
      return null;
    }
    // Ghosts go straight through walls.
    if (!p.alive || p.noclip) {
      this.goal = goal;
      return this.steer(goal.x - p.x, goal.y - p.y);
    }
    const newGoal = this.goal?.key !== goal.key;
    if (newGoal) {
      this.unreachable = false;
      this.stuckCount = 0;
      this.resetProgress(p, now);
    }
    const doorsKey = g.doors.size ? [...g.doors.keys()].sort().join(',') : '';
    if (doorsKey !== this.doorsKey) this.doorCells = g.doors.size ? navFor(g.map).doorBlock(g.closedDoorSegs()) : undefined;
    if (newGoal || !this.path || doorsKey !== this.doorsKey || now - this.plannedAt > REPATH_MS) {
      this.goal = goal;
      this.plan(g, p, now, doorsKey);
    }
    if (!this.path) return null;

    // Wedged: walk to the roomiest spot nearby, then carry on.
    if (this.unstick) {
      const u = this.unstick;
      if (now < u.until && Math.hypot(u.x - p.x, u.y - p.y) > 4) return toInput(u.x - p.x, u.y - p.y);
      this.unstick = null;
      this.path = null;
      this.plan(g, p, now, doorsKey);
      this.resetProgress(p, now);
      if (!this.path) return null;
    }
    if (Math.hypot(p.x - this.progressPos.x, p.y - this.progressPos.y) > 12) {
      this.resetProgress(p, now);
      this.stuckCount = 0;
    } else if (now - this.progressAt > STUCK_MS) {
      this.resetProgress(p, now);
      this.stuckCount++;
      if (this.stuckCount === 1) {
        // First try: a fresh path from where we actually are.
        this.plan(g, p, now, doorsKey);
      } else {
        const spot = navFor(g.map).roomiest(p.x, p.y);
        if (spot) this.unstick = { ...spot, until: now + 600 + this.rng() * 300 };
        this.held = [0, 0];
        if (spot) return toInput(spot.x - p.x, spot.y - p.y);
      }
      if (!this.path) return null;
    }

    const tgt = this.pursuit(g, p);
    const end = this.path[this.path.length - 1];
    // At the end of the path but not quite in range: step straight at the goal.
    const inp = tgt === end && Math.hypot(end.x - p.x, end.y - p.y) < 6 ? toInput(goal.x - p.x, goal.y - p.y) : this.steer(tgt.x - p.x, tgt.y - p.y);
    if (this.atShutDoor(g, p, inp)) {
      // Wait for it to open (decontamination) or for someone to open it, rather than shoving into it.
      this.resetProgress(p, now);
      this.held = [0, 0];
      return [0, 0];
    }
    return inp;
  }

  /** About to walk into a closed door. */
  private atShutDoor(g: Game, p: SPlayer, [dx, dy]: [number, number]): boolean {
    if (!this.doorCells?.size || (!dx && !dy)) return false;
    const nav = navFor(g.map);
    if (this.doorCells.has(nav.cellOf(p.x, p.y))) return false;
    const len = Math.hypot(dx, dy);
    return this.doorCells.has(nav.cellOf(p.x + (dx / len) * 16, p.y + (dy / len) * 16));
  }

  /** The point to aim at: as far along the path as we can walk to in a straight line. */
  private pursuit(g: Game, p: SPlayer): Vec {
    const path = this.path!;
    const last = path.length - 1;
    if (last === 0) return path[0];
    // Move our segment forward to whichever of the next few we're closest to.
    let bestSeg = this.seg;
    let bestD = Infinity;
    let bestT = 0;
    for (let k = this.seg; k < Math.min(last, this.seg + 8); k++) {
      const a = path[k];
      const b = path[k + 1];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const l2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
      const d = Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y);
      if (d < bestD - 1e-6) {
        bestD = d;
        bestSeg = k;
        bestT = t;
      }
    }
    this.seg = bestSeg;
    const nav = navFor(g.map);
    for (const ahead of LOOKAHEAD) {
      const pt = this.along(bestSeg, bestT, ahead);
      if (nav.clearLine(p.x, p.y, pt.x, pt.y, this.blocked)) return pt;
    }
    // Nothing clear in a straight line (tight spot): follow the path itself.
    return path[Math.min(last, bestSeg + 1)];
  }

  /** The point `ahead` units further down the path from segment `seg` at fraction `t`. */
  private along(seg: number, t: number, ahead: number): Vec {
    const path = this.path!;
    let a = path[seg];
    let b = path[seg + 1];
    let x = a.x + (b.x - a.x) * t;
    let y = a.y + (b.y - a.y) * t;
    let left = ahead;
    for (let k = seg; k < path.length - 1; k++) {
      b = path[k + 1];
      const l = Math.hypot(b.x - x, b.y - y);
      if (l >= left) return { x: x + ((b.x - x) / l) * left, y: y + ((b.y - y) / l) * left };
      left -= l;
      x = b.x;
      y = b.y;
      a = b;
    }
    return path[path.length - 1];
  }

  /** 8-way keys toward (vx, vy), keeping the current keys while they're still close enough. */
  private steer(vx: number, vy: number): [number, number] {
    const [hx, hy] = this.held;
    if ((hx || hy) && Math.hypot(vx, vy) > 15 && angleBetween(hx, hy, vx, vy) < HOLD_ANGLE) return this.held;
    this.held = toInput(vx, vy);
    return this.held;
  }

  private resetProgress(p: SPlayer, now: number): void {
    this.progressAt = now;
    this.progressPos = { x: p.x, y: p.y };
  }

  private plan(g: Game, p: SPlayer, now: number, doorsKey: string): void {
    const nav = navFor(g.map);
    this.plannedAt = now;
    this.doorsKey = doorsKey;
    this.seg = 0;
    const goal = this.goal!;
    const blocked = g.doors.size ? nav.doorBlock(g.closedDoorSegs()) : undefined;
    this.blocked = blocked;
    this.doorCells = blocked;
    this.path = nav.findPath(p.x, p.y, goal, blocked);
    // No way around a shut door: walk up to it and wait (or open it, on Polus).
    if (!this.path && blocked) {
      this.path = nav.findPath(p.x, p.y, goal);
      this.blocked = undefined;
    }
    if (this.path) this.path.unshift({ x: p.x, y: p.y });
    this.unreachable = !this.path;
  }
}
