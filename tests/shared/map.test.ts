import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, USE_RANGE } from '../../shared/constants';
import { pointInPolygon, pointInRect, type Seg } from '../../shared/geom';
import { getLobby, getMap, getShip, mapShapes, roomLabel, type CompiledMap } from '../../shared/map';
import { stationDistance } from '../../shared/map/build';
import { CELL, type Shape } from '../../shared/map/compile';
import type { MapDef } from '../../shared/map/types';
import { isFree } from '../../shared/sim/collision';

/** Flood fill over cell centres where a player circle fits (optionally with some doors shut). */
function reachable(map: CompiledMap, doors: Seg[] = [], from = { x: map.def.spawn.x + map.def.spawn.r, y: map.def.spawn.y }): Uint8Array {
  const { cols, rows } = map;
  const ok = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      if (map.walkable[r * cols + c] && isFree(x, y, map, doors)) ok[r * cols + c] = 1;
    }
  const seen = new Uint8Array(cols * rows);
  const sx = Math.floor(from.x / CELL);
  const sy = Math.floor(from.y / CELL);
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

const strictlyInside = (s: Shape, x: number, y: number) =>
  s.rect ? x > s.rect.x && x < s.rect.x + s.rect.w && y > s.rect.y && y < s.rect.y + s.rect.h : pointInPolygon(x, y, s.poly);
const bbox = (s: Shape) => {
  if (s.rect) return s.rect;
  const xs = s.poly.map((p) => p.x);
  const ys = s.poly.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

/** Vent groups you can travel between. */
function ventNetworks(def: MapDef): number {
  const seen = new Set<string>();
  let n = 0;
  for (const v of def.vents) {
    if (seen.has(v.id)) continue;
    n++;
    const stack = [v.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...def.vents.find((x) => x.id === id)!.links);
    }
  }
  return n;
}

