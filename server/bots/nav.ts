import { PLAYER_RADIUS } from '../../shared/constants';
import { pointInRect, segDist, type Seg, type Vec } from '../../shared/geom';
import { CELL, type CompiledMap } from '../../shared/map/compile';

/** Clearance is measured up to this far from a cell centre. */
const MAX_CLEAR = 48;
/** A player standing at a free cell's centre has this much room to spare. */
const MIN_CLEAR = PLAYER_RADIUS + 2;
/** Paths prefer cells at least this far from walls and furniture. */
const COMFORT = 30;
/** Straight-line shortcuts need this much room at every sampled cell (covers being off-centre in a cell). */
export const LINE_CLEAR = PLAYER_RADIUS + CELL * 0.75;

/** Somewhere a bot wants to be: within `range` of whatever `dist` measures. */
export interface Goal {
  /** Same key = same goal, so the current path is kept. */
  key: string;
  x: number;
  y: number;
  range: number;
  dist: (x: number, y: number) => number;
}

export const pointGoal = (key: string, x: number, y: number, range: number): Goal => ({
  key, x, y, range, dist: (px, py) => Math.hypot(px - x, py - y),
});

const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** Min-heap of cell indices keyed by f-score. */
class Heap {
  private items: number[] = [];
  constructor(private f: Float64Array) {}
  get size() {
    return this.items.length;
  }
  push(i: number): void {
    const a = this.items;
    a.push(i);
    let k = a.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (this.f[a[p]] <= this.f[a[k]]) break;
      [a[p], a[k]] = [a[k], a[p]];
      k = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1;
        const r = l + 1;
        let m = k;
        if (l < a.length && this.f[a[l]] < this.f[a[m]]) m = l;
        if (r < a.length && this.f[a[r]] < this.f[a[m]]) m = r;
        if (m === k) break;
        [a[m], a[k]] = [a[k], a[m]];
        k = m;
      }
    }
    return top;
  }
}

/**
 * Walkability grid for bots. Each cell knows how far its centre is from the
 * nearest wall or piece of furniture; a cell is free when a player fits there.
 * A* over it prefers roomy cells, so bots walk down the middle of halls and
 * give tables a wide berth instead of grinding along their edges.
 */
export class Nav {
  readonly cols: number;
  readonly rows: number;
  readonly free: Uint8Array;
  readonly clear: Float32Array;
  private cost: Float32Array;
  private g: Float64Array;
  private f: Float64Array;
  private from: Int32Array;
  private seen: Uint32Array;
  private closed: Uint32Array;
  private stamp = 0;

