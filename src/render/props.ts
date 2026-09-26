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

function drawButton(ctx: CanvasRenderingContext2D, b: { x: number; y: number }) {
  circle(ctx, b.x, b.y + 4, 22, '#6d7784');
  circle(ctx, b.x, b.y, 22, '#b9c2cc');
  circle(ctx, b.x, b.y - 3, 15, '#c51a1a');
  circle(ctx, b.x - 4, b.y - 7, 5, 'rgba(255,255,255,0.45)', OUT, 0);
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: ObstacleDef, t: number) {
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
    // ---- MIRA HQ ----
    case 'rocket': {
      // The dropship on the Launchpad, nose up, standing on its fins.
      const { x, y, w, h } = r!;
      const cx = x + w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx, y + h - 6, w * 0.55, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * w * 0.28, y + h * 0.62);
        ctx.lineTo(cx + s * w * 0.5, y + h * 0.9);
        ctx.lineTo(cx + s * w * 0.5, y + h - 4);
        ctx.lineTo(cx + s * w * 0.26, y + h * 0.86);
        ctx.closePath();
        ctx.fillStyle = '#c62d2d';
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      rr(ctx, cx - 26, y + h - 34, 52, 26, 6, '#555d69');
      if (Math.sin(t / 120) > 0) circle(ctx, cx, y + h - 14, 10, 'rgba(255,170,60,0.55)', OUT, 0);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.3, y + h * 0.86);
      ctx.lineTo(cx - w * 0.3, y + h * 0.3);
      ctx.quadraticCurveTo(cx - w * 0.3, y + 6, cx, y);
      ctx.quadraticCurveTo(cx + w * 0.3, y + 6, cx + w * 0.3, y + h * 0.3);
      ctx.lineTo(cx + w * 0.3, y + h * 0.86);
      ctx.closePath();
      ctx.fillStyle = '#e9eef3';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#c9d2dc';
      ctx.fillRect(cx + w * 0.12, y, w * 0.2, h);
      ctx.fillStyle = '#c62d2d';
      ctx.fillRect(cx - w * 0.3, y, w * 0.6, h * 0.12);
      ctx.fillRect(cx - w * 0.3, y + h * 0.6, w * 0.6, 12);
      ctx.restore();
      for (const wy of [0.28, 0.42]) {
        circle(ctx, cx, y + h * wy, 17, '#4e7a93');
        circle(ctx, cx - 3, y + h * wy - 3, 11, '#93c9e0', OUT, 0);
      }
      break;
    }
    case 'miraReactor': {
      const { x, y, r: cr } = c!;
      circle(ctx, x, y + 8, cr + 14, '#2b323d');
      circle(ctx, x, y, cr + 14, '#3d4654');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t / 2000;
        circle(ctx, x + Math.cos(a) * (cr + 6), y + Math.sin(a) * (cr + 6), 4, '#ffd23b', OUT, 1.5);
      }
      circle(ctx, x, y, cr, '#1c2a3a');
      const pulse = 0.55 + Math.sin(t / 300) * 0.25;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, cr);
      glow.addColorStop(0, `rgba(255,250,210,${pulse + 0.2})`);
      glow.addColorStop(0.5, `rgba(255,214,90,${pulse})`);
      glow.addColorStop(1, 'rgba(255,160,40,0.1)');
      ctx.beginPath();
      ctx.arc(x, y, cr - 6, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t / 900);
      ctx.strokeStyle = 'rgba(80,50,10,0.6)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.arc(0, 0, cr * 0.55, 0, 1.1);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'labBench': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y + 6, w, h, 6, '#8a96a3');
      rr(ctx, x, y, w, h - 6, 6, '#f1f5f8');
      const colors = ['#46d2ff', '#7dff7a', '#ff7ad9', '#ffd23b'];
      for (let i = 0; i < 4; i++) {
        const bx = x + 20 + i * ((w - 40) / 3);
        rr(ctx, bx - 7, y + 10, 14, h - 30, 4, 'rgba(210,235,255,0.7)', OUT, 2);
        rr(ctx, bx - 5, y + 10 + (h - 30) * 0.45, 10, (h - 30) * 0.55 - 2, 3, colors[i], OUT, 0);
      }
      break;
    }
    case 'lockers': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y, w, h, 3, '#6d7c8f');
      const n = 5;
      for (let i = 0; i < n; i++) {
        const ly = y + 4 + i * ((h - 8) / n);
        rr(ctx, x + 4, ly, w - 8, (h - 8) / n - 4, 3, i % 2 ? '#3d8fd6' : '#4a9be0', OUT, 1.5);
        for (let k = 0; k < 3; k++) line(ctx, [x + 10, ly + 8 + k * 5, x + w - 16, ly + 8 + k * 5], '#26537d', 1.5);
        circle(ctx, x + w - 10, ly + (h - 8) / n / 2, 2.5, '#d9e3ec', OUT, 0);
      }
      break;
    }
    case 'bench': {
      const { x, y, w, h } = r!;
      rr(ctx, x + 4, y + 6, w - 8, h - 6, 3, '#4f3a26');
      rr(ctx, x, y, w, h - 6, 4, '#a0703f');
      for (let yy = y + 10; yy < y + h - 10; yy += 14) line(ctx, [x + 3, yy, x + w - 3, yy], '#7a5430', 2);
      break;
    }
    case 'medBed':
      rr(ctx, r!.x, r!.y, r!.w, r!.h, 6, '#e9eef3');
      rr(ctx, r!.x + 4, r!.y + 14, r!.w - 8, r!.h - 18, 5, '#7fc4ff', OUT, 1.5);
      rr(ctx, r!.x + 8, r!.y + 3, r!.w - 16, 12, 4, '#ffffff', OUT, 1.5);
      break;
    case 'officeDesk': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y + 6, w, h, 5, '#5b3f25');
      rr(ctx, x, y, w, h - 6, 5, '#8b6a45');
      rr(ctx, x + w * 0.35, y - 16, w * 0.3, 24, 3, '#222a33');
      rr(ctx, x + w * 0.35 + 3, y - 13, w * 0.3 - 6, 16, 2, '#5bc0ff', OUT, 0);
      rr(ctx, x + 10, y + 8, 26, 18, 2, '#f7f7f2', OUT, 1.2);
      rr(ctx, x + w - 40, y + 10, 28, 14, 2, '#f7f7f2', OUT, 1.2);
      break;
    }
    case 'planter': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y + h * 0.35, w, h * 0.65, 5, '#9a6234');
      for (let i = 0; i < 4; i++) {
        const px = x + 18 + i * ((w - 36) / 3);
        const sway = Math.sin(t / 700 + i) * 2;
        circle(ctx, px + sway, y + h * 0.3, 15, i % 2 ? '#3f9a46' : '#4fb857');
        circle(ctx, px - 7 + sway, y + h * 0.22, 8, '#6fd276', OUT, 0);
        if (i % 2 === 0) circle(ctx, px + 6 + sway, y + h * 0.2, 4, '#ff7ad9', OUT, 1.2);
      }
      break;
    }
    case 'o2Tank': {
      const { x, y, r: cr } = c!;
      circle(ctx, x, y + 4, cr + 4, '#5b6573');
      circle(ctx, x, y, cr, 'rgba(160,220,255,0.75)');
      for (let i = 0; i < 5; i++) {
        const k = ((t / 1400 + i / 5) % 1);
        circle(ctx, x - cr * 0.4 + ((i * 17) % 20) * (cr / 25), y + cr * 0.6 - k * cr * 1.2, 2 + (i % 2), 'rgba(255,255,255,0.8)', OUT, 0);
      }
      circle(ctx, x - cr * 0.35, y - cr * 0.35, cr * 0.25, 'rgba(255,255,255,0.5)', OUT, 0);
      break;
    }
    case 'vending': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y, w, h, 5, '#b0282e');
      rr(ctx, x + 6, y + 6, w * 0.62, h - 14, 3, '#dfe8ef', OUT, 1.5);
      const cols = ['#e53935', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#fdd835'];
      for (let i = 0; i < 6; i++) rr(ctx, x + 11 + (i % 3) * (w * 0.62 - 10) / 3, y + 10 + Math.floor(i / 3) * ((h - 22) / 2), 9, (h - 30) / 2, 2, cols[i], OUT, 1);
      rr(ctx, x + w * 0.72, y + 8, w * 0.2, h * 0.5, 2, '#222', OUT, 1);
      break;
    }
    case 'cafeTable': {
      const { x, y, r: cr } = c!;
      circle(ctx, x, y + 6, cr, '#3d4550');
      circle(ctx, x, y, cr, '#e8eef4');
      circle(ctx, x, y, cr * 0.78, '#cfd8e2', OUT, 0);
      break;
    }
    case 'dish': {
      const { x, y, r: cr } = c!;
      rr(ctx, x - 6, y, 12, cr + 10, 3, '#6b7480');
      ctx.save();
      ctx.translate(x, y - 6);
      ctx.rotate(Math.sin(t / 3000) * 0.3 - 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, cr, cr * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e3e9ef';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, cr * 0.6, cr * 0.48, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#a9b6c3';
      ctx.stroke();
      line(ctx, [0, 0, cr * 0.6, -cr * 0.7], '#4b5563', 3);
      circle(ctx, cr * 0.6, -cr * 0.7, 4, '#ff4a4a', OUT, 1.5);
      ctx.restore();
      break;
    }
    case 'barrels': {
      const { x, y, w, h } = r!;
      const n = Math.max(1, Math.floor(h / w));
      for (let i = 0; i < n; i++) {
        const cy = y + (i + 0.5) * (h / n);
        circle(ctx, x + w / 2, cy, w / 2, i % 2 ? '#e0a526' : '#d4892a');
        circle(ctx, x + w / 2, cy, w / 2 - 6, 'rgba(0,0,0,0)', '#8a5a14', 2);
        ctx.font = `${Math.round(w * 0.4)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#3a2508';
        ctx.fillText('☢', x + w / 2, cy + 1);
      }
      break;
    }
    case 'commsDesk': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y + 5, w, h, 5, '#2b313a');
      rr(ctx, x, y, w, h - 5, 5, '#4b5563');
      for (let i = 0; i < 3; i++) {
        const sx = x + 10 + i * ((w - 20) / 3);
        rr(ctx, sx, y + 6, (w - 20) / 3 - 8, h - 18, 3, '#06210f', OUT, 1.5);
        line(ctx, [sx + 3, y + h / 2 - 2, sx + 10, y + h / 2 - 2 - Math.sin(t / 200 + i) * 5, sx + 18, y + h / 2 - 2], '#3dff6a', 1.5);
      }
      break;
    }
    case 'railing': {
      const { x, y, w, h } = r!;
      ctx.fillStyle = '#8a99ad';
      ctx.fillRect(x, y, w, h * 0.45);
      for (let px = x + 6; px < x + w; px += 26) {
        ctx.fillStyle = OUT;
        ctx.fillRect(px - 2, y - 2, 4, h + 2);
      }
      break;
    }
    // ---- Polus ----
    case 'seats': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y, w, h, 4, '#4b5563');
      const n = Math.max(1, Math.round(h / 40));
      for (let i = 0; i < n; i++) rr(ctx, x + 3, y + 4 + i * (h / n), w - 6, h / n - 8, 4, '#c62d2d', OUT, 1.5);
      break;
    }
    case 'lava': {
      const { x, y, w, h } = r!;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.5);
      ctx.bezierCurveTo(x, y - h * 0.1, x + w * 0.45, y - h * 0.05, x + w * 0.6, y + h * 0.15);
      ctx.bezierCurveTo(x + w * 0.75, y + h * 0.25, x + w * 1.02, y - h * 0.05, x + w, y + h * 0.3);
      ctx.bezierCurveTo(x + w * 0.95, y + h * 0.6, x + w * 0.75, y + h * 0.7, x + w * 0.5, y + h);
      ctx.bezierCurveTo(x + w * 0.25, y + h * 1.1, x, y + h * 0.95, x, y + h * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#3a2a2a';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#2a1e1e';
      ctx.stroke();
      ctx.clip();
      const glow = ctx.createLinearGradient(x, y, x + w, y + h);
      glow.addColorStop(0, '#ff9a3b');
      glow.addColorStop(0.5, '#ff5a1f');
      glow.addColorStop(1, '#ffb13b');
      ctx.fillStyle = glow;
      ctx.fillRect(x + 10, y + 8, w - 20, h - 16);
      for (let i = 0; i < 7; i++) {
        const k = (t / 2400 + i / 7) % 1;
        circle(ctx, x + 20 + ((i * 97) % (w - 40)), y + h * (0.8 - k * 0.6), 4 + (1 - k) * 5, `rgba(255,230,120,${1 - k})`, OUT, 0);
      }
      ctx.restore();
      break;
    }
    case 'rock': {
      const { x, y, r: cr } = c!;
      ctx.beginPath();
      ctx.ellipse(x, y + 5, cr, cr * 0.75, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rad = cr * (0.8 + ((i * 37 + Math.round(x)) % 5) * 0.06);
        ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.8);
      }
      ctx.closePath();
      ctx.fillStyle = '#6d6478';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - cr * 0.2, y - cr * 0.35, cr * 0.5, cr * 0.25, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#f2f5fa';
      ctx.fill();
      break;
    }
    case 'tree': {
      const { x, y, r: cr } = c!;
      circle(ctx, x, y, cr + 8, '#6b4a2d');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.sin(t / 1500) * 0.05;
        circle(ctx, x + Math.cos(a) * cr * 0.55, y + Math.sin(a) * cr * 0.55, cr * 0.5, i % 2 ? '#3f7a3a' : '#4f8f45');
      }
      circle(ctx, x, y, cr * 0.55, '#5fa84f');
      break;
    }
    case 'o2Machine': {
      // Polus' oxygen plant: a big tank block with gauges, pipes and a fan.
      const { x, y, w, h } = r!;
      rr(ctx, x, y + 8, w, h, 10, '#3a4250');
      rr(ctx, x, y, w, h - 8, 10, '#8a94a3');
      rr(ctx, x + 10, y + 10, w * 0.38, h - 36, 8, '#dfe6ec', OUT, 2);
      rr(ctx, x + 18, y + 18 + (h - 52) * (0.5 + Math.sin(t / 900) * 0.3) * 0.5, w * 0.38 - 16, (h - 52) * 0.5, 5, '#46d2ff', OUT, 0);
      const fx = x + w * 0.72;
      const fy = y + (h - 8) * 0.42;
      const fr = Math.min(w, h) * 0.22;
      circle(ctx, fx, fy, fr, '#2b313a');
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(t / 150);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(fr * 0.45, 0, fr * 0.45, fr * 0.18, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#b8c2cf';
        ctx.fill();
      }
      ctx.restore();
      circle(ctx, fx, fy, fr * 0.2, '#555d69', OUT, 1.5);
      for (let i = 0; i < 3; i++) line(ctx, [x + w * 0.5, y + h - 22 - i * 9, x + w - 10, y + h - 22 - i * 9], '#5b6573', 4);
      circle(ctx, x + w - 16, y + 14, 5, Math.floor(t / 600) % 2 ? '#3fdc6c' : '#1d6b3a', OUT, 1.5);
      break;
    }
    case 'canisterRack': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y, w, h, 3, '#4b5563');
      const n = 3;
      for (let i = 0; i < n; i++) rr(ctx, x + 4 + i * ((w - 8) / n), y + 4, (w - 8) / n - 4, h - 8, 6, '#46d2ff', OUT, 1.5);
      break;
    }
    case 'boiler': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y + 6, w, h, 10, '#5b3f25');
      rr(ctx, x, y, w, h - 6, 10, '#9a6234');
      for (let i = 0; i < 3; i++) line(ctx, [x + 10, y + 14 + i * ((h - 30) / 2), x + w - 10, y + 14 + i * ((h - 30) / 2)], '#6b4020', 4);
      circle(ctx, x + w * 0.75, y + h * 0.45, 10, '#ff8a3b', OUT, 2);
      const puffK = (t / 1400) % 1;
      circle(ctx, x + w * 0.3, y - 10 - puffK * 30, 8 + puffK * 10, `rgba(240,240,240,${0.6 * (1 - puffK)})`, OUT, 0);
      break;
    }
    case 'cannon': {
      const { x, y, r: cr } = c!;
      circle(ctx, x, y + 6, cr, '#2b313a');
      circle(ctx, x, y, cr, '#4b5563');
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4 + Math.sin(t / 2000) * 0.2);
      rr(ctx, -12, -cr * 1.4, 24, cr * 1.2, 5, '#8a94a3');
      ctx.restore();
      circle(ctx, x, y, cr * 0.45, '#2b313a', OUT, 2);
      break;
    }
    case 'specimenCase': {
      const { x, y, r: cr } = c!;
      circle(ctx, x, y + 6, cr, '#3a4250');
      circle(ctx, x, y, cr, '#5b6573');
      circle(ctx, x, y, cr * 0.72, 'rgba(160,230,255,0.55)', OUT, 2);
      ctx.font = `${Math.round(cr * 0.7)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💎', x, y + Math.sin(t / 700) * 3);
      break;
    }
    case 'drillRig': {
      const { x, y, w, h } = r!;
      rr(ctx, x, y, w, h, 5, '#6b7480');
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(t / 400);
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        rr(ctx, -3, -h * 0.45, 6, h * 0.45, 2, '#b8a34a', OUT, 1.2);
      }
      ctx.restore();
      break;
    }
    case 'cabinets': {
      // A bank of electrical cabinets: top surface, then a front face of panels.
      const { x, y, w, h } = r!;
      rr(ctx, x, y, w, h, 4, '#5f6b77');
      const fy = y + h * 0.3;
      const fh = h * 0.7;
      rr(ctx, x, fy, w, fh, 3, '#8795a1');
      const n = 4;
      const pw = w / n;
      for (let i = 0; i < n; i++) {
        const px = x + i * pw + 4;
        const fuse = i >= 2;
        rr(ctx, px, fy + 6, pw - 8, fh - 12, 3, fuse ? '#2e343c' : '#b9c6cf', OUT, 1.5);
        if (fuse) {
          for (let row = 0; row < 5; row++)
            for (let col = 0; col < 2; col++) circle(ctx, px + 10 + col * (pw - 28), fy + 16 + row * ((fh - 30) / 4), 2.2, '#e0662e', OUT, 0);
          line(ctx, [px + (pw - 8) / 2, fy + 6, px + (pw - 8) / 2 + Math.sin(t / 900 + i) * 2, fy + fh - 10], '#15181c', 3);
        } else if (i === 0) {
          ctx.fillStyle = '#ffd23b';
          ctx.beginPath();
          ctx.moveTo(px + (pw - 8) / 2, fy + fh / 2 - 9);
          ctx.lineTo(px + (pw - 8) / 2 + 9, fy + fh / 2 + 7);
          ctx.lineTo(px + (pw - 8) / 2 - 9, fy + fh / 2 + 7);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
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
      return s.main ? box(s, 40, 26) : box(s, 22, 24);
    case 'transfer':
      return box(s, 30, 24);
    case 'align':
      return box(s, 24, 30);
    case 'steering':
    case 'asteroids':
      return { kind: 'ellipse', x: s.x, y: s.y, rx: 15, ry: 15 };
    case 'fuel':
      return s.main ? box(s, 30, 22) : { kind: 'ellipse', x: s.x, y: s.y, rx: 13, ry: 13 };
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
    case 'idcode':
      return box(s, 22, 28);
    case 'diagnostics':
      return box(s, 30, 34);
    case 'water':
      return s.main ? box(s, 36, 22) : box(s, 30, 22);
    case 'beverage':
      return box(s, 22, 16);
    case 'weather':
    case 'process':
    case 'artifact':
    case 'chart':
      return box(s, 30, 24);
    case 'samples':
      return box(s, 36, 22);
    case 'manifolds':
      return box(s, 32, 22);
    case 'filter':
      return box(s, 26, 26);
    case 'shields':
      return { kind: 'ellipse', x: s.x, y: s.y, rx: 15, ry: 15 };
    case 'doorlog':
      return box(s, 34, 26);
    case 'keys':
      return box(s, 26, 22);
    case 'boarding':
      return box(s, 24, 24);
    case 'telescope':
      return { kind: 'ellipse', x: s.x, y: s.y, rx: 16, ry: 16 };
    case 'canisters':
      return box(s, 26, 28);
    case 'node':
      return s.main ? box(s, 32, 22) : box(s, 22, 34);
    case 'tree':
    case 'wifi':
    case 'temperature':
      return box(s, 24, 26);
    case 'waterways':
      return { kind: 'ellipse', x: s.x, y: s.y, rx: 16, ry: 16 };
    case 'drill':
      return box(s, 28, 22);
    case 'jug':
      return s.main ? box(s, 24, 34) : box(s, 26, 26);
    case 'artifacts':
      return box(s, 30, 24);
    case 'sample':
      return box(s, 32, 22);
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
      if (s.main) {
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
      if (s.main) {
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
    case 'idcode':
      rr(ctx, x - 11, y - 14, 22, 28, 3, '#39424e');
      rr(ctx, x - 8, y - 11, 16, 6, 1, '#0d2b12', OUT, 1);
      for (let i = 0; i < 9; i++) circle(ctx, x - 5 + (i % 3) * 5, y - 1 + Math.floor(i / 3) * 5, 1.7, '#cfd6de', OUT, 0);
      break;
    case 'diagnostics': {
      rr(ctx, x - 15, y - 17, 30, 34, 4, '#39424e');
      rr(ctx, x - 11, y - 13, 22, 16, 2, '#07131f', OUT, 1);
      for (let i = 0; i < 4; i++) {
        const hgt = 3 + ((Math.floor(t / 300) + i * 3) % 5) * 2;
        rr(ctx, x - 9 + i * 5, y + 1 - hgt, 3, hgt, 0.5, '#7fe0ff', OUT, 0);
      }
      circle(ctx, x, y + 10, 4, '#3fdc6c', OUT, 1.5);
      break;
    }
    case 'water':
      if (s.main) {
        rr(ctx, x - 18, y - 4, 36, 14, 3, '#9a6234');
        for (let i = 0; i < 3; i++) line(ctx, [x - 10 + i * 10, y - 4, x - 12 + i * 10, y - 12, x - 4 + i * 10, y - 10], '#8a7a3a', 3);
      } else {
        rr(ctx, x - 11, y - 7, 18, 14, 3, '#3fa9d6');
        line(ctx, [x + 7, y - 3, x + 15, y - 9], '#3fa9d6', 4);
        line(ctx, [x - 8, y - 7, x - 4, y - 13, x + 2, y - 13, x + 5, y - 7], OUT, 2.5);
      }
      break;
    case 'beverage':
      rr(ctx, x - 11, y - 8, 22, 16, 3, '#222a33');
      for (let i = 0; i < 6; i++) rr(ctx, x - 8 + (i % 3) * 6, y - 5 + Math.floor(i / 3) * 6, 4, 4, 1, '#e8edf3', OUT, 0);
      break;
    case 'weather':
      rr(ctx, x - 15, y - 12, 30, 24, 4, '#39424e');
      circle(ctx, x - 5, y, 7, '#061a10', OUT, 1.5);
      line(ctx, [x - 5, y, x - 5 + Math.cos(t / 400) * 6, y + Math.sin(t / 400) * 6], '#3dff7a', 1.5);
      circle(ctx, x + 8, y - 4, 3, '#e53935', OUT, 1);
      circle(ctx, x + 8, y + 5, 3, '#ffd23b', OUT, 1);
      break;
    case 'samples':
      rr(ctx, x - 18, y - 11, 36, 22, 4, '#dfe6ec');
      ['#3fa34d', '#3f8cff', '#c9a36b'].forEach((c, i) => rr(ctx, x - 13 + i * 10, y - 7, 6, 14, 2, c, OUT, 1.2));
      break;
    case 'artifact':
      rr(ctx, x - 15, y - 2, 30, 14, 3, '#4b5563');
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.lineTo(x + 8, y - 6);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x - 8, y - 6);
      ctx.closePath();
      ctx.fillStyle = `rgba(110,231,255,${0.7 + Math.sin(t / 350) * 0.2})`;
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case 'process':
      rr(ctx, x - 15, y - 12, 30, 20, 3, '#222a33');
      rr(ctx, x - 12, y - 9, 24, 14, 2, '#0f2740', OUT, 1);
      rr(ctx, x - 7, y - 6, 12, 8, 1, '#f2c14e', OUT, 1);
      rr(ctx, x - 6, y + 8, 12, 4, 1, '#555d69', OUT, 1);
      break;
    case 'manifolds':
      rr(ctx, x - 16, y - 11, 32, 22, 4, '#3a4250');
      for (let i = 0; i < 10; i++) rr(ctx, x - 13 + (i % 5) * 5.4, y - 7 + Math.floor(i / 5) * 8, 4, 6, 1, i === Math.floor(t / 400) % 10 ? '#3fdc6c' : '#d5dbe2', OUT, 0.6);
      break;
    case 'filter':
      rr(ctx, x - 13, y - 13, 26, 26, 4, '#6b7480');
      for (let i = 0; i < 4; i++) line(ctx, [x - 9, y - 8 + i * 5, x + 9, y - 8 + i * 5], '#2b313a', 2);
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 6, 6, 3, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#5fae4a';
      ctx.fill();
      break;
    case 'shields': {
      circle(ctx, x, y, 15, '#1b2230');
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 9, y + Math.sin(a) * 9);
      }
      ctx.closePath();
      ctx.fillStyle = Math.floor(t / 600) % 2 ? '#e53935' : '#f4f7fb';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'chart':
      rr(ctx, x - 15, y - 12, 30, 24, 4, '#222a33');
      rr(ctx, x - 12, y - 9, 24, 18, 2, '#0b1a2e', OUT, 1);
      line(ctx, [x - 9, y + 4, x - 3, y - 3, x + 3, y + 2, x + 9, y - 5], '#46d2ff', 1.5);
      break;
    case 'doorlog':
      rr(ctx, x - 17, y - 13, 34, 26, 4, '#222a33');
      rr(ctx, x - 14, y - 10, 28, 18, 2, '#061a10', OUT, 1);
      for (let i = 0; i < 4; i++) {
        circle(ctx, x - 10, y - 7 + i * 4.2, 1.5, ['#c51111', '#132ed1', '#117f2d', '#f5f557'][(i + Math.floor(t / 900)) % 4], OUT, 0);
        line(ctx, [x - 7, y - 7 + i * 4.2, x + 10 - ((i * 5) % 8), y - 7 + i * 4.2], '#3dff6a', 1.2);
      }
      break;
    case 'keys':
      rr(ctx, x - 13, y - 11, 26, 22, 4, '#39424e');
      circle(ctx, x, y, 6, '#1b1f27', OUT, 1.5);
      rr(ctx, x - 1.5, y - 5, 3, 10, 1, '#d9c27a', OUT, 0);
      break;
    case 'boarding':
      rr(ctx, x - 12, y - 12, 24, 24, 4, '#1b2230');
      rr(ctx, x - 9, y - 9, 18, 12, 2, '#0d2b12', OUT, 1);
      for (let i = 0; i < 5; i++) rr(ctx, x - 8 + i * 3.5, y + 5, 1.8, 5, 0, '#e8edf3', OUT, 0);
      break;
    case 'telescope':
      circle(ctx, x, y, 16, '#4b5563');
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.6);
      rr(ctx, -5, -20, 10, 26, 3, '#b8c2cf', OUT, 2);
      ctx.restore();
      circle(ctx, x, y, 5, '#2b313a', OUT, 1.5);
      break;
    case 'canisters':
      rr(ctx, x - 13, y - 14, 26, 28, 4, '#39424e');
      for (const dx of [-5, 5]) rr(ctx, x + dx - 4, y - 10, 8, 20, 4, '#46d2ff', OUT, 1.2);
      break;
    case 'node':
      if (s.main) {
        rr(ctx, x - 16, y - 11, 32, 22, 4, '#1d232d');
        for (let i = 0; i < 6; i++) circle(ctx, x - 11 + (i % 3) * 11, y - 4 + Math.floor(i / 3) * 9, 3, '#3fdc6c', OUT, 1);
      } else {
        // Outdoor weather node: a mast with a spinning anemometer.
        rr(ctx, x - 4, y - 14, 8, 28, 2, '#6b7480');
        rr(ctx, x - 11, y + 8, 22, 8, 3, '#4b5563');
        ctx.save();
        ctx.translate(x, y - 16);
        ctx.rotate(t / 250);
        for (let i = 0; i < 3; i++) {
          ctx.rotate((Math.PI * 2) / 3);
          line(ctx, [0, 0, 10, 0], '#2b313a', 2);
          circle(ctx, 10, 0, 3, '#e8edf3', OUT, 1);
        }
        ctx.restore();
      }
      break;
    case 'tree':
      rr(ctx, x - 12, y - 13, 24, 26, 4, '#1f3326');
      for (let i = 0; i < 4; i++) rr(ctx, x - 9 + i * 5, y - 8 + ((i * 7) % 6), 3, 16 - ((i * 7) % 6), 1, ['#46b1ff', '#c9a36b', '#b6b6c8', '#ffd23b'][i], OUT, 0);
      break;
    case 'waterways': {
      circle(ctx, x, y, 16, '#3b3026');
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t / 1200);
      circle(ctx, 0, 0, 11, 'rgba(0,0,0,0)', '#b33a2a', 4);
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI / 3);
        line(ctx, [-11, 0, 11, 0], '#8a2c20', 3);
      }
      ctx.restore();
      break;
    }
    case 'wifi':
      rr(ctx, x - 12, y - 13, 24, 26, 4, '#1b2230');
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y + 5, 4 + i * 4, Math.PI * 1.2, Math.PI * 1.8);
        ctx.strokeStyle = '#46d2ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      break;
    case 'temperature':
      rr(ctx, x - 12, y - 13, 24, 26, 4, '#2b3342');
      rr(ctx, x - 3, y - 10, 6, 16, 3, '#e8edf3', OUT, 1.2);
      circle(ctx, x, y + 7, 4.5, '#e53935', OUT, 1.2);
      break;
    case 'drill':
      rr(ctx, x - 14, y - 11, 28, 22, 4, '#39424e');
      rr(ctx, x - 11, y - 8, 22, 16, 2, '#0d2b12', OUT, 1);
      circle(ctx, x, y, 4, Math.floor(t / 400) % 2 ? '#ffd23b' : '#6b5a1d', OUT, 1);
      break;
    case 'jug':
      if (s.main) {
        // Office water cooler
        rr(ctx, x - 12, y - 4, 24, 20, 3, '#e8edf3');
        rr(ctx, x - 8, y - 18, 16, 16, 6, 'rgba(120,200,255,0.7)', OUT, 2);
      } else {
        rr(ctx, x - 13, y - 13, 26, 26, 4, '#6b7480');
        rr(ctx, x - 5, y - 9, 10, 18, 4, 'rgba(120,200,255,0.6)', OUT, 1.5);
      }
      break;
    case 'artifacts':
      rr(ctx, x - 15, y - 12, 30, 24, 4, '#43506a');
      for (let i = 0; i < 4; i++) rr(ctx, x - 12 + (i % 2) * 13, y - 9 + Math.floor(i / 2) * 10, 11, 8, 2, '#1d2433', OUT, 1);
      break;
    case 'sample':
      rr(ctx, x - 16, y - 11, 32, 22, 4, '#dfe6ec');
      for (let i = 0; i < 5; i++) rr(ctx, x - 13 + i * 5.5, y - 7, 4, 14, 2, i === 2 ? '#e53935' : '#46d2ff', OUT, 1);
      break;
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
  /** Usable consoles (cameras, admin, vitals): station id -> icon. */
  consoles: Map<string, string>;
  /** Station currently in use range (Use button target). */
  inRange: string | null;
}

