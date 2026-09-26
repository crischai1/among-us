import type { CompiledMap } from '../../shared/map';
import { CELL } from '../../shared/map/compile';
import type { Rect } from '../../shared/geom';
import type { FloorKind, Poly } from '../../shared/map/types';

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
  // MIRA HQ
  mira: { fill: '#b7c1ce', line: '#a6b1bf', step: GRID },
  pad: { fill: '#5e6674', line: '#515866', step: GRID * 2 },
  decon: { fill: '#dce5ee', line: '#c1cfdc', step: GRID / 2 },
  greenhouse: { fill: '#86b08c', line: '#739d7a', step: GRID },
  balcony: { fill: '#98a3b1', line: '#87929f', step: GRID / 2 },
  // Polus
  snow: { fill: '#e6ecf4', line: '#dbe3ee', step: GRID * 2 },
};
/** Hall floors are a touch lighter than the matching room floor. */
const HALL_TINT: Partial<Record<FloorKind, { fill: string; line: string }>> = {
  metal: { fill: '#838d99', line: '#747e8a' },
};

/** First grid line strictly inside (lo, ...) on the world-aligned grid. */
const firstLine = (lo: number, step: number) => Math.floor(lo / step) * step + step;
const WALL_FACE = '#4a5669';
const WALL_TOP = '#252c38';
/** Height of the front face drawn above walls that have floor below them. */
const FACE = 50;
const TRIM = 8;
const SIDE = 12;

interface Floor {
  fill: string;
  line: string;
  path: Path2D;
  lines: Path2D;
  /** Polygon pieces: grid lines are clipped to the floor. */
  clip: boolean;
}

interface MapCache {
  floors: Floor[];
  walls: Path2D;
  faces: Path2D;
  faceTrim: Path2D;
  stripes: Path2D;
  edges: Path2D;
  /** Everything outside the floor, for maps with polygon pieces (null otherwise). */
  outside: Path2D | null;
}

const caches = new WeakMap<CompiledMap, MapCache>();

function polyPath(path: Path2D, p: Poly): void {
  p.forEach((v, i) => (i ? path.lineTo(v.x, v.y) : path.moveTo(v.x, v.y)));
  path.closePath();
}

function gridLines(lines: Path2D, r: Rect, step: number): void {
  for (let x = firstLine(r.x, step); x < r.x + r.w; x += step) {
    lines.moveTo(x, r.y);
    lines.lineTo(x, r.y + r.h);
  }
  for (let y = firstLine(r.y, step); y < r.y + r.h; y += step) {
    lines.moveTo(r.x, y);
    lines.lineTo(r.x + r.w, y);
  }
}

