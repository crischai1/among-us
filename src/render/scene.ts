import { colorOf } from '../../shared/colors';
import type { CompiledMap } from '../../shared/map';
import { F_GHOST, F_SCANNING, F_TEAMMATE } from '../../shared/types';
import { serverNow } from '../net/clock';
import { world } from '../world/world';
import { drawBody, drawCrewmate, drawKillOutline, drawNameTag } from './crewmate';
import { drawFloors, drawWalls } from './mapLayer';
import { drawCameras, drawDoors, drawProps, drawVents } from './props';

export interface Look {
  name: string;
  color: number;
}

export interface SceneOpts {
  map: CompiledMap;
  t: number;
  roster: Look[];
  /** Our own avatar, or null (cameras). */
  self: { x: number; y: number; look: Look; flags: number; facing: 1 | -1; walk: number; amp: number; red: boolean } | null;
  /** Show ghosts (viewer is dead) */
  ghostView: boolean;
  /** Filter for whether a point is visible to the viewer. */
  visible: (x: number, y: number) => boolean;
  /** Opacity for a point near the edge of vision (1 = fully visible). */
  fade?: (x: number, y: number) => number;
  ventHighlight: string | null;
  camsInUse: boolean;
  /** Entity the impostor can kill right now: drawn with a red outline. */
  killTarget?: number | null;
  names: boolean;
}

interface Drawable {
  y: number;
  draw: () => void;
}

/** Static layer under the fog: floors, vents, props. */
export function drawSceneFloor(ctx: CanvasRenderingContext2D, map: CompiledMap, t: number, ventHighlight: string | null): void {
  drawFloors(ctx, map);
  drawVents(ctx, map, ventHighlight);
  drawProps(ctx, map, t);
}

/** Bodies and players, y-sorted, drawn above walls (already filtered by line of sight). */
export function drawSceneEntities(ctx: CanvasRenderingContext2D, o: SceneOpts): { x: number; y: number; name: string; color: string }[] {
  const fade = o.fade ?? (() => 1);
  const items: Drawable[] = [];
  const tags: { x: number; y: number; name: string; color: string }[] = [];
  const now = serverNow();
  for (const b of world.bodies.values()) {
    if (!o.visible(b.x, b.y)) continue;
    const a = fade(b.x, b.y);
    items.push({
      y: b.y - 20,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = a;
        drawBody(ctx, b.x, b.y, colorOf(b.color), now - b.at);
        ctx.restore();
      },
    });
  }
  for (const e of world.ents.values()) {
    const ghost = (e.flags & F_GHOST) !== 0;
    if (ghost && !o.ghostView) continue;
    if (!o.visible(e.x, e.y)) continue;
    const look = o.roster[e.look];
    if (!look) continue;
    const color = colorOf(look.color);
    const scanning = (e.flags & F_SCANNING) !== 0;
    const a = e.alpha * fade(e.x, e.y);
    items.push({
      y: e.y,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = a;
        const pose = { facing: e.facing, walk: e.walk, amp: e.amp, ghost };
        if (e.eid === o.killTarget) drawKillOutline(ctx, e.x, e.y, color, pose);
        drawCrewmate(ctx, e.x, e.y, color, pose);
        if (scanning) drawScan(ctx, e.x, e.y, o.t);
        ctx.restore();
      },
    });
    if (o.names && a > 0.3) tags.push({ x: e.x, y: e.y - 44, name: look.name, color: e.flags & F_TEAMMATE ? '#ff4b4b' : '#ffffff' });
  }
  const s = o.self;
  if (s) {
    const ghost = (s.flags & F_GHOST) !== 0;
    items.push({
      y: s.y,
      draw: () => drawCrewmate(ctx, s.x, s.y, colorOf(s.look.color), { facing: s.facing, walk: s.walk, amp: s.amp, ghost }),
    });
    if (o.names) tags.push({ x: s.x, y: s.y - 44, name: s.look.name, color: s.red ? '#ff4b4b' : '#ffffff' });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  for (const f of world.effects) {
    const k = (performance.now() - f.at) / 800;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = f.kind === 'vent' ? '#9aa3ad' : '#d7c9ff';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * 30 * k, f.y - 18 + Math.sin(a) * 22 * k, 9 * (1 - k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  return tags;
}

/** Walls, doors and cameras: drawn above the fog. */
export function drawSceneTop(ctx: CanvasRenderingContext2D, o: { map: CompiledMap; t: number; closedDoors: readonly string[]; camsInUse: boolean }): void {
  drawWalls(ctx, o.map);
  drawDoors(ctx, o.map, o.closedDoors);
  drawCameras(ctx, o.map, o.camsInUse, o.t);
}

export function drawTags(ctx: CanvasRenderingContext2D, tags: { x: number; y: number; name: string; color: string }[]): void {
  for (const tg of tags) drawNameTag(ctx, tg.x, tg.y, tg.name, tg.color);
}

function drawScan(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const k = (Math.sin(t / 300) + 1) / 2;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#41ff7a';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#41ff7a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const ly = y - 40 * k;
  ctx.moveTo(x - 16, ly);
  ctx.lineTo(x + 18, ly);
  ctx.stroke();
  ctx.restore();
}
