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

type Shape = { kind: 'rect'; x: number; y: number; w: number; h: number; r: number } | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number };

const box = (s: StationDef, w: number, h: number, r = 4): Shape => ({ kind: 'rect', x: s.x - w / 2, y: s.y - h / 2, w, h, r });

/** Footprint of each station prop: used for drawing and for the task outline. */
function stationShape(s: StationDef): Shape | null {
  switch (s.kind) {
    case 'wires':
    case 'lights':
      return box(s, 26, 30);
    case 'swipe':
      return box(s, 26, 18);
    case 'calibrate':
      return box(s, 34, 22);
    case 'divert':
      return s.room === 'electrical' ? box(s, 40, 26) : box(s, 22, 24);
    case 'transfer':
      return box(s, 30, 24);
    case 'align':
      return box(s, 24, 30);
    case 'steering':
    case 'asteroids':
      return { kind: 'ellipse', x: s.x, y: s.y, rx: 15, ry: 15 };
    case 'fuel':
      return s.room === 'storage' ? box(s, 30, 22) : { kind: 'ellipse', x: s.x, y: s.y, rx: 13, ry: 13 };
    case 'garbage':
      return box(s, 28, 32);
    case 'scan':
      return { kind: 'ellipse', x: s.x, y: s.y, rx: 26, ry: 14 };
    case 'simon':
      return box(s, 28, 28);
    case 'reactor':
      return box(s, 32, 22, 5);
    case 'o2':
      return box(s, 20, 26);
    case 'comms':
      return box(s, 32, 22);
    case 'vitals':
      return box(s, 28, 22);
    case 'laptop':
      return box(s, 36, 30);
    default:
      return null; // cams/admin are part of larger props
  }
}

function shapePath(ctx: CanvasRenderingContext2D, sh: Shape, pad = 0): void {
  ctx.beginPath();
  if (sh.kind === 'rect') ctx.roundRect(sh.x - pad, sh.y - pad, sh.w + pad * 2, sh.h + pad * 2, sh.r + pad);
  else ctx.ellipse(sh.x, sh.y, sh.rx + pad, sh.ry + pad, 0, 0, Math.PI * 2);
}

