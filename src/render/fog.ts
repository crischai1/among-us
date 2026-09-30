import type { Vec } from '../../shared/geom';

const FOG_RGB = '4,6,10';
const DARKNESS = 0.88;

let fog: HTMLCanvasElement | null = null;

/**
 * Darken everything outside the visibility polygon. `poly`, (cx, cy) and
 * radius are in device pixels.
 */
export function drawFog(ctx: CanvasRenderingContext2D, poly: Vec[], cx: number, cy: number, radius: number, darkness = DARKNESS): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  if (!fog) fog = document.createElement('canvas');
  if (fog.width !== W || fog.height !== H) {
    fog.width = W;
    fog.height = H;
  }
  const f = fog.getContext('2d')!;
  f.globalCompositeOperation = 'source-over';
  f.clearRect(0, 0, W, H);
  f.fillStyle = `rgba(${FOG_RGB},${darkness})`;
  f.fillRect(0, 0, W, H);
  f.globalCompositeOperation = 'destination-out';
  const g = f.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.78, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  f.fillStyle = g;
  f.beginPath();
  poly.forEach((p, i) => (i ? f.lineTo(p.x, p.y) : f.moveTo(p.x, p.y)));
  f.closePath();
  f.fill();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(fog, 0, 0);
  ctx.restore();
}

/** Paints a sprite in world coordinates on the given context. */
export type Paint = (ctx: CanvasRenderingContext2D) => void;

/** Draws sprites through the viewer's light instead of on top of the fog. */
export interface Light {
  /** Paint a sprite whose feet are at world (x, y). */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, paint: Paint): void;
}

/** Sprite bounds around the feet, in world units (hats reach highest). */
const BOX = { l: 56, r: 56, t: 110, b: 28 };

let occ: HTMLCanvasElement | null = null;
let scratch: HTMLCanvasElement | null = null;
let maskScratch: HTMLCanvasElement | null = null;

const grow = (c: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement => {
  c ??= document.createElement('canvas');
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, w);
    c.height = Math.max(c.height, h);
  }
  return c;
};

/**
 * Build a light from the same polygon and radius as the fog (device pixels),
 * with `k`, (ox, oy) mapping world to device pixels, and `walls` the wall
 * tops and faces in world units.
 *
 * Sprites are cut along the shadow's exact shape, except where they overlap
 * a wall: there the floor under their feet decides, so someone pressed
 * against a wall stays whole while someone behind it stays hidden. They stay
 * opaque, shaded like the floor they stand on, and end where the light does.
 */
export function makeLight(
  poly: Vec[], cx: number, cy: number, radius: number, k: number, ox: number, oy: number, W: number, H: number, walls: Path2D,
): Light {
  occ ??= document.createElement('canvas');
  if (occ.width !== W || occ.height !== H) {
    occ.width = W;
    occ.height = H;
  }
  const o = occ.getContext('2d')!;
  o.clearRect(0, 0, W, H);
  o.fillStyle = '#fff';
  o.beginPath();
  poly.forEach((p, i) => (i ? o.lineTo(p.x, p.y) : o.moveTo(p.x, p.y)));
  o.closePath();
  o.fill();
  const lit = occ;

  return {
    draw(ctx, x, y, paint) {
      const dx0 = Math.floor((x - BOX.l) * k + ox);
      const dy0 = Math.floor((y - BOX.t) * k + oy);
      const w = Math.ceil((BOX.l + BOX.r) * k) + 2;
      const h = Math.ceil((BOX.t + BOX.b) * k) + 2;
      if (dx0 >= W || dy0 >= H || dx0 + w <= 0 || dy0 + h <= 0) return;
      const sx0 = clampInt(dx0, 0, W);
      const sx1 = clampInt(dx0 + w, 0, W);
      const sy0 = clampInt(dy0, 0, H);
      const sy1 = clampInt(dy0 + h, 0, H);
      if (sx1 <= sx0 || sy1 <= sy0) return;
      const cx1 = cx - dx0;
      const cy1 = cy - dy0;

      // Mask: the lit floor as it is, plus, over walls, the floor row at the feet.
      maskScratch = grow(maskScratch, w, h);
      const m = maskScratch.getContext('2d')!;
      m.setTransform(1, 0, 0, 1, 0, 0);
      m.globalCompositeOperation = 'source-over';
      m.clearRect(0, 0, w, h);
      m.drawImage(lit, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0 - dx0, sy0 - dy0, sx1 - sx0, sy1 - sy0);
      const row = clampInt(Math.round((y - 4) * k + oy), 0, H - 1);
      m.save();
      m.setTransform(k, 0, 0, k, ox - dx0, oy - dy0);
      m.clip(walls);
      m.setTransform(1, 0, 0, 1, 0, 0);
      m.imageSmoothingEnabled = false;
      m.drawImage(lit, sx0, row, sx1 - sx0, 1, sx0 - dx0, 0, sx1 - sx0, h);
      m.restore();

      scratch = grow(scratch, w, h);
      const s = scratch.getContext('2d')!;
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-over';
      s.globalAlpha = 1;
      s.clearRect(0, 0, w, h);
      s.setTransform(k, 0, 0, k, ox - dx0, oy - dy0);
      paint(s);
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'destination-in';
      s.drawImage(maskScratch, 0, 0, w, h, 0, 0, w, h);
      // Darken like the floor: the fog's falloff, painted onto the sprite only.
      s.globalCompositeOperation = 'source-atop';
      const shade = s.createRadialGradient(cx1, cy1, 0, cx1, cy1, radius);
      shade.addColorStop(0, `rgba(${FOG_RGB},0)`);
      shade.addColorStop(0.78, `rgba(${FOG_RGB},0)`);
      shade.addColorStop(1, `rgba(${FOG_RGB},${DARKNESS})`);
      s.fillStyle = shade;
      s.fillRect(0, 0, w, h);
      // Then end where the light has all but gone, with a short feather.
      s.globalCompositeOperation = 'destination-in';
      const edge = s.createRadialGradient(cx1, cy1, 0, cx1, cy1, radius);
      edge.addColorStop(0, 'rgba(0,0,0,1)');
      edge.addColorStop(0.95, 'rgba(0,0,0,1)');
      edge.addColorStop(0.985, 'rgba(0,0,0,0)');
      s.fillStyle = edge;
      s.fillRect(0, 0, w, h);
      s.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(scratch, 0, 0, w, h, dx0, dy0, w, h);
      ctx.restore();
    },
  };
}

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