  constructor(readonly map: CompiledMap) {
    this.cols = map.cols;
    this.rows = map.rows;
    const n = this.cols * this.rows;
    this.free = new Uint8Array(n);
    this.clear = new Float32Array(n);
    this.cost = new Float32Array(n);
    const segs: Seg[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        if (!map.walkable[i]) continue;
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2;
        // The middle of a table is far from the table's edges, but you can't stand there.
        if (map.def.obstacles.some((o) => (o.rect ? pointInRect(x, y, o.rect) : o.circle ? Math.hypot(x - o.circle.x, y - o.circle.y) < o.circle.r : false))) continue;
        segs.length = 0;
        map.moveGrid.query(x - MAX_CLEAR, y - MAX_CLEAR, x + MAX_CLEAR, y + MAX_CLEAR, segs);
        let d = MAX_CLEAR;
        for (const s of segs) d = Math.min(d, segDist(x, y, s));
        this.clear[i] = d;
        if (d >= MIN_CLEAR) this.free[i] = 1;
        this.cost[i] = 1 + Math.max(0, COMFORT - d) / 5;
      }
    }
    this.g = new Float64Array(n);
    this.f = new Float64Array(n);
    this.from = new Int32Array(n);
    this.seen = new Uint32Array(n);
    this.closed = new Uint32Array(n);
  }

  cellOf(x: number, y: number): number {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor(x / CELL)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor(y / CELL)));
    return r * this.cols + c;
  }

  center(i: number): Vec {
    return { x: (i % this.cols) * CELL + CELL / 2, y: Math.floor(i / this.cols) * CELL + CELL / 2 };
  }

  /** Cells next to closed doors, which paths must avoid. */
  doorBlock(doors: readonly Seg[]): Set<number> {
    const out = new Set<number>();
    const pad = PLAYER_RADIUS + CELL;
    for (const s of doors) {
      const c0 = Math.max(0, Math.floor((Math.min(s.x1, s.x2) - pad) / CELL));
      const c1 = Math.min(this.cols - 1, Math.floor((Math.max(s.x1, s.x2) + pad) / CELL));
      const r0 = Math.max(0, Math.floor((Math.min(s.y1, s.y2) - pad) / CELL));
      const r1 = Math.min(this.rows - 1, Math.floor((Math.max(s.y1, s.y2) + pad) / CELL));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (segDist(c * CELL + CELL / 2, r * CELL + CELL / 2, s) < PLAYER_RADIUS + 4) out.add(r * this.cols + c);
        }
      }
    }
    return out;
  }

  private ok(i: number, blocked?: Set<number>): boolean {
    return this.free[i] === 1 && !blocked?.has(i);
  }

  /** Nearest free cell to a point (spiral search), or -1. */
  nearestFree(x: number, y: number, blocked?: Set<number>, maxR = 8): number {
    const c0 = Math.floor(x / CELL);
    const r0 = Math.floor(y / CELL);
    let best = -1;
    let bestD = Infinity;
    for (let rad = 0; rad <= maxR && best < 0; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
          const c = c0 + dc;
          const r = r0 + dr;
          if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
          const i = r * this.cols + c;
          if (!this.ok(i, blocked)) continue;
          const p = this.center(i);
          const d = Math.hypot(p.x - x, p.y - y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    return best;
  }

  /** True if a player can walk the straight line a-b: every cell it crosses has at least `need` clearance. */
  clearLine(ax: number, ay: number, bx: number, by: number, blocked?: Set<number>, need = LINE_CLEAR): boolean {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(len / (CELL / 2)));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const i = this.cellOf(ax + (bx - ax) * t, ay + (by - ay) * t);
      if (!this.ok(i, blocked) || this.clear[i] < need) return false;
    }
    return true;
  }

  /** The roomiest free cell within `radius` cells of a point, to back away from whatever we're wedged against. */
  roomiest(x: number, y: number, radius = 4): Vec | null {
    const c0 = Math.floor(x / CELL);
    const r0 = Math.floor(y / CELL);
    let best = -1;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
        const i = r * this.cols + c;
        if (this.free[i] && (best < 0 || this.clear[i] > this.clear[best])) best = i;
      }
    }
    return best < 0 ? null : this.center(best);
  }

  /**
   * A* from (sx, sy) to any cell whose centre is within the goal's range (less
   * a margin, so arriving at the centre is safely in range). Returns the cell
   * centres to walk through, or null if unreachable.
   */
  findPath(sx: number, sy: number, goal: Goal, blocked?: Set<number>): Vec[] | null {
    const start = this.nearestFree(sx, sy, blocked);
    if (start < 0) return null;
    const margin = Math.min(goal.range * 0.5, CELL);
    const isGoal = (i: number) => {
      const p = this.center(i);
      return goal.dist(p.x, p.y) <= goal.range - margin;
    };
    const h = (i: number) => {
      const p = this.center(i);
      return Math.max(0, goal.dist(p.x, p.y) - goal.range) / CELL;
    };
    const id = ++this.stamp;
    if (id >= 0xfffffff0) {
      this.seen.fill(0);
      this.closed.fill(0);
      this.stamp = 1;
    }
    const heap = new Heap(this.f);
    this.g[start] = 0;
    this.f[start] = h(start);
    this.from[start] = -1;
    this.seen[start] = this.stamp;
    heap.push(start);
    let end = -1;
    while (heap.size) {
      const cur = heap.pop();
      if (this.closed[cur] === this.stamp) continue;
      this.closed[cur] = this.stamp;
      if (isGoal(cur)) {
        end = cur;
        break;
      }
      const cc = cur % this.cols;
      const cr = Math.floor(cur / this.cols);
      for (const [dc, dr, cost] of DIRS) {
        const c = cc + dc;
        const r = cr + dr;
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
        const nb = r * this.cols + c;
        if (!this.ok(nb, blocked) || this.closed[nb] === this.stamp) continue;
        // No cutting corners.
        if (dc && dr && (!this.ok(cr * this.cols + c, blocked) || !this.ok(r * this.cols + cc, blocked))) continue;
        const g = this.g[cur] + cost * this.cost[nb];
        if (this.seen[nb] === this.stamp && g >= this.g[nb]) continue;
        this.seen[nb] = this.stamp;
        this.g[nb] = g;
        this.f[nb] = g + h(nb);
        this.from[nb] = cur;
        heap.push(nb);
      }
    }
    if (end < 0) return null;
    const cells: number[] = [];
    for (let i = end; i >= 0; i = this.from[i]) cells.push(i);
    cells.reverse();
    return cells.map((i) => this.center(i));
  }
}

const navs = new WeakMap<CompiledMap, Nav>();

export function navFor(map: CompiledMap): Nav {
  let n = navs.get(map);
  if (!n) navs.set(map, (n = new Nav(map)));
  return n;
}
