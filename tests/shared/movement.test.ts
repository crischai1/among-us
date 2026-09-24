import { describe, expect, it } from 'vitest';
import { BASE_SPEED, DT, PLAYER_RADIUS } from '../../shared/constants';
import { getShip } from '../../shared/map';
import { isFree } from '../../shared/sim/collision';
import { doorSegs, stepPlayer, type MoveCtx } from '../../shared/sim/movement';
import { computeVisibility, hasLineOfSight } from '../../shared/sim/visibility';
import { makeRng } from '../../shared/rng';
import { pointInPolygon } from '../../shared/geom';

const map = getShip();
const ctx: MoveCtx = { map, doors: [], speed: 1, noclip: false };

describe('movement', () => {
  it('moves at base speed in open space and normalises diagonals', () => {
    const p = { x: 1500, y: 400 };
    stepPlayer(p, 1, 0, ctx);
    expect(p.x - 1500).toBeCloseTo(BASE_SPEED * DT, 1);
    const q = { x: 1500, y: 400 };
    stepPlayer(q, 1, 1, ctx);
    expect(Math.hypot(q.x - 1500, q.y - 400)).toBeCloseTo(BASE_SPEED * DT, 1);
  });

  it('stops at walls and slides along them', () => {
    // Cafeteria top wall at y=80
    const p = { x: 1600, y: 100 };
    for (let i = 0; i < 30; i++) stepPlayer(p, 1, -1, ctx);
    expect(p.y).toBeGreaterThanOrEqual(80 + PLAYER_RADIUS - 0.01);
    expect(p.x).toBeGreaterThan(1650);
  });

  it('never tunnels through walls even at 3x speed', () => {
    const fast = { ...ctx, speed: 3 };
    const p = { x: 1320, y: 200 };
    for (let i = 0; i < 60; i++) stepPlayer(p, -1, 0, fast);
    expect(p.x).toBeGreaterThanOrEqual(1300 + PLAYER_RADIUS - 0.01);
  });

  it('closed doors block movement', () => {
    const closed = { ...ctx, doors: doorSegs(map, ['cafe-w']) };
    const p = { x: 1340, y: 365 };
    for (let i = 0; i < 60; i++) stepPlayer(p, -1, 0, closed);
    expect(p.x).toBeGreaterThanOrEqual(1300 + PLAYER_RADIUS - 0.01);
    const open = { x: 1340, y: 365 };
    for (let i = 0; i < 60; i++) stepPlayer(open, -1, 0, ctx);
    expect(open.x).toBeLessThan(1250);
  });

  it('ghosts pass through walls', () => {
    const p = { x: 1320, y: 200 };
    for (let i = 0; i < 20; i++) stepPlayer(p, -1, 0, { ...ctx, noclip: true });
    expect(p.x).toBeLessThan(1300);
  });

  it('is deterministic for identical input streams', () => {
    const run = () => {
      const rng = makeRng(42);
      const p = { x: 1700, y: 540 };
      for (let i = 0; i < 1000; i++) stepPlayer(p, Math.floor(rng() * 3) - 1, Math.floor(rng() * 3) - 1, ctx);
      return p;
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(isFree(a.x, a.y, map, [], PLAYER_RADIUS - 0.5)).toBe(true);
  });
});

describe('visibility', () => {
  it('cannot see through walls', () => {
    // Cafeteria centre vs MedBay (wall in between)
    expect(hasLineOfSight(1400, 400, 1100, 700, map.visionGrid)).toBe(false);
    expect(hasLineOfSight(1400, 400, 1600, 600, map.visionGrid)).toBe(true);
    const poly = computeVisibility(1400, 400, 500, map.visionGrid);
    expect(pointInPolygon(1600, 600, poly)).toBe(true);
    expect(pointInPolygon(1100, 700, poly)).toBe(false);
  });

  it('closed doors block sight', () => {
    expect(hasLineOfSight(1340, 365, 1200, 365, map.visionGrid)).toBe(true);
    expect(hasLineOfSight(1340, 365, 1200, 365, map.visionGrid, doorSegs(map, ['cafe-w']))).toBe(false);
  });
});
