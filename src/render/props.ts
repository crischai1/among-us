import type { CompiledMap } from '../../shared/map';
import type { ObstacleDef, StationDef } from '../../shared/map/types';

const OUT = '#12161d';

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = OUT, lw = 2.5) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke = OUT, lw = 2.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: ObstacleDef, t: number, button: { x: number; y: number } | null) {
  const r = o.rect;
  const c = o.circle;
  switch (o.prop) {
    case 'table':
      circle(ctx, c!.x, c!.y + 4, c!.r, '#3d4550');
      circle(ctx, c!.x, c!.y, c!.r, '#8e9aa8');
      circle(ctx, c!.x, c!.y, c!.r * 0.72, '#a3afbc', OUT, 0);
      break;
    case 'bigTable': {
      circle(ctx, c!.x, c!.y + 5, c!.r, '#3d4550');
      circle(ctx, c!.x, c!.y, c!.r, '#8e9aa8');
      circle(ctx, c!.x, c!.y, c!.r * 0.75, '#a3afbc', OUT, 0);
      if (button) {
        circle(ctx, button.x, button.y + 4, 22, '#6d7784');
        circle(ctx, button.x, button.y, 22, '#b9c2cc');
        circle(ctx, button.x, button.y - 3, 15, '#c51a1a');
        circle(ctx, button.x - 4, button.y - 7, 5, 'rgba(255,255,255,0.45)', OUT, 0);
      }
      break;
    }
    case 'engine': {
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 18, '#6f7883');
      rr(ctx, r!.x + 14, r!.y + 14, r!.w - 28, r!.h - 28, 12, '#8b949f');
      const glow = 0.55 + Math.sin(t / 250) * 0.2;
      circle(ctx, r!.x + r!.w / 2, r!.y + r!.h / 2, r!.w * 0.22, `rgba(255,150,40,${glow})`);
      for (let i = 0; i < 3; i++) rr(ctx, r!.x - 10, r!.y + 25 + i * 45, 14, 26, 4, '#555e69');
      break;
    }
    case 'reactorCore': {
      const pulse = 0.5 + Math.sin(t / 400) * 0.25;
      circle(ctx, c!.x, c!.y, c!.r + 10, '#39424f');
      circle(ctx, c!.x, c!.y, c!.r, '#1d6fa3');
      circle(ctx, c!.x, c!.y, c!.r * 0.6, `rgba(120,220,255,${pulse})`, OUT, 0);
      break;
    }
    case 'crates':
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 4, '#8a6a40');
      ctx.beginPath();
      ctx.moveTo(r!.x + 6, r!.y + 6);
      ctx.lineTo(r!.x + r!.w - 6, r!.y + r!.h - 6);
      ctx.moveTo(r!.x + r!.w - 6, r!.y + 6);
      ctx.lineTo(r!.x + 6, r!.y + r!.h - 6);
      ctx.strokeStyle = '#5e4526';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case 'bed':
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 6, '#e9eef3');
      rr(ctx, r!.x + r!.w - 24, r!.y + 5, 18, r!.h - 10, 5, '#ffffff', OUT, 1.5);
      break;
    case 'desk':
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 4, '#39424e');
      for (let x = r!.x + 10; x < r!.x + r!.w - 20; x += 36) rr(ctx, x, r!.y + 4, 26, r!.h - 10, 3, '#3fa9d6', OUT, 1.5);
      break;
    case 'navConsole':
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 6, '#39424e');
      rr(ctx, r!.x + 8, r!.y + 10, r!.w - 16, r!.h - 20, 4, '#46d2ff', OUT, 1.5);
      break;
    case 'chair':
      circle(ctx, c!.x, c!.y, c!.r, '#4b5563');
      circle(ctx, c!.x, c!.y, c!.r * 0.6, '#667080', OUT, 0);
      break;
    case 'adminTable': {
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 8, '#3a4452');
      ctx.globalAlpha *= 0.6 + Math.sin(t / 300) * 0.15;
      rr(ctx, r!.x + 8, r!.y + 8, r!.w - 16, r!.h - 16, 5, '#2fe07a', OUT, 0);
      ctx.globalAlpha = 1;
      break;
    }
    case 'box':
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 4, '#9aa3ad');
      rr(ctx, r!.x + 6, r!.y + 6, r!.w - 12, r!.h - 12, 3, '#b3bbc4', OUT, 1.5);
      break;
  }
}

