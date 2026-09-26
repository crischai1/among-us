import type { CompiledMap } from '../../shared/map';
import { CELL } from '../../shared/map/compile';
import type { FloorKind } from '../../shared/map/types';

/**
 * Every floor's grid is anchored to world coordinates and uses GRID (or an even
 * fraction of it), so tile lines continue straight across doorways between
 * rooms and halls.
 */
const GRID = 40;
const FLOOR: Record<FloorKind, { fill: string; line: string; step: number }> = {
  metal: { fill: '#7c8692', line: '#6d7682', step: GRID },
  tile: { fill: '#9aa6b3', line: '#8793a0', step: GRID },
  dark: { fill: '#4f5867', line: '#454d5b', step: GRID },
  white: { fill: '#c2ccd6', line: '#aeb9c4', step: GRID },
  grate: { fill: '#626b78', line: '#535b67', step: GRID / 2 },
  carpet: { fill: '#546583', line: '#4b5b77', step: GRID },
};
/** Hall floors are a touch lighter than the matching room floor. */
const HALL_TINT: Partial<Record<FloorKind, { fill: string; line: string }>> = {
  metal: { fill: '#838d99', line: '#747e8a' },
};

/** First grid line strictly inside (lo, ...) on the world-aligned grid. */
const firstLine = (lo: number, step: number) => Math.floor(lo / step) * step + step;
const WALL_FACE = '#4a5669';
const WALL_TOP = '#252c38';

interface MapCache {
  floors: { fill: string; line: string; path: Path2D; lines: Path2D }[];
  walls: Path2D;
  faces: Path2D;
  faceTrim: Path2D;
  edges: Path2D;
}

const caches = new WeakMap<CompiledMap, MapCache>();

function build(map: CompiledMap): MapCache {
  const floors: MapCache['floors'] = [];
  const addFloor = (rects: { x: number; y: number; w: number; h: number }[], style: { fill: string; line: string; step: number }) => {
    const path = new Path2D();
    const lines = new Path2D();
    for (const r of rects) {
      path.rect(r.x, r.y, r.w, r.h);
      for (let x = firstLine(r.x, style.step); x < r.x + r.w; x += style.step) {
        lines.moveTo(x, r.y);
        lines.lineTo(x, r.y + r.h);
      }
      for (let y = firstLine(r.y, style.step); y < r.y + r.h; y += style.step) {
        lines.moveTo(r.x, y);
        lines.lineTo(r.x + r.w, y);
      }
    }
    floors.push({ fill: style.fill, line: style.line, path, lines });
  };
  const hall = map.def.theme.hall;
  addFloor(map.def.halls, { ...FLOOR[hall], ...HALL_TINT[hall] });
  for (const room of map.def.rooms) addFloor(room.rects, FLOOR[room.floor]);

  const { cols, rows, walkable } = map;
  const walk = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && walkable[r * cols + c] === 1;
  /** Number of void cells (up to max) walking from (c, r) in direction (dc, dr). */
  const voidDepth = (c: number, r: number, dc: number, dr: number, max: number) => {
    let n = 0;
    while (n < max && !walk(c + dc * (n + 1), r + dr * (n + 1))) n++;
    return n;
  };
  const walls = new Path2D();
  const faces = new Path2D();
  const faceTrim = new Path2D();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!walk(c, r)) continue;
      const x = c * CELL;
      const y = r * CELL;
      if (!walk(c, r - 1)) {
        const total = voidDepth(c, r, 0, -1, 5) * CELL;
        const trim = Math.min(8, total * 0.3);
        faces.rect(x, y - total + trim, CELL, total - trim);
        faceTrim.rect(x, y - total, CELL, trim);
      }
      if (!walk(c, r + 1)) walls.rect(x, y + CELL, CELL, Math.min(12, voidDepth(c, r, 0, 1, 2) * CELL));
      if (!walk(c - 1, r)) walls.rect(x - Math.min(12, voidDepth(c, r, -1, 0, 2) * CELL), y, Math.min(12, voidDepth(c, r, -1, 0, 2) * CELL), CELL);
      if (!walk(c + 1, r)) walls.rect(x + CELL, y, Math.min(12, voidDepth(c, r, 1, 0, 2) * CELL), CELL);
    }
  }
  const edges = new Path2D();
  for (const w of map.walls) {
    edges.moveTo(w.x1, w.y1);
    edges.lineTo(w.x2, w.y2);
  }
  return { floors, walls, faces, faceTrim, edges };
}

function cache(map: CompiledMap): MapCache {
  let c = caches.get(map);
  if (!c) {
    c = build(map);
    caches.set(map, c);
  }
  return c;
}

/** Floors, drawn under everything. Caller sets the world transform. */
export function drawFloors(ctx: CanvasRenderingContext2D, map: CompiledMap): void {
  const c = cache(map);
  ctx.lineWidth = 1.5;
  for (const f of c.floors) {
    ctx.fillStyle = f.fill;
    ctx.fill(f.path);
    ctx.strokeStyle = f.line;
    ctx.stroke(f.lines);
  }
}

/** Walls with a front face on top walls, drawn above the fog so the ship stays readable. */
export function drawWalls(ctx: CanvasRenderingContext2D, map: CompiledMap): void {
  const c = cache(map);
  ctx.fillStyle = WALL_TOP;
  ctx.fill(c.walls);
  ctx.fillStyle = WALL_FACE;
  ctx.fill(c.faces);
  ctx.fillStyle = WALL_TOP;
  ctx.fill(c.faceTrim);
  ctx.strokeStyle = '#11151c';
  ctx.lineWidth = 3;
  ctx.stroke(c.edges);
}

const wallPaths = new WeakMap<CompiledMap, Path2D>();

/** Union of all wall shapes, for clipping. */
export function wallsPath(map: CompiledMap): Path2D {
  let p = wallPaths.get(map);
  if (!p) {
    const c = cache(map);
    p = new Path2D();
    p.addPath(c.walls);
    p.addPath(c.faces);
    p.addPath(c.faceTrim);
    wallPaths.set(map, p);
  }
  return p;
}