function bounds(p: Poly): Rect {
  const xs = p.map((v) => v.x);
  const ys = p.map((v) => v.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function build(map: CompiledMap): MapCache {
  const { def } = map;
  const floors: Floor[] = [];
  const addFloor = (rects: Rect[], polys: Poly[], style: { fill: string; line: string; step: number }) => {
    if (rects.length) {
      const path = new Path2D();
      const lines = new Path2D();
      for (const r of rects) {
        path.rect(r.x, r.y, r.w, r.h);
        gridLines(lines, r, style.step);
      }
      floors.push({ fill: style.fill, line: style.line, path, lines, clip: false });
    }
    if (polys.length) {
      const path = new Path2D();
      const lines = new Path2D();
      for (const p of polys) {
        polyPath(path, p);
        gridLines(lines, bounds(p), style.step);
      }
      floors.push({ fill: style.fill, line: style.line, path, lines, clip: true });
    }
  };
  const hall = def.theme.hall;
  addFloor(def.halls, def.hallPolys ?? [], { ...FLOOR[hall], ...HALL_TINT[hall] });
  for (const room of def.rooms) addFloor(room.rects, room.polys ?? [], FLOOR[room.floor]);

  const { cols, rows, walkable, polyCells } = map;
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
  const stripes = new Path2D();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Polygon pieces get their walls from their exact edges below.
      if (!walk(c, r) || polyCells[r * cols + c]) continue;
      const x = c * CELL;
      const y = r * CELL;
      if (!walk(c, r - 1)) {
        const total = voidDepth(c, r, 0, -1, 5) * CELL;
        const trim = Math.min(TRIM, total * 0.3);
        faces.rect(x, y - total + trim, CELL, total - trim);
        faceTrim.rect(x, y - total, CELL, trim);
        if (total >= 30) stripes.rect(x, y - total * 0.55, CELL, 5);
      }
      if (!walk(c, r + 1)) walls.rect(x, y + CELL, CELL, Math.min(SIDE, voidDepth(c, r, 0, 1, 2) * CELL));
      if (!walk(c - 1, r)) walls.rect(x - Math.min(SIDE, voidDepth(c, r, -1, 0, 2) * CELL), y, Math.min(SIDE, voidDepth(c, r, -1, 0, 2) * CELL), CELL);
      if (!walk(c + 1, r)) walls.rect(x + CELL, y, Math.min(SIDE, voidDepth(c, r, 1, 0, 2) * CELL), CELL);
    }
  }
  // Polygon walls: a face above walls with floor below them, a band elsewhere.
  const quad = (path: Path2D, pts: number[]) => {
    path.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
    path.closePath();
  };
  for (const w of map.walls) {
    if (!w.poly) continue;
    const { x1, y1, x2, y2, nx, ny } = w;
    if (ny > 0.2) {
      quad(faces, [x1, y1, x2, y2, x2, y2 - FACE + TRIM, x1, y1 - FACE + TRIM]);
      quad(faceTrim, [x1, y1 - FACE + TRIM, x2, y2 - FACE + TRIM, x2, y2 - FACE, x1, y1 - FACE]);
      const sy = FACE * 0.55;
      quad(stripes, [x1, y1 - sy, x2, y2 - sy, x2, y2 - sy + 5, x1, y1 - sy + 5]);
    } else {
      quad(walls, [x1, y1, x2, y2, x2 - nx * SIDE, y2 - ny * SIDE, x1 - nx * SIDE, y1 - ny * SIDE]);
    }
  }
  const edges = new Path2D();
  for (const w of map.walls) {
    edges.moveTo(w.x1, w.y1);
    edges.lineTo(w.x2, w.y2);
  }

  // Walls are drawn into the space between floors; with polygon pieces some of
  // those shapes poke onto the floor, so clip them to the outside.
  let outside: Path2D | null = null;
  if (def.hallPolys?.length || def.rooms.some((r) => r.polys?.length)) {
    outside = new Path2D();
    outside.rect(-1000, -1000, def.size.w + 2000, def.size.h + 2000);
    for (const r of def.halls) outside.rect(r.x, r.y, r.w, r.h);
    for (const p of def.hallPolys ?? []) polyPath(outside, p);
    for (const room of def.rooms) {
      for (const r of room.rects) outside.rect(r.x, r.y, r.w, r.h);
      for (const p of room.polys ?? []) polyPath(outside, p);
    }
  }
  return { floors, walls, faces, faceTrim, stripes, edges, outside };
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
    if (f.clip) {
      ctx.save();
      ctx.clip(f.path);
      ctx.stroke(f.lines);
      ctx.restore();
    } else {
      ctx.stroke(f.lines);
    }
  }
}

/** Walls with a front face on top walls, drawn above the fog so the ship stays readable. */
export function drawWalls(ctx: CanvasRenderingContext2D, map: CompiledMap): void {
  const c = cache(map);
  const th = map.def.theme;
  ctx.save();
  if (c.outside) ctx.clip(c.outside, 'evenodd');
  ctx.fillStyle = th.wallTop ?? WALL_TOP;
  ctx.fill(c.walls);
  ctx.fillStyle = th.wallFace ?? WALL_FACE;
  ctx.fill(c.faces);
  if (th.stripe) {
    ctx.fillStyle = th.stripe;
    ctx.fill(c.stripes);
  }
  ctx.fillStyle = th.wallTrim ?? th.wallTop ?? WALL_TOP;
  ctx.fill(c.faceTrim);
  ctx.restore();
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