const STATION_STYLE: Record<string, string> = {
  lights: '#f2c14e',
  reactor: '#46b1ff',
  o2: '#7ad1a8',
  comms: '#c78bff',
  cams: '#3fa9d6',
  vitals: '#ff6b6b',
  laptop: '#e8e8e8',
};

function drawStation(ctx: CanvasRenderingContext2D, s: StationDef) {
  const color = STATION_STYLE[s.kind] ?? '#c5ccd4';
  if (s.kind === 'admin' || s.kind === 'cams') return; // part of a prop
  if (s.kind === 'reactor') {
    rr(ctx, s.x - 16, s.y - 10, 32, 20, 5, '#2b3440');
    rr(ctx, s.x - 9, s.y - 6, 18, 12, 3, color, OUT, 1.5);
    return;
  }
  if (s.kind === 'laptop') {
    rr(ctx, s.x - 18, s.y - 4, 36, 14, 3, '#555');
    rr(ctx, s.x - 15, s.y - 22, 30, 18, 3, '#222');
    rr(ctx, s.x - 12, s.y - 19, 24, 12, 2, '#5bc0ff', OUT, 1);
    return;
  }
  rr(ctx, s.x - 11, s.y - 9, 22, 18, 3, '#39424e', OUT, 2);
  rr(ctx, s.x - 7, s.y - 5, 14, 10, 2, color, OUT, 1);
}

export function drawProps(ctx: CanvasRenderingContext2D, map: CompiledMap, t: number): void {
  for (const o of map.def.obstacles) drawObstacle(ctx, o, t, map.def.button);
  for (const s of map.def.stations) drawStation(ctx, s);
}

export function drawVents(ctx: CanvasRenderingContext2D, map: CompiledMap, highlight: string | null): void {
  for (const v of map.def.vents) {
    rr(ctx, v.x - 20, v.y - 12, 40, 24, 4, '#56606c', highlight === v.id ? '#ff4040' : OUT, highlight === v.id ? 3.5 : 2.5);
    ctx.strokeStyle = '#2a313b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = -12; i <= 12; i += 8) {
      ctx.moveTo(v.x + i, v.y - 7);
      ctx.lineTo(v.x + i, v.y + 7);
    }
    ctx.stroke();
  }
}

export function drawCameras(ctx: CanvasRenderingContext2D, map: CompiledMap, inUse: boolean, t: number): void {
  for (const c of map.cameras) {
    rr(ctx, c.x - 9, c.y - 7, 18, 14, 4, '#9aa3ad');
    circle(ctx, c.x, c.y, 4, '#1b1f27', OUT, 0);
    if (inUse && Math.floor(t / 500) % 2 === 0) circle(ctx, c.x + 6, c.y - 5, 3, '#ff2a2a', OUT, 0);
  }
}

export function drawDoors(ctx: CanvasRenderingContext2D, map: CompiledMap, closed: readonly string[]): void {
  for (const d of map.def.doors) {
    const { x1, y1, x2, y2 } = d.seg;
    const isClosed = closed.includes(d.id);
    ctx.lineCap = 'butt';
    if (isClosed) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = '#8c96a3';
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = '#d19a1f';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // door frames
      ctx.fillStyle = '#2b323d';
      const horiz = y1 === y2;
      ctx.fillRect(horiz ? x1 - 2 : x1 - 7, horiz ? y1 - 7 : y1 - 2, horiz ? 8 : 14, horiz ? 14 : 8);
      ctx.fillRect(horiz ? x2 - 6 : x2 - 7, horiz ? y2 - 7 : y2 - 6, horiz ? 8 : 14, horiz ? 14 : 8);
    }
  }
}

/** Yellow glow around a usable station or console. */
export function drawHighlight(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, color = '#ffe14d'): void {
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(t / 180) * 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
