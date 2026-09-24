import { PLAYER_RADIUS } from '../constants';
import { closestOnSeg, type Seg, type Vec } from '../geom';
import type { CompiledMap } from '../map/compile';

const scratch: Seg[] = [];

/** Push a circle out of any overlapping segments. Mutates p. */
export function resolveCollisions(p: Vec, map: CompiledMap, doors: readonly Seg[], r = PLAYER_RADIUS): void {
  for (let iter = 0; iter < 4; iter++) {
    scratch.length = 0;
    map.moveGrid.query(p.x - r - 1, p.y - r - 1, p.x + r + 1, p.y + r + 1, scratch);
    for (const d of doors) scratch.push(d);
    let moved = false;
    for (const s of scratch) {
      const c = closestOnSeg(p.x, p.y, s);
      const ex = p.x - c.x;
      const ey = p.y - c.y;
      const d2 = ex * ex + ey * ey;
      if (d2 >= r * r || d2 < 1e-12) continue;
      const d = Math.sqrt(d2);
      const push = (r - d) / d;
      p.x += ex * push;
      p.y += ey * push;
      moved = true;
    }
    if (!moved) return;
  }
}

/** True if a circle at (x, y) overlaps no segment. */
export function isFree(x: number, y: number, map: CompiledMap, doors: readonly Seg[] = [], r = PLAYER_RADIUS): boolean {
  scratch.length = 0;
  map.moveGrid.query(x - r - 1, y - r - 1, x + r + 1, y + r + 1, scratch);
  for (const d of doors) scratch.push(d);
  for (const s of scratch) {
    const c = closestOnSeg(x, y, s);
    if ((x - c.x) ** 2 + (y - c.y) ** 2 < r * r - 1e-6) return false;
  }
  return true;
}
