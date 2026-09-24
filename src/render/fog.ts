import type { Vec } from '../../shared/geom';

let fog: HTMLCanvasElement | null = null;

/**
 * Darken everything outside the visibility polygon. `poly`, (cx, cy) and
 * radius are in device pixels.
 */
export function drawFog(ctx: CanvasRenderingContext2D, poly: Vec[], cx: number, cy: number, radius: number, darkness = 0.88): void {
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
  f.fillStyle = `rgba(4,6,10,${darkness})`;
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
