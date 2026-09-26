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
  /** Draw the whole shape in this one colour (used to build outlines). */
  silhouette?: string;
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

function visor(ctx: CanvasRenderingContext2D, silhouette?: string): void {
  ctx.beginPath();
  ctx.ellipse(6, -26, 9, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = silhouette ?? VISOR_SHADE;
  ctx.fill();
  ctx.stroke();
  if (silhouette) return;
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
  const sil = o.silhouette;
  ctx.strokeStyle = sil ?? OUTLINE;
  const bodyFill = sil ?? color.body;
  const shadeFill = sil ?? color.shadow;

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
  if (!sil) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(1, 0, 14 - amp * Math.abs(sn) * 1.5, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // back leg
  leg(ctx, -9 - stride * 0.45, backLift, shadeFill, stride * 0.06);

  ctx.save();
  ctx.translate(0, bob - 8);
  ctx.rotate(lean);
  ctx.scale(1, 1 + stretch + breathe);
  ctx.translate(0, 8);
  // backpack
  ctx.beginPath();
  ctx.roundRect(-17 + packSway, -31, 9, 19, 3);
  ctx.fillStyle = shadeFill;
  ctx.fill();
  ctx.stroke();
  // body
  bodyPath(ctx);
  ctx.fillStyle = bodyFill;
  ctx.fill();
  if (!sil) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = color.shadow;
    ctx.beginPath();
    ctx.ellipse(-12, -14, 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  bodyPath(ctx);
  ctx.stroke();
  visor(ctx, sil);
  ctx.restore();

  // front leg (drawn over the body's lower edge)
  leg(ctx, 3 + stride * 0.45, frontLift, bodyFill, -stride * 0.06);
  ctx.restore();
}

const KILL_OUTLINE = '#ff1f1f';
const OUTLINE_DIRS = Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * Math.PI * 2), Math.sin((i / 8) * Math.PI * 2)]);

/** Solid red outline around a crewmate (the impostor's kill target); draw it just before the crewmate. */
export function drawKillOutline(ctx: CanvasRenderingContext2D, x: number, y: number, color: PlayerColor, o: CrewOpts = {}): void {
  for (const [dx, dy] of OUTLINE_DIRS) drawCrewmate(ctx, x + dx * 2.6, y + dy * 2.6, color, { ...o, silhouette: KILL_OUTLINE });
}

/** Height where a body is cut in half. */
const CUT = -20;
const FLESH = '#f6d6d6';
const BONE = '#f4f1ea';
/** The victim stands for a moment, then the top half topples off. */
const STAND_MS = 300;
const FALL_MS = 1000;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Ease out with a little overshoot, for the bone popping up. */
const easeOutBack = (k: number) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;

/** The lower half left on the floor: legs, torso up to a jagged cut, and a bone (scaled by `bone`). */
function lowerHalf(ctx: CanvasRenderingContext2D, color: PlayerColor, bone: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(1, 0, 14, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  leg(ctx, -9, 0, color.shadow);
  // backpack stub
  ctx.beginPath();
  ctx.roundRect(-17, CUT, 9, 8, [0, 0, 3, 3]);
  ctx.fillStyle = color.shadow;
  ctx.fill();
  ctx.stroke();
  // torso, cut with a jagged edge
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.lineTo(-11, CUT);
    for (let i = 1; i <= 6; i++) ctx.lineTo(-11 + i * 4, CUT + (i % 2 ? -2.5 : 0));
    ctx.lineTo(13, -8);
    ctx.closePath();
  };
  torso();
  ctx.fillStyle = color.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = color.shadow;
  ctx.beginPath();
  ctx.ellipse(-12, -14, 9, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  torso();
  ctx.stroke();
  // cut surface
  ctx.beginPath();
  ctx.ellipse(1, CUT - 0.5, 10.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = FLESH;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#b8565a';
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = OUTLINE;
  // bone
  if (bone > 0) {
    ctx.save();
    ctx.translate(2.5, CUT - 0.5);
    ctx.rotate(-0.28);
    ctx.scale(bone, bone);
    ctx.beginPath();
    ctx.roundRect(-2.2, -11, 4.4, 11, 1.5);
    ctx.fillStyle = BONE;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-2.3, -11.5, 2.9, 0, Math.PI * 2);
    ctx.arc(2.3, -11.5, 2.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BONE;
    ctx.fillRect(-2.2, -12, 4.4, 3); // hide the seam between knobs and shaft
    ctx.restore();
  }
  leg(ctx, 3, 0, color.body);
}

/**
 * A dead body. For the first moments after the kill (ageMs since death) the
 * victim stands, then the top half topples backwards and fades as the bone
 * pops out; after that only the lower half remains.
 */
export function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, color: PlayerColor, ageMs = Infinity): void {
  if (ageMs < STAND_MS) {
    drawCrewmate(ctx, x + Math.sin(ageMs / 16) * 1.4, y, color);
    return;
  }
  const k = clamp01((ageMs - STAND_MS) / FALL_MS);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  lowerHalf(ctx, color, easeOutBack(clamp01((k - 0.25) / 0.4)));
  if (k < 1) {
    // Top half: tips back around the rear of the cut, speeding up as it falls, then fades.
    const fall = k * k;
    ctx.save();
    ctx.globalAlpha *= 1 - clamp01((k - 0.7) / 0.3);
    ctx.translate(-11 - fall * 8, CUT + fall * 14);
    ctx.rotate(-1.8 * fall);
    ctx.translate(11, -CUT);
    ctx.beginPath();
    ctx.rect(-40, -80, 80, 80 + CUT);
    ctx.clip();
    drawCrewmate(ctx, 0, 0, color);
    ctx.restore();
  }
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
