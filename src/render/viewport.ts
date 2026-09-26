import type { Rect } from '../../shared/geom';
import { pointInRect } from '../../shared/geom';
import { world } from '../world/world';
import { drawSceneEntities, drawSceneFloor, drawSceneTop, drawTags, type Look } from './scene';

/** Render a fixed world rect (security camera) into a canvas: no fog, no ghosts. */
export function renderViewport(ctx: CanvasRenderingContext2D, view: Rect, t: number, roster: Look[], camsInUse: boolean): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const k = Math.min(W / view.w, H / view.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = world.map.def.theme.void;
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(k, 0, 0, k, -view.x * k + (W - view.w * k) / 2, -view.y * k + (H - view.h * k) / 2);
  drawSceneFloor(ctx, world.map, t, null);
  drawSceneTop(ctx, { map: world.map, t, closedDoors: world.closedDoors, camsInUse });
  const tags = drawSceneEntities(ctx, {
    map: world.map,
    t,
    roster,
    self: null,
    ghostView: false,
    visible: (x, y) => pointInRect(x, y, view),
    ventHighlight: null,
    camsInUse,
    names: true,
  });
  drawTags(ctx, tags);
}
