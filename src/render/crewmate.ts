import type { PlayerColor } from '../../shared/colors';

export interface CrewOpts {
  facing?: 1 | -1;
  /** Walk cycle phase (radians), advanced by distance travelled. */
  walk?: number;
  /** Walk blend 0 (standing) .. 1 (full stride); eases in and out. */
  amp?: number;
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

function leg(ctx: CanvasRenderingContext2D, x: number, lift: number, fill: string, swing = 0): void {
  // Pivot at the hip so the leg swings rather than slides.
  ctx.save();
  ctx.translate(x + 5, -9 - lift);
  ctx.rotate(swing);
  ctx.beginPath();
  ctx.roundRect(-5, -3, 10, 12, [2, 2, 4.5, 4.5]);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
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

  const amp = o.amp ?? 0;
  const p = o.walk ?? 0;
  const sn = Math.sin(p);
  const cs = Math.cos(p);
  // Front leg is ahead when sin > 0 and swinging forward (in the air) when cos > 0.
  const stride = sn * 5.5 * amp;
  const frontLift = Math.max(0, cs) * 3.8 * amp;
  const backLift = Math.max(0, -cs) * 3.8 * amp;
  // Body is highest as the legs pass each other, lowest at full stride.
  const bob = -(1 - Math.abs(sn)) * 2.2 * amp;
  const lean = 0.09 * amp;
  const stretch = (1 - Math.abs(sn)) * 0.035 * amp;
  const breathe = (1 - amp) * Math.sin(performance.now() / 650) * 0.015;
  const packSway = -Math.sin(p * 2 + 0.6) * 0.9 * amp;

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(1, 0, 14 - amp * Math.abs(sn) * 1.5, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // back leg
  leg(ctx, -9 - stride * 0.45, backLift, color.shadow, stride * 0.06);

  ctx.save();
  ctx.translate(0, bob - 8);
  ctx.rotate(lean);
  ctx.scale(1, 1 + stretch + breathe);
  ctx.translate(0, 8);
  // backpack
  ctx.beginPath();
  ctx.roundRect(-17 + packSway, -31, 9, 19, 3);
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
  visor(ctx);
  ctx.restore();

  // front leg (drawn over the body's lower edge)
  leg(ctx, 3 + stride * 0.45, frontLift, color.body, -stride * 0.06);
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
