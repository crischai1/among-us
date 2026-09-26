import { circleSegs, pointInPolygon, rectSegs, type Rect, type Seg, type Vec } from '../geom';
import { SegGrid } from './segGrid';
import type { SabotageKind } from '../types';
import type { CameraDef, DoorDef, MapDef, Poly, RoomDef, SabotageDef, SpawnRing, StationDef, VentDef, WallEdge } from './types';

export const CELL = 10;

export interface CompiledMap {
  def: MapDef;
  cols: number;
  rows: number;
  /** 1 where the floor is walkable. */
  walkable: Uint8Array;
  /** 1 where the cell's centre lies in a polygon piece (walls there are drawn from the polygon's edges). */
  polyCells: Uint8Array;
  /** Room index per cell, -1 for halls/void. */
  roomIdx: Int16Array;
  walls: WallEdge[];
  moveSegs: Seg[];
  visionSegs: Seg[];
  moveGrid: SegGrid;
  visionGrid: SegGrid;
  doors: Map<string, DoorDef>;
  stations: Map<string, StationDef>;
  vents: Map<string, VentDef>;
  cameras: CameraDef[];
  rooms: Map<string, RoomDef>;
  sabotages: Map<SabotageKind, SabotageDef>;
  roomAt(x: number, y: number): string | null;
  isWalkable(x: number, y: number): boolean;
}

/** One walkable piece of the map: a rectangle or a polygon. */
export type Shape = { rect: Rect; poly?: undefined } | { poly: Poly; rect?: undefined };

/** Every walkable piece: halls first, then rooms, with the room index (-1 for halls). */
export function mapShapes(def: MapDef): { shape: Shape; room: number }[] {
  const out: { shape: Shape; room: number }[] = [];
  for (const r of def.halls) out.push({ shape: { rect: r }, room: -1 });
  for (const p of def.hallPolys ?? []) out.push({ shape: { poly: p }, room: -1 });
  def.rooms.forEach((room, i) => {
    for (const r of room.rects) out.push({ shape: { rect: r }, room: i });
    for (const p of room.polys ?? []) out.push({ shape: { poly: p }, room: i });
  });
  return out;
}

const insideShape = (s: Shape, x: number, y: number): boolean =>
  s.rect ? x > s.rect.x && x < s.rect.x + s.rect.w && y > s.rect.y && y < s.rect.y + s.rect.h : pointInPolygon(x, y, s.poly);

function shapeEdges(s: Shape): [Vec, Vec][] {
  if (s.rect) return rectSegs(s.rect).map((e) => [{ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }]);
  return s.poly.map((p, i) => [p, s.poly[(i + 1) % s.poly.length]]);
}

const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
/** Undo floating-point drift so split points land exactly on whole coordinates. */
const snap = (v: number) => (Math.abs(v - Math.round(v)) < 1e-6 ? Math.round(v) : v);

/**
 * Exact wall segments around the union of all pieces: each piece's edges,
 * minus the stretches where another piece continues on the other side.
 * Collinear neighbours are merged so long walls are single segments.
 */
function exactWalls(shapes: Shape[]): WallEdge[] {
  const all = shapes.map((s, si) => shapeEdges(s).map(([a, b]) => ({ a, b, si })));
  const edges = all.flat();
  const pieces: WallEdge[] = [];
  for (const { a, b, si } of edges) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    const own = shapes[si];
    let nx = -dy / len;
    let ny = dx / len;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (!insideShape(own, mx + nx * 0.5, my + ny * 0.5)) {
      nx = -nx;
      ny = -ny;
    }
    // Split wherever another piece's edge touches this one.
    const ts = [0, 1];
    for (const f of edges) {
      if (f.si === si) continue;
      const gx = f.b.x - f.a.x;
      const gy = f.b.y - f.a.y;
      const wx = f.a.x - a.x;
      const wy = f.a.y - a.y;
      const denom = cross(dx, dy, gx, gy);
      if (Math.abs(denom) > 1e-9) {
        const t = cross(wx, wy, gx, gy) / denom;
        const u = cross(wx, wy, dx, dy) / denom;
        if (t > 0 && t < 1 && u >= -1e-9 && u <= 1 + 1e-9) ts.push(t);
      } else if (Math.abs(cross(wx, wy, dx, dy)) < 1e-6 * len) {
        for (const p of [f.a, f.b]) {
          const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len);
          if (t > 0 && t < 1) ts.push(t);
        }
      }
    }
    ts.sort((p, q) => p - q);
    let run: WallEdge | null = null;
    for (let i = 0; i + 1 < ts.length; i++) {
      const t0 = ts[i];
      const t1 = ts[i + 1];
      if (t1 - t0 < 1e-9) continue;
      const tm = (t0 + t1) / 2;
      const qx = a.x + dx * tm - nx * 0.5;
      const qy = a.y + dy * tm - ny * 0.5;
      const wall = !shapes.some((s) => insideShape(s, qx, qy));
      if (wall && run) {
        run.x2 = snap(a.x + dx * t1);
        run.y2 = snap(a.y + dy * t1);
      } else if (wall) {
        run = {
          x1: snap(a.x + dx * t0), y1: snap(a.y + dy * t0), x2: snap(a.x + dx * t1), y2: snap(a.y + dy * t1),
          nx, ny, ...(own.poly ? { poly: true } : {}),
        };
      } else if (run) {
        pieces.push(run);
        run = null;
      }
    }
    if (run) pieces.push(run);
  }
  return mergeCollinear(pieces);
}

