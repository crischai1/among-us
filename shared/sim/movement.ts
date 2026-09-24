import { BASE_SPEED, DT, PLAYER_RADIUS } from '../constants';
import { clamp, q2, type Seg, type Vec } from '../geom';
import type { CompiledMap } from '../map/compile';
import { resolveCollisions } from './collision';

export interface MoveCtx {
  map: CompiledMap;
  /** Segments of currently closed doors. */
  doors: readonly Seg[];
  /** Player speed multiplier from settings. */
  speed: number;
  /** Ghosts pass through walls. */
  noclip: boolean;
}

/**
 * Advance one player by one fixed tick. This is THE movement step: the server
 * runs it authoritatively and the client runs it for prediction, so it must be
 * deterministic. Positions are quantized to 0.01 so both sides agree exactly.
 */
export function stepPlayer(p: Vec, dx: number, dy: number, ctx: MoveCtx): void {
  dx = clamp(Math.round(dx), -1, 1);
  dy = clamp(Math.round(dy), -1, 1);
  if (dx === 0 && dy === 0) return;
  const len = Math.hypot(dx, dy);
  const total = BASE_SPEED * ctx.speed * DT;
  const vx = (dx / len) * total;
  const vy = (dy / len) * total;
  if (ctx.noclip) {
    p.x = q2(clamp(p.x + vx, 0, ctx.map.def.size.w));
    p.y = q2(clamp(p.y + vy, 0, ctx.map.def.size.h));
    return;
  }
  const n = Math.max(1, Math.ceil(total / (PLAYER_RADIUS / 2)));
  for (let i = 0; i < n; i++) {
    p.x += vx / n;
    p.y += vy / n;
    resolveCollisions(p, ctx.map, ctx.doors);
  }
  p.x = q2(clamp(p.x, 0, ctx.map.def.size.w));
  p.y = q2(clamp(p.y, 0, ctx.map.def.size.h));
}

export function doorSegs(map: CompiledMap, closed: Iterable<string>): Seg[] {
  const out: Seg[] = [];
  for (const id of closed) {
    const d = map.doors.get(id);
    if (d) out.push(d.seg);
  }
  return out;
}
