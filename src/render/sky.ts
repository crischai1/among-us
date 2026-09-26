/** Open sky behind maps that float above the clouds (MIRA HQ). */

interface Cloud {
  x: number;
  y: number;
  s: number;
  depth: number;
}

const WRAP = 2400;
const clouds: Cloud[] = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 7919) % WRAP,
  y: (i * 104729) % WRAP,
  s: 0.6 + ((i * 37) % 10) / 12,
  depth: 0.25 + ((i * 13) % 7) / 14,
}));

function puff(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, 90 * s, 34 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 55 * s, y + 8 * s, 55 * s, 26 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 60 * s, y + 6 * s, 60 * s, 28 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 10 * s, y - 22 * s, 55 * s, 30 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Screen-space sky with slow parallax clouds; (cx, cy) is the camera, k the world scale. */
export function drawSky(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, k: number, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5fa4d8');
  g.addColorStop(0.6, '#8cc3e8');
  g.addColorStop(1, '#bfe0f4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const span = WRAP * k * 0.6;
  for (const c of clouds) {
    const drift = t * 0.004 * c.depth;
    const x = ((((c.x + drift - cx * c.depth * 0.35) * k * 0.6) % span) + span) % span;
    const y = ((((c.y - cy * c.depth * 0.35) * k * 0.6) % span) + span) % span;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + c.depth * 0.4})`;
    // Draw each cloud at every screen-sized repeat so the field tiles.
    for (let ox = x - span; ox < W + 200 * k; ox += span) {
      for (let oy = y - span; oy < H + 100 * k; oy += span) puff(ctx, ox, oy, c.s * k * (0.6 + c.depth));
    }
  }
}

const rocks = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 7919) % WRAP,
  y: (i * 6271) % WRAP,
  r: 30 + ((i * 53) % 90),
  shade: (i * 17) % 3,
}));
const ROCK_SHADES = ['#2d2536', '#352c40', '#261f2e'];

/** Rocky planet ground (Polus), fixed to the world so it scrolls with the map. */
export function drawRockGround(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, k: number): void {
  ctx.fillStyle = '#241d2c';
  ctx.fillRect(0, 0, W, H);
  const span = WRAP * k;
  for (const r of rocks) {
    const x = ((((r.x - cx) * k) % span) + span) % span;
    const y = ((((r.y - cy) * k) % span) + span) % span;
    ctx.fillStyle = ROCK_SHADES[r.shade];
    for (let ox = x - span; ox < W + r.r * k; ox += span) {
      for (let oy = y - span; oy < H + r.r * k; oy += span) {
        ctx.beginPath();
        ctx.ellipse(ox, oy, r.r * k, r.r * 0.7 * k, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
