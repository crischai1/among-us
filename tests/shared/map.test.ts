import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, USE_RANGE } from '../../shared/constants';
import { getLobby, getShip, type CompiledMap } from '../../shared/map';
import { CELL } from '../../shared/map/compile';
import { isFree } from '../../shared/sim/collision';

/** Flood fill over cell centres where a player circle fits. */
function reachable(map: CompiledMap): Uint8Array {
  const { cols, rows } = map;
  const ok = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      if (map.walkable[r * cols + c] && isFree(x, y, map)) ok[r * cols + c] = 1;
    }
  const seen = new Uint8Array(cols * rows);
  const sx = Math.floor((map.def.spawn.x + map.def.spawn.r) / CELL);
  const sy = Math.floor(map.def.spawn.y / CELL);
  const stack = [sy * cols + sx];
  expect(ok[stack[0]]).toBe(1);
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i] || !ok[i]) continue;
    seen[i] = 1;
    const c = i % cols;
    if (c > 0) stack.push(i - 1);
    if (c < cols - 1) stack.push(i + 1);
    if (i >= cols) stack.push(i - cols);
    if (i < cols * (rows - 1)) stack.push(i + cols);
  }
  return seen;
}

function nearReachable(map: CompiledMap, seen: Uint8Array, x: number, y: number, range: number): boolean {
  const c0 = Math.floor((x - range) / CELL);
  const c1 = Math.floor((x + range) / CELL);
  const r0 = Math.floor((y - range) / CELL);
  const r1 = Math.floor((y + range) / CELL);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (c < 0 || r < 0 || c >= map.cols || r >= map.rows || !seen[r * map.cols + c]) continue;
      if (Math.hypot(c * CELL + CELL / 2 - x, r * CELL + CELL / 2 - y) <= range) return true;
    }
  return false;
}

describe.each([
  ['ship', getShip()],
  ['lobby', getLobby()],
])('%s map integrity', (_name, map) => {
  const seen = reachable(map);

  it('every room is reachable from spawn', () => {
    for (const room of map.def.rooms) {
      const r = room.rects[0];
      expect(nearReachable(map, seen, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h)), room.id).toBe(true);
    }
  });

  it('every station and vent is usable from a reachable spot', () => {
    for (const s of map.def.stations) {
      expect(nearReachable(map, seen, s.x, s.y, USE_RANGE - 8), s.id).toBe(true);
    }
    for (const v of map.def.vents) {
      expect(map.isWalkable(v.x, v.y), v.id).toBe(true);
      expect(nearReachable(map, seen, v.x, v.y, USE_RANGE - 20), v.id).toBe(true);
    }
  });

  it('spawn ring positions are free', () => {
    for (let i = 0; i < 15; i++) {
      const a = -Math.PI / 2 + (i / 15) * Math.PI * 2;
      const x = map.def.spawn.x + Math.cos(a) * map.def.spawn.r;
      const y = map.def.spawn.y + Math.sin(a) * map.def.spawn.r;
      expect(isFree(x, y, map), `spawn ${i}`).toBe(true);
    }
  });

  it('ids are unique and vent links symmetric', () => {
    const ids = [...map.def.stations.map((s) => s.id), ...map.def.vents.map((v) => v.id), ...map.def.doors.map((d) => d.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of map.def.vents)
      for (const l of v.links) expect(map.vents.get(l)?.links, `${v.id}->${l}`).toContain(v.id);
  });

  it('rooms do not overlap and everything fits on the map', () => {
    const rects = map.def.rooms.flatMap((r) => r.rects.map((rc) => ({ id: r.id, ...rc })));
    for (const a of rects) {
      expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= map.def.size.w && a.y + a.h <= map.def.size.h, a.id).toBe(true);
      for (const b of rects) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('door rooms and camera views are real', () => {
    for (const d of map.def.doors) expect(map.rooms.has(d.room), d.id).toBe(true);
    for (const c of map.cameras) expect(c.view.w / c.view.h, c.id).toBeCloseTo(1.5);
  });

  it('stations and vents sit in their declared room', () => {
    for (const s of map.def.stations) expect(map.roomAt(s.x, s.y), s.id).toBe(s.room);
    for (const v of map.def.vents) expect(map.roomAt(v.x, v.y), v.id).toBe(v.room);
  });

  it('every door spans a walkable gap between two walls', () => {
    for (const d of map.def.doors) {
      const { x1, y1, x2, y2 } = d.seg;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const horiz = y1 === y2;
      // both sides of the door midpoint are walkable
      expect(map.isWalkable(horiz ? mx : mx - 5, horiz ? my - 5 : my), d.id).toBe(true);
      expect(map.isWalkable(horiz ? mx : mx + 5, horiz ? my + 5 : my), d.id).toBe(true);
      // door is wide enough to walk through
      expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThan(PLAYER_RADIUS * 2 + 10);
      // just beyond each end is wall
      const ex = horiz ? 5 : 0;
      const ey = horiz ? 0 : 5;
      expect(map.isWalkable(x1 - ex + (horiz ? 0 : 5), y1 - ey + (horiz ? 5 : 0)) && map.isWalkable(x1 - ex - (horiz ? 0 : 5), y1 - ey - (horiz ? 5 : 0)), `${d.id} start`).toBe(false);
    }
  });
});
