import type { PlayerColor } from '../../shared/colors';

export interface CrewOpts {
  facing?: 1 | -1;
  walk?: number;
  moving?: boolean;
  ghost?: boolean;
  alpha?: number;
  scale?: number;
}

const VISOR = '#93c9e0';
const VISOR_SHADE = '#4e7a93';
const OUTLINE = '#0b0b10';

function bodyPath(ctx: CanvasRenderingContext2D, bottom = -8): void {
  ctx.beginPath();
  ctx.moveTo(-11, bottom);
  ctx.lineTo(-11, -25);
  ctx.bezierCurveTo(-11, -41, 13, -41, 13, -25);
  ctx.lineTo(13, bottom);
  ctx.closePath();
}

function leg(ctx: CanvasRenderingContext2D, x: number, lift: number, fill: string): void {
  ctx.beginPath();
  ctx.roundRect(x, -12 - lift, 10, 12, [0, 0, 4, 4]);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function visor(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(6, -26, 9, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = VISOR_SHADE;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(6.5, -27, 7.5, 4.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = VISOR;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(9, -28.5, 3.2, 1.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
}

/** Draw a crewmate with feet at (x, y). About 40 units tall at scale 1. */
export function drawCrewmate(ctx: CanvasRenderingContext2D, x: number, y: number, color: PlayerColor, o: CrewOpts = {}): void {
  const facing = o.facing ?? 1;
  const scale = o.scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;

  if (o.ghost) {
    ctx.globalAlpha *= 0.55;
    const t = performance.now() / 300;
    ctx.translate(0, Math.sin(t) * 2 - 6);
    // backpack
    ctx.beginPath();
    ctx.roundRect(-17, -30, 8, 18, 3);
    ctx.fillStyle = color.shadow;
    ctx.fill();
    ctx.stroke();
    // body with wavy tail
    ctx.beginPath();
    ctx.moveTo(-11, -25);
    ctx.bezierCurveTo(-11, -41, 13, -41, 13, -25);
    ctx.lineTo(13, -8);
    for (let i = 0; i <= 4; i++) {
      const px = 13 - i * 6;
      ctx.quadraticCurveTo(px - 3, -2 + Math.sin(t * 2 + i) * 3 + (i % 2 ? 4 : -2), px - 6, -6);
    }
    ctx.closePath();
    ctx.fillStyle = color.body;
    ctx.fill();
    ctx.stroke();
    visor(ctx);
    ctx.restore();
    return;
  }

  const phase = o.moving ? o.walk ?? 0 : 0;
  const a = o.moving ? Math.sin(phase) * 4 : 0;

  // back leg
  leg(ctx, -9 + a * 0.5, Math.max(0, a), color.shadow);
  // backpack
  ctx.beginPath();
  ctx.roundRect(-17, -31, 9, 19, 3);
  ctx.fillStyle = color.shadow;
  ctx.fill();
  ctx.stroke();
  // body
  bodyPath(ctx);
  ctx.fillStyle = color.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = color.shadow;
  ctx.beginPath();
  ctx.ellipse(-12, -14, 9, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  bodyPath(ctx);
  ctx.stroke();
  // front leg
  leg(ctx, 3 - a * 0.5, Math.max(0, -a), color.body);
  visor(ctx);
  ctx.restore();
}

/** A dead body: lower half with a bone sticking out. */
export function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, color: PlayerColor): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OUTLINE;
  // bone
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.roundRect(-2, -26, 5, 14, 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-1.5, -27, 3.2, 0, Math.PI * 2);
  ctx.arc(2.5, -27, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // legs
  leg(ctx, -9, 0, color.shadow);
  leg(ctx, 3, 0, color.body);
  // half body
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.lineTo(-11, -17);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-11 + i * 4, -17 + (i % 2 ? -3 : 0));
  ctx.lineTo(13, -8);
  ctx.closePath();
  ctx.fillStyle = color.body;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e9e6e6';
  ctx.beginPath();
  ctx.ellipse(1, -17, 10, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawNameTag(ctx: CanvasRenderingContext2D, x: number, y: number, name: string, color: string, scale = 1): void {
  ctx.save();
  ctx.font = `600 ${Math.round(12 * scale)}px "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(name, x, y);
  ctx.fillStyle = color;
  ctx.fillText(name, x, y);
  ctx.restore();
}