function line(ctx: CanvasRenderingContext2D, pts: number[], color: string, w = 2): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** Each station kind gets its own look so tasks are recognisable at a glance. */
function drawStation(ctx: CanvasRenderingContext2D, s: StationDef, t: number) {
  const sh = stationShape(s);
  if (!sh) return;
  const { x, y } = s;
  switch (s.kind) {
    case 'wires': {
      rr(ctx, x - 13, y - 15, 26, 30, 3, '#8d96a2');
      rr(ctx, x - 9, y - 11, 18, 22, 2, '#2b313a', OUT, 1.5);
      ['#d55e00', '#0072b2', '#f0e442'].forEach((c, i) => line(ctx, [x - 6 + i * 6, y - 9, x - 6 + i * 6 + (i - 1) * 2, y + 2, x - 5 + i * 5, y + 8], c, 2.4));
      break;
    }
    case 'swipe':
      rr(ctx, x - 13, y - 9, 26, 18, 4, '#3d4552');
      rr(ctx, x - 10, y - 2, 20, 4, 1, '#111', OUT, 1);
      circle(ctx, x + 8, y - 5, 2.4, '#3dff6a', OUT, 0);
      break;
    case 'calibrate':
      rr(ctx, x - 17, y - 11, 34, 22, 4, '#39424e');
      ['#ffe135', '#2d9bff', '#3dff8a'].forEach((c, i) => {
        circle(ctx, x - 10 + i * 10, y, 4.5, '#1b1f27', OUT, 1.5);
        const a = t / (300 + i * 120);
        line(ctx, [x - 10 + i * 10, y, x - 10 + i * 10 + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5], c, 1.8);
      });
      break;
    case 'divert':
      if (s.room === 'electrical') {
        rr(ctx, x - 20, y - 13, 40, 26, 4, '#39424e');
        for (let i = 0; i < 6; i++) {
          rr(ctx, x - 16 + i * 6, y - 9, 3, 18, 1, '#111', OUT, 0.8);
          rr(ctx, x - 16 + i * 6, y - 9 + ((i * 5) % 12), 3, 18 - ((i * 5) % 12), 1, '#3dd0ff', OUT, 0);
        }
      } else {
        rr(ctx, x - 11, y - 12, 22, 24, 4, '#4a5260');
        ctx.fillStyle = '#ffd23b';
        ctx.beginPath();
        ctx.moveTo(x + 2, y - 9);
        ctx.lineTo(x - 5, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.lineTo(x - 2, y + 9);
        ctx.lineTo(x + 5, y - 2);
        ctx.lineTo(x, y - 2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'transfer':
      rr(ctx, x - 15, y - 12, 30, 20, 3, '#2b313a');
      rr(ctx, x - 12, y - 9, 24, 14, 2, '#1b5fa8', OUT, 1);
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 6);
      ctx.lineTo(x + 4, y - 6);
      ctx.lineTo(x + 4, y - 1);
      ctx.lineTo(x + 7, y - 1);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x - 7, y - 1);
      ctx.lineTo(x - 4, y - 1);
      ctx.closePath();
      ctx.fill();
      rr(ctx, x - 9, y + 8, 18, 4, 1, '#555d69', OUT, 1);
      break;
    case 'align':
      rr(ctx, x - 12, y - 15, 24, 30, 4, '#4a5260');
      ctx.beginPath();
      ctx.arc(x + 14, y, 16, Math.PI * 0.75, Math.PI * 1.25);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 4;
      ctx.stroke();
      rr(ctx, x - 6, y - 4 + Math.sin(t / 700) * 6, 10, 7, 2, '#ff8a3b', OUT, 1.2);
      break;
    case 'steering':
      circle(ctx, x, y, 15, '#0e2a3a');
      circle(ctx, x, y, 9, 'rgba(47,166,214,0.25)', '#2fa6d6', 1.5);
      line(ctx, [x - 13, y, x + 13, y], '#2fa6d6', 1.2);
      line(ctx, [x, y - 13, x, y + 13], '#2fa6d6', 1.2);
      circle(ctx, x + 4, y - 3, 3, '#ffd23b', OUT, 0);
      break;
    case 'fuel':
      if (s.room === 'storage') {
        for (const dx of [-8, 8]) {
          rr(ctx, x + dx - 6, y - 8, 12, 18, 2, '#c62d2d');
          rr(ctx, x + dx + 1, y - 12, 4, 5, 1, '#888', OUT, 1.2);
        }
      } else {
        circle(ctx, x, y, 13, '#555d69');
        circle(ctx, x, y, 7, '#e0b72a', OUT, 1.8);
      }
      break;
    case 'asteroids':
      circle(ctx, x, y, 15, '#07131f');
      circle(ctx, x, y, 8, 'rgba(0,0,0,0)', '#4dff6a', 1.5);
      line(ctx, [x - 12, y, x - 4, y], '#4dff6a', 1.5);
      line(ctx, [x + 4, y, x + 12, y], '#4dff6a', 1.5);
      circle(ctx, x + 6 * Math.cos(t / 500), y + 6 * Math.sin(t / 700), 2.2, '#b884ff', OUT, 0);
      break;
    case 'garbage':
      rr(ctx, x - 14, y - 16, 28, 32, 3, '#6b7480');
      rr(ctx, x - 10, y - 6, 20, 18, 2, '#2b313a', OUT, 1.2);
      line(ctx, [x + 12, y - 12, x + 12, y + 6], '#111', 3);
      circle(ctx, x + 12, y - 12, 4, '#d23b3b', OUT, 1.5);
      break;
    case 'scan': {
      const k = (Math.sin(t / 400) + 1) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, 26, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1c6b5a';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y, 17, 9, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(65,255,122,${0.4 + k * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'simon':
      rr(ctx, x - 14, y - 14, 28, 28, 4, '#2b313a');
      for (let i = 0; i < 9; i++) {
        const lit = Math.floor(t / 500) % 9 === i;
        rr(ctx, x - 10 + (i % 3) * 7, y - 10 + Math.floor(i / 3) * 7, 6, 6, 1, lit ? '#4bb4ff' : '#5a6370', OUT, 0.6);
      }
      break;
    case 'lights':
      rr(ctx, x - 13, y - 15, 26, 30, 3, '#b8a34a');
      for (let i = 0; i < 3; i++) rr(ctx, x - 9 + i * 7, y - 6, 5, 12, 1, '#2b313a', OUT, 1);
      break;
    case 'reactor':
      rr(ctx, x - 16, y - 11, 32, 22, 5, '#2b3440');
      rr(ctx, x - 9, y - 7, 18, 14, 3, '#46b1ff', OUT, 1.5);
      break;
    case 'o2':
      rr(ctx, x - 10, y - 13, 20, 26, 3, '#39424e');
      for (let i = 0; i < 9; i++) circle(ctx, x - 5 + (i % 3) * 5, y - 5 + Math.floor(i / 3) * 5, 1.6, '#cfd6de', OUT, 0);
      rr(ctx, x - 7, y - 11, 14, 4, 1, '#0d2b12', OUT, 0.8);
      break;
    case 'comms':
      rr(ctx, x - 16, y - 11, 32, 22, 4, '#39424e');
      circle(ctx, x - 6, y, 7, '#8d97a3', OUT, 1.5);
      line(ctx, [x - 6, y, x - 2, y - 5], '#ff4a4a', 2);
      line(ctx, [x + 4, y + 3, x + 7, y - 4, x + 10, y + 4, x + 13, y - 2], '#c78bff', 1.5);
      break;
    case 'vitals': {
      rr(ctx, x - 14, y - 11, 28, 22, 3, '#2b313a');
      rr(ctx, x - 11, y - 8, 22, 16, 2, '#06210f', OUT, 1);
      line(ctx, [x - 10, y, x - 4, y, x - 2, y - 5, x + 1, y + 5, x + 3, y, x + 10, y], '#3dff6a', 1.5);
      break;
    }
    case 'laptop':
      rr(ctx, x - 18, y - 4, 36, 14, 3, '#555');
      rr(ctx, x - 15, y - 22, 30, 18, 3, '#222');
      rr(ctx, x - 12, y - 19, 24, 12, 2, '#5bc0ff', OUT, 1);
      break;
  }
}

export interface StationMarks {
  /** Stations of the viewer's unfinished tasks. */
  tasks: Map<string, string>;
  /** Stations of the active sabotage (viewer alive). */
  sabotage: Set<string>;
  /** Station currently in use range (Use button target). */
  inRange: string | null;
}

/** Yellow (task) or red (sabotage) outline that follows the prop's shape, plus a floating icon for tasks. */
function drawMark(ctx: CanvasRenderingContext2D, s: StationDef, t: number, color: string, near: boolean, icon: string | null): void {
  const sh = stationShape(s);
  if (!sh) return;
  ctx.save();
  ctx.globalAlpha *= near ? 1 : 0.6 + Math.sin(t / 260) * 0.35;
  ctx.shadowColor = color;
  ctx.shadowBlur = near ? 18 : 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = near ? 5 : 3.5;
  shapePath(ctx, sh, 4);
  ctx.stroke();
  ctx.restore();
  if (!icon) return;
  const top = sh.kind === 'rect' ? sh.y : sh.y - sh.ry;
  const by = top - 26 + Math.sin(t / 350 + s.x) * 3;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(s.x - 6, by + 12);
  ctx.lineTo(s.x + 6, by + 12);
  ctx.lineTo(s.x, by + 20);
  ctx.closePath();
  ctx.fillStyle = OUT;
  ctx.fill();
  circle(ctx, s.x, by, 15, near ? color : '#eef2f7', OUT, 2.5);
  ctx.font = '17px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, s.x, by + 1);
  ctx.restore();
}

export function drawProps(ctx: CanvasRenderingContext2D, map: CompiledMap, t: number): void {
  for (const o of map.def.obstacles) drawObstacle(ctx, o, t, map.def.button);
  for (const s of map.def.stations) drawStation(ctx, s, t);
}

/** Outlines and icon badges; drawn above walls so badges on wall-mounted stations aren't hidden. */
export function drawStationMarks(
  ctx: CanvasRenderingContext2D,
  map: CompiledMap,
  t: number,
  marks: StationMarks,
  visible: (x: number, y: number) => boolean,
): void {
  for (const s of map.def.stations) {
    const sab = marks.sabotage.has(s.id);
    if (!sab && !marks.tasks.has(s.id)) continue;
    if (!visible(s.x, s.y)) continue;
    if (sab) drawMark(ctx, s, t, '#ff3b3b', marks.inRange === s.id, '⚠️');
    else drawMark(ctx, s, t, '#ffffff', marks.inRange === s.id, marks.tasks.get(s.id)!);
  }
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
export function drawHighlight(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, color = '#ffffff'): void {
  ctx.save();
  ctx.globalAlpha = 0.55 + Math.sin(t / 180) * 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