/** Yellow (task) or red (sabotage) outline that follows the prop's shape, plus a floating icon for tasks. */
/**
 * Outline for a station's mark. Cameras and admin have no prop of their own:
 * they are the desk or table next to them, so the outline wraps that instead.
 */
function markShape(map: CompiledMap, s: StationDef): Shape | null {
  const own = stationShape(s);
  if (own) return own;
  if (s.area) return { kind: 'rect', ...s.area, r: 6 };
  let best: Shape | null = null;
  let bestD = 40;
  for (const o of map.def.obstacles) {
    if (!o.rect) continue;
    const { x, y, w, h } = o.rect;
    const d = Math.hypot(Math.max(x - s.x, 0, s.x - x - w), Math.max(y - s.y, 0, s.y - y - h));
    if (d <= bestD) {
      bestD = d;
      best = { kind: 'rect', x, y, w, h, r: 6 };
    }
  }
  return best;
}

function drawMark(ctx: CanvasRenderingContext2D, s: StationDef, sh: Shape | null, t: number, color: string, near: boolean, icon: string | null): void {
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
  for (const o of map.def.obstacles) drawObstacle(ctx, o, t);
  if (map.def.button) drawButton(ctx, map.def.button);
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
    const icon = marks.tasks.get(s.id) ?? marks.consoles.get(s.id);
    if (!sab && !icon) continue;
    if (!visible(s.x, s.y)) continue;
    const near = marks.inRange === s.id;
    if (sab) drawMark(ctx, s, markShape(map, s), t, '#ff3b3b', near, '⚠️');
    else drawMark(ctx, s, markShape(map, s), t, '#ffffff', near, icon!);
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

/** Floor markings: landing pads, hazard stripes, rugs. */
export function drawDecals(ctx: CanvasRenderingContext2D, map: CompiledMap): void {
  for (const d of map.def.decals ?? []) {
    ctx.save();
    if (d.kind === 'landing') {
      circle(ctx, d.x, d.y, d.r, 'rgba(20,24,32,0.22)', OUT, 0);
      ctx.setLineDash([26, 16]);
      circle(ctx, d.x, d.y, d.r - 10, 'rgba(0,0,0,0)', '#f2c230', 8);
      ctx.setLineDash([]);
      circle(ctx, d.x, d.y, d.r * 0.55, 'rgba(0,0,0,0)', 'rgba(242,194,48,0.7)', 5);
      ctx.fillStyle = 'rgba(242,194,48,0.8)';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.save();
        ctx.translate(d.x + Math.cos(a) * d.r * 0.78, d.y + Math.sin(a) * d.r * 0.78);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-14, 6);
        ctx.lineTo(0, -8);
        ctx.lineTo(14, 6);
        ctx.lineTo(14, 14);
        ctx.lineTo(0, 0);
        ctx.lineTo(-14, 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (d.kind === 'hazard') {
      const { x, y, w, h } = d.rect;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = '#f2c230';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#1b1f27';
      for (let s = x - h * 2; s < x + w + h; s += 24) {
        ctx.beginPath();
        ctx.moveTo(s, y + h);
        ctx.lineTo(s + 12, y + h);
        ctx.lineTo(s + 12 + h, y);
        ctx.lineTo(s + h, y);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const { x, y, w, h } = d.rect;
      rr(ctx, x, y, w, h, 12, d.color, 'rgba(255,255,255,0.18)', 4);
    }
    ctx.restore();
  }
}

/** Decontamination: while the doors are shut, the chamber fills with spray. Drawn under the fog. */
export function drawDecon(ctx: CanvasRenderingContext2D, map: CompiledMap, closed: readonly string[], t: number): void {
  for (const dc of map.def.decon ?? []) {
    const room = map.rooms.get(dc.room);
    if (!room) continue;
    const r = room.rects[0];
    const on = dc.doors.some((id) => closed.includes(id));
    // Nozzles along both side walls
    for (let y = r.y + 40; y < r.y + r.h - 20; y += 70) {
      for (const x of [r.x + 7, r.x + r.w - 7]) {
        rr(ctx, x - 5, y - 8, 10, 16, 3, '#8a99ad', OUT, 1.5);
        circle(ctx, x, y, 2.5, on ? '#46d2ff' : '#3a4559', OUT, 0);
      }
    }
    if (!on) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(225,238,255,0.35)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    for (let i = 0; i < 22; i++) {
      const k = (t / 1600 + i * 0.137) % 1;
      const fromLeft = i % 2 === 0;
      const x = fromLeft ? r.x + k * r.w * 0.8 : r.x + r.w - k * r.w * 0.8;
      const y = r.y + ((i * 97) % r.h) + Math.sin(t / 300 + i) * 8;
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(x, y, 10 + k * 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Door-log sensors: posts at each wall with a faint beam across the hallway. */
export function drawSensors(ctx: CanvasRenderingContext2D, map: CompiledMap, t: number): void {
  for (const s of map.def.sensors ?? []) {
    const { x1, y1, x2, y2 } = s.seg;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t / 400) * 0.15;
    line(ctx, [x1, y1, x2, y2], '#46d2ff', 4);
    ctx.globalAlpha = 1;
    ctx.restore();
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      circle(ctx, x, y, 7, '#2b323d');
      circle(ctx, x, y, 3, '#46d2ff', OUT, 0);
    }
  }
}

export function drawDoors(ctx: CanvasRenderingContext2D, map: CompiledMap, closed: readonly string[]): void {
  for (const d of map.def.doors) {
    const { x1, y1, x2, y2 } = d.seg;
    const isClosed = closed.includes(d.id);
    ctx.lineCap = 'butt';
    if (d.auto) {
      drawAutoDoor(ctx, d.seg, isClosed);
      continue;
    }
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

/** A decontamination door: white sliding panels that meet in the middle, with a status light. */
function drawAutoDoor(ctx: CanvasRenderingContext2D, seg: { x1: number; y1: number; x2: number; y2: number }, closed: boolean): void {
  const { x1, y1, x2, y2 } = seg;
  const horiz = y1 === y2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  // Each panel slides into its wall when open.
  const reach = closed ? len / 2 : 10;
  for (const [sx, sy, dir] of [[x1, y1, 1], [x2, y2, -1]] as const) {
    const ex = sx + ux * reach * dir;
    const ey = sy + uy * reach * dir;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = '#e3eaf1';
    ctx.lineWidth = 9;
    ctx.stroke();
  }
  if (closed) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#3d8fd6';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  const lx = horiz ? x1 - 4 : x1;
  const ly = horiz ? y1 : y1 - 4;
  circle(ctx, lx, ly, 5, closed ? '#ff3b3b' : '#3fdc6c', OUT, 1.5);
  circle(ctx, horiz ? x2 + 4 : x2, horiz ? y2 : y2 + 4, 5, closed ? '#ff3b3b' : '#3fdc6c', OUT, 1.5);
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
