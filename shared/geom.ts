export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const dist2 = (ax: number, ay: number, bx: number, by: number): number =>
  (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

export const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.sqrt(dist2(ax, ay, bx, by));

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Round to 2 decimals. Movement is quantized so client and server agree exactly. */
export const q2 = (v: number): number => Math.round(v * 100) / 100;

export const pointInRect = (x: number, y: number, r: Rect): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function rectCenter(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Closest point on segment s to (px, py). */
export function closestOnSeg(px: number, py: number, s: Seg): Vec {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: s.x1, y: s.y1 };
  const t = clamp(((px - s.x1) * dx + (py - s.y1) * dy) / len2, 0, 1);
  return { x: s.x1 + dx * t, y: s.y1 + dy * t };
}

export function segDist(px: number, py: number, s: Seg): number {
  const c = closestOnSeg(px, py, s);
  return dist(px, py, c.x, c.y);
}

/**
 * Ray from (ox, oy) in direction (dx, dy) against segment s.
 * Returns the ray parameter t (distance if dir is unit) or Infinity.
 */
export function raySeg(ox: number, oy: number, dx: number, dy: number, s: Seg): number {
  const sx = s.x2 - s.x1;
  const sy = s.y2 - s.y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-12) return Infinity;
  const wx = s.x1 - ox;
  const wy = s.y1 - oy;
  const t = (wx * sy - wy * sx) / denom;
  const u = (wx * dy - wy * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return Infinity;
  return t;
}

/** True if segments (a-b) and s properly intersect. */
export function segsIntersect(ax: number, ay: number, bx: number, by: number, s: Seg): boolean {
  const t = raySeg(ax, ay, bx - ax, by - ay, s);
  return t <= 1;
}

export function pointInPolygon(x: number, y: number, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function rectSegs(r: Rect): Seg[] {
  const { x, y, w, h } = r;
  return [
    { x1: x, y1: y, x2: x + w, y2: y },
    { x1: x + w, y1: y, x2: x + w, y2: y + h },
    { x1: x + w, y1: y + h, x2: x, y2: y + h },
    { x1: x, y1: y + h, x2: x, y2: y },
  ];
}

export function circleSegs(cx: number, cy: number, r: number, n = 14): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    out.push({
      x1: cx + Math.cos(a1) * r,
      y1: cy + Math.sin(a1) * r,
      x2: cx + Math.cos(a2) * r,
      y2: cy + Math.sin(a2) * r,
    });
  }
  return out;
}
