import { circleSegs, rectSegs, type Seg } from '../geom';
import { SegGrid } from './segGrid';
import type { CameraDef, DoorDef, MapDef, RoomDef, StationDef, VentDef, WallEdge } from './types';

export const CELL = 10;

export interface CompiledMap {
  def: MapDef;
  cols: number;
  rows: number;
  /** 1 where the floor is walkable. */
  walkable: Uint8Array;
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
  roomAt(x: number, y: number): string | null;
  isWalkable(x: number, y: number): boolean;
}

export function compileMap(def: MapDef): CompiledMap {
  const cols = Math.ceil(def.size.w / CELL);
  const rows = Math.ceil(def.size.h / CELL);
  const walkable = new Uint8Array(cols * rows);
  const roomIdx = new Int16Array(cols * rows).fill(-1);

  const mark = (r: { x: number; y: number; w: number; h: number }, room: number) => {
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
  def.halls.forEach((h) => mark(h, -1));
  def.rooms.forEach((room, i) => room.rects.forEach((r) => mark(r, i)));

  const walk = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && walkable[r * cols + c] === 1;

  // Boundary edges between walkable and void cells, merged into long runs.
  const walls: WallEdge[] = [];
  for (let r = 0; r <= rows; r++) {
    let run: WallEdge | null = null;
    for (let c = 0; c <= cols; c++) {
      const above = walk(c, r - 1);
      const below = walk(c, r);
      const ny = above === below || c === cols ? 0 : below ? 1 : -1;
      if (run && run.ny === ny) {
        run.x2 = c * CELL + CELL;
        continue;
      }
      if (run) walls.push(run);
      run = ny ? { x1: c * CELL, y1: r * CELL, x2: c * CELL + CELL, y2: r * CELL, nx: 0, ny } : null;
    }
  }
  for (let c = 0; c <= cols; c++) {
    let run: WallEdge | null = null;
    for (let r = 0; r <= rows; r++) {
      const left = walk(c - 1, r);
      const right = walk(c, r);
      const nx = left === right || r === rows ? 0 : right ? 1 : -1;
      if (run && run.nx === nx) {
        run.y2 = r * CELL + CELL;
        continue;
      }
      if (run) walls.push(run);
      run = nx ? { x1: c * CELL, y1: r * CELL, x2: c * CELL, y2: r * CELL + CELL, nx, ny: 0 } : null;
    }
  }

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
    roomAt,
    isWalkable: (x, y) => walk(Math.floor(x / CELL), Math.floor(y / CELL)),
  };
}

/** Evenly spread spawn points on the spawn ring. */
export function spawnPoint(def: MapDef, i: number, n: number): { x: number; y: number } {
  const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
  return { x: Math.round(def.spawn.x + Math.cos(a) * def.spawn.r), y: Math.round(def.spawn.y + Math.sin(a) * def.spawn.r) };
}