/** Join axis-aligned wall pieces that continue each other (same line, same facing). */
function mergeCollinear(pieces: WallEdge[]): WallEdge[] {
  const out: WallEdge[] = [];
  const groups = new Map<string, WallEdge[]>();
  for (const w of pieces) {
    const horiz = Math.abs(w.y1 - w.y2) < 1e-9;
    const vert = Math.abs(w.x1 - w.x2) < 1e-9;
    if (!horiz && !vert) {
      out.push(w);
      continue;
    }
    const key = horiz ? `h${w.y1}:${Math.sign(w.ny)}:${w.poly ? 1 : 0}` : `v${w.x1}:${Math.sign(w.nx)}:${w.poly ? 1 : 0}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push(horiz ? { ...w, x1: Math.min(w.x1, w.x2), x2: Math.max(w.x1, w.x2) } : { ...w, y1: Math.min(w.y1, w.y2), y2: Math.max(w.y1, w.y2) });
  }
  for (const [key, g] of groups) {
    const horiz = key[0] === 'h';
    const lo = (w: WallEdge) => (horiz ? w.x1 : w.y1);
    const hi = (w: WallEdge) => (horiz ? w.x2 : w.y2);
    g.sort((p, q) => lo(p) - lo(q));
    let cur = g[0];
    for (let i = 1; i < g.length; i++) {
      const w = g[i];
      if (lo(w) <= hi(cur) + 1e-9) {
        if (horiz) cur.x2 = Math.max(cur.x2, w.x2);
        else cur.y2 = Math.max(cur.y2, w.y2);
      } else {
        out.push(cur);
        cur = w;
      }
    }
    out.push(cur);
  }
  return out;
}

export function compileMap(def: MapDef): CompiledMap {
  const cols = Math.ceil(def.size.w / CELL);
  const rows = Math.ceil(def.size.h / CELL);
  const walkable = new Uint8Array(cols * rows);
  const polyCells = new Uint8Array(cols * rows);
  const roomIdx = new Int16Array(cols * rows).fill(-1);

  const markRect = (r: Rect, room: number) => {
    const c0 = Math.round(r.x / CELL);
    const c1 = Math.round((r.x + r.w) / CELL);
    const r0 = Math.round(r.y / CELL);
    const r1 = Math.round((r.y + r.h) / CELL);
    for (let y = r0; y < r1; y++) {
      for (let x = c0; x < c1; x++) {
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        walkable[y * cols + x] = 1;
        if (room >= 0) roomIdx[y * cols + x] = room;
      }
    }
  };
  const markPoly = (p: Poly, room: number) => {
    const xs = p.map((v) => v.x);
    const ys = p.map((v) => v.y);
    const c0 = Math.max(0, Math.floor(Math.min(...xs) / CELL));
    const c1 = Math.min(cols - 1, Math.ceil(Math.max(...xs) / CELL));
    const r0 = Math.max(0, Math.floor(Math.min(...ys) / CELL));
    const r1 = Math.min(rows - 1, Math.ceil(Math.max(...ys) / CELL));
    for (let y = r0; y <= r1; y++) {
      for (let x = c0; x <= c1; x++) {
        if (!pointInPolygon(x * CELL + CELL / 2, y * CELL + CELL / 2, p)) continue;
        walkable[y * cols + x] = 1;
        polyCells[y * cols + x] = 1;
        if (room >= 0) roomIdx[y * cols + x] = room;
      }
    }
  };
  const pieces = mapShapes(def);
  for (const { shape, room } of pieces) {
    if (shape.rect) markRect(shape.rect, room);
    else markPoly(shape.poly, room);
  }

  const walk = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && walkable[r * cols + c] === 1;

  const walls = exactWalls(pieces.map((p) => p.shape));

  const moveSegs: Seg[] = [...walls];
  const visionSegs: Seg[] = [...walls];
  for (const o of def.obstacles) {
    const segs = o.rect ? rectSegs(o.rect) : o.circle ? circleSegs(o.circle.x, o.circle.y, o.circle.r) : [];
    moveSegs.push(...segs);
    if (o.blocksVision) visionSegs.push(...segs);
  }

  const roomAt = (x: number, y: number): string | null => {
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return null;
    const i = roomIdx[r * cols + c];
    return i >= 0 ? def.rooms[i].id : null;
  };

  return {
    def,
    cols,
    rows,
    walkable,
    polyCells,
    roomIdx,
    walls,
    moveSegs,
    visionSegs,
    moveGrid: new SegGrid(moveSegs, def.size.w, def.size.h),
    visionGrid: new SegGrid(visionSegs, def.size.w, def.size.h),
    doors: new Map(def.doors.map((d) => [d.id, d])),
    stations: new Map(def.stations.map((s) => [s.id, s])),
    vents: new Map(def.vents.map((v) => [v.id, v])),
    cameras: def.cameras,
    rooms: new Map(def.rooms.map((r) => [r.id, r])),
    sabotages: new Map(def.sabotages.map((s) => [s.kind, s])),
    roomAt,
    isWalkable: (x, y) => walk(Math.floor(x / CELL), Math.floor(y / CELL)),
  };
}

/** Evenly spread spawn points on a spawn ring (the after-meeting ring unless given). */
export function spawnPoint(def: MapDef, i: number, n: number, ring: SpawnRing = def.spawn): { x: number; y: number } {
  const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
  return { x: Math.round(ring.x + Math.cos(a) * ring.r), y: Math.round(ring.y + Math.sin(a) * ring.r) };
}

/** Label point for a room: its explicit label, else the centre of its first rect. */
export function roomLabel(room: RoomDef): Vec {
  if (room.label) return room.label;
  const r = room.rects[0];
  if (r) return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const p = room.polys?.[0] ?? [];
  return { x: p.reduce((s, v) => s + v.x, 0) / p.length, y: p.reduce((s, v) => s + v.y, 0) / p.length };
}
