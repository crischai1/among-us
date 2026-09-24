import { raySeg, segDist, segsIntersect, type Seg, type Vec } from '../geom';
import type { SegGrid } from '../map/segGrid';

const segScratch: Seg[] = [];
const angles: number[] = [];

function gather(grid: SegGrid, extra: readonly Seg[], minX: number, minY: number, maxX: number, maxY: number): Seg[] {
  segScratch.length = 0;
  grid.query(minX, minY, maxX, maxY, segScratch);
  for (const s of extra) segScratch.push(s);
  return segScratch;
}

/**
 * Visibility polygon from (ox, oy): rays towards every nearby segment endpoint
 * (plus a tiny offset either side) and an even fan so the circular edge is smooth.
 */
export function computeVisibility(
  ox: number,
  oy: number,
  radius: number,
  grid: SegGrid,
  extra: readonly Seg[] = [],
  fan = 64,
): Vec[] {
  const all = gather(grid, extra, ox - radius, oy - radius, ox + radius, oy + radius);
  const segs = all.filter((s) => segDist(ox, oy, s) <= radius);
  angles.length = 0;
  for (let i = 0; i < fan; i++) angles.push((i / fan) * Math.PI * 2 - Math.PI);
  const r2 = radius * radius;
  for (const s of segs) {
    for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]] as const) {
      if ((x - ox) ** 2 + (y - oy) ** 2 > r2 * 1.05) continue;
      const a = Math.atan2(y - oy, x - ox);
      angles.push(a - 1e-4, a, a + 1e-4);
    }
  }
  angles.sort((a, b) => a - b);
  const poly: Vec[] = [];
  for (const a of angles) {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let t = radius;
    for (const s of segs) {
      const h = raySeg(ox, oy, dx, dy, s);
      if (h < t) t = h;
    }
    poly.push({ x: ox + dx * t, y: oy + dy * t });
  }
  return poly;
}

/** True if nothing in the grid (or extra segments) blocks the straight line a-b. */
export function hasLineOfSight(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  grid: SegGrid,
  extra: readonly Seg[] = [],
): boolean {
  const segs = gather(grid, extra, Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by));
  for (const s of segs) if (segsIntersect(ax, ay, bx, by, s)) return false;
  return true;
}