describe.each([
  ['skeld', getShip()],
  ['mira', getMap('mira')],
  ['polus', getMap('polus')],
  ['lobby', getLobby()],
])('%s map integrity', (_name, map) => {
  const seen = reachable(map);

  it('every room is reachable from spawn', () => {
    for (const room of map.def.rooms) {
      const c = roomLabel(room);
      expect(map.roomAt(c.x, c.y), `${room.id} label`).toBe(room.id);
      // /tp lands here, so it must be open floor.
      expect(isFree(c.x, c.y, map), `${room.id} label is inside something`).toBe(true);
      expect(nearReachable(map, seen, c.x, c.y, 150), room.id).toBe(true);
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

  it('spawn ring positions are free and reachable', () => {
    for (const ring of [map.def.spawn, map.def.start ?? map.def.spawn]) {
      for (let i = 0; i < 15; i++) {
        const a = -Math.PI / 2 + (i / 15) * Math.PI * 2;
        const x = ring.x + Math.cos(a) * ring.r;
        const y = ring.y + Math.sin(a) * ring.r;
        expect(isFree(x, y, map), `spawn ${i}`).toBe(true);
        expect(nearReachable(map, seen, x, y, 10), `spawn ${i}`).toBe(true);
      }
    }
  });

  it('walkable pieces never overlap (walls are drawn between them)', () => {
    const shapes = mapShapes(map.def).map((p) => p.shape);
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        const a = bbox(shapes[i]);
        const b = bbox(shapes[j]);
        const x0 = Math.max(a.x, b.x);
        const x1 = Math.min(a.x + a.w, b.x + b.w);
        const y0 = Math.max(a.y, b.y);
        const y1 = Math.min(a.y + a.h, b.y + b.h);
        for (let x = x0 + 2.5; x < x1; x += 5)
          for (let y = y0 + 2.5; y < y1; y += 5)
            expect(strictlyInside(shapes[i], x, y) && strictlyInside(shapes[j], x, y), `pieces ${i} and ${j} overlap at ${x},${y}`).toBe(false);
      }
    }
  });

  it('shutting a room’s doors seals it off', () => {
    // Rooms with another way in that doesn't pass a door: on Polus, Office (via Admin) and the
    // Laboratory both lead round through decontamination and Specimen.
    const open = new Set(['polus:lab', 'polus:office']);
    const doorRooms = [...new Set(map.def.doors.filter((d) => !d.auto).map((d) => d.room))];
    for (const room of doorRooms) {
      if (open.has(`${map.def.id}:${room}`)) continue;
      const segs = map.def.doors.filter((d) => d.room === room).map((d) => d.seg);
      const inside = roomLabel(map.rooms.get(room)!);
      // Start from a free spot in some other room.
      const other = map.def.rooms.find((r) => r.id !== room && !r.outdoor && isFree(roomLabel(r).x, roomLabel(r).y, map))!;
      const cut = reachable(map, segs, roomLabel(other));
      expect(nearReachable(map, cut, inside.x, inside.y, 40), `${map.def.id}: ${room} still reachable`).toBe(false);
    }
  });

  it('the admin table can be used from every side', () => {
    for (const s of map.def.stations.filter((x) => x.kind === 'admin')) {
      expect(s.area, s.id).toBeTruthy();
      const a = s.area!;
      const sides = [
        [a.x + a.w / 2, a.y - 30],
        [a.x + a.w / 2, a.y + a.h + 30],
        [a.x - 30, a.y + a.h / 2],
        [a.x + a.w + 30, a.y + a.h / 2],
      ];
      for (const [x, y] of sides) {
        expect(stationDistance(s, x, y), `${s.id} ${x},${y}`).toBeLessThan(USE_RANGE);
        expect(nearReachable(map, seen, x, y, 18), `${s.id} side ${x},${y}`).toBe(true);
      }
    }
  });

  it('every task step and sabotage uses real stations of the right kind', () => {
    for (const r of map.def.tasks)
      for (const pool of r.steps)
        for (const id of pool) expect(map.stations.get(id)?.kind, `${r.type}: ${id}`).toBe(r.type);
    for (const s of map.def.sabotages) for (const id of s.stations) expect(map.stations.get(id)?.kind, id).toBe(s.kind);
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

describe('MIRA HQ', () => {
  const mira = getMap('mira');
  const def = mira.def;
  const seen = reachable(mira);

  it('has one vent network joining all eleven vents', () => {
    expect(def.vents).toHaveLength(11);
    expect(ventNetworks(def)).toBe(1);
  });

  it('has no cameras and no doors impostors can lock, but a door log and admin', () => {
    expect(def.cameras).toHaveLength(0);
    expect(def.doors.every((d) => d.auto)).toBe(true);
    expect(def.stations.filter((s) => s.kind === 'doorlog').map((s) => s.room)).toEqual(['comms']);
    expect(def.stations.some((s) => s.kind === 'admin')).toBe(true);
    expect(def.stations.some((s) => s.kind === 'vitals')).toBe(false);
  });

  it('decontamination doors close off the chamber around its zone', () => {
    const dc = def.decon![0];
    const room = mira.rooms.get(dc.room)!;
    const r = room.rects[0];
    expect(dc.zone.x >= r.x && dc.zone.y >= r.y && dc.zone.x + dc.zone.w <= r.x + r.w && dc.zone.y + dc.zone.h <= r.y + r.h).toBe(true);
    for (const id of dc.doors) {
      const d = mira.doors.get(id)!;
      expect(d.auto).toBe(true);
      // spans the full chamber width
      expect(Math.min(d.seg.x1, d.seg.x2)).toBe(r.x);
      expect(Math.max(d.seg.x1, d.seg.x2)).toBe(r.x + r.w);
      expect(pointInRect(dc.zone.x + dc.zone.w / 2, (d.seg.y1 + d.seg.y2) / 2, dc.zone)).toBe(false);
    }
  });

  it('door-log sensors stretch wall to wall across walkable hallway', () => {
    expect(def.sensors!.map((s) => s.name)).toEqual(['North', 'Southwest', 'Southeast']);
    for (const s of def.sensors!) {
      const { x1, y1, x2, y2 } = s.seg;
      expect(nearReachable(mira, seen, (x1 + x2) / 2, (y1 + y2) / 2, 10), s.id).toBe(true);
      // You can't walk around the ends: they touch (or nearly touch) a wall.
      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        const nearWall = mira.walls.some((w) => {
          const dx = w.x2 - w.x1;
          const dy = w.y2 - w.y1;
          const t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / (dx * dx + dy * dy)));
          return Math.hypot(w.x1 + dx * t - x, w.y1 + dy * t - y) < 12;
        });
        expect(nearWall, `${s.id} end ${x},${y}`).toBe(true);
      }
    }
  });

  it('the diagonal Y-hallway walls are real diagonals', () => {
    const diagonal = mira.walls.filter((w) => w.x1 !== w.x2 && w.y1 !== w.y2);
    expect(diagonal.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Polus', () => {
  const polus = getMap('polus');

  it('the hallway from Electrical to O2 is walled off from the snow', () => {
    const shut = ['elec-s', 'o2-n'].map((id) => polus.doors.get(id)!.seg);
    const cut = reachable(polus, shut, roomLabel(polus.rooms.get('dropship')!));
    const hall = polus.def.halls[0];
    expect(nearReachable(polus, cut, hall.x + hall.w / 2, hall.y + hall.h / 2, 40)).toBe(false);
  });

  it('O2 has a big machine in the middle that blocks sight', () => {
    const o2 = polus.def.obstacles.find((o) => o.prop === 'o2Machine')!;
    expect(o2.blocksVision).toBe(true);
    expect(polus.roomAt(o2.rect!.x + o2.rect!.w / 2, o2.rect!.y + o2.rect!.h / 2)).toBe('o2');
  });
});

describe('Polus decontamination', () => {
  const polus = getMap('polus');
  const shut = (ids: string[]) => ids.map((id) => polus.doors.get(id)!.seg);
  const specimen = roomLabel(polus.rooms.get('specimen')!);
  const from = (room: string, doors: string[]) => reachable(polus, shut(doors), roomLabel(polus.rooms.get(room)!));

  it('Specimen can only be reached through one of the two decontamination rooms', () => {
    const cut = from('dropship', ['deconW-n', 'deconE-w']);
    expect(nearReachable(polus, cut, specimen.x, specimen.y, 40)).toBe(false);
  });

  it('the lower one opens out of Admin’s floor, the upper one out of the Laboratory', () => {
    const lower = polus.doors.get('deconW-n')!.seg;
    expect(polus.roomAt((lower.x1 + lower.x2) / 2, lower.y1 - 20)).toBe('admin');
    expect(polus.roomAt((lower.x1 + lower.x2) / 2, lower.y1 + 40)).toBe('deconW');
    expect(nearReachable(polus, from('admin', ['deconE-w']), specimen.x, specimen.y, 40)).toBe(true);
    const upper = polus.doors.get('deconE-w')!.seg;
    expect(polus.roomAt(upper.x1 - 30, (upper.y1 + upper.y2) / 2)).toBe('lab');
    expect(nearReachable(polus, from('lab', ['deconW-n']), specimen.x, specimen.y, 40)).toBe(true);
  });
});
