import { roomLabel, type CompiledMap } from '../../shared/map';

export const debugEnabled = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
export const debugState = { noFog: false, mouse: { x: 0, y: 0 } };

/** ?debug overlay for map authoring: segments, rooms, vents, stations, cameras. */
export function drawDebug(ctx: CanvasRenderingContext2D, map: CompiledMap, _t: number): void {
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.8)';
  ctx.beginPath();
  for (const s of map.moveSegs) {
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
  }
  ctx.stroke();
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ff0';
  for (const r of map.def.rooms) {
    ctx.strokeStyle = 'rgba(255,255,0,0.5)';
    for (const rc of r.rects) ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
    const c = roomLabel(r);
    ctx.fillText(r.id, c.x, c.y);
  }
  ctx.strokeStyle = 'rgba(255,80,80,0.9)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  for (const v of map.def.vents) {
    for (const l of v.links) {
      const o = map.vents.get(l)!;
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(o.x, o.y);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#7fff7f';
  for (const s of map.def.stations) ctx.fillText(s.id, s.x - 20, s.y + 22);
  ctx.strokeStyle = 'rgba(255,0,255,0.7)';
  for (const c of map.cameras) ctx.strokeRect(c.view.x, c.view.y, c.view.w, c.view.h);
  ctx.strokeStyle = 'orange';
  ctx.lineWidth = 4;
  for (const d of map.def.doors) {
    ctx.beginPath();
    ctx.moveTo(d.seg.x1, d.seg.y1);
    ctx.lineTo(d.seg.x2, d.seg.y2);
    ctx.stroke();
  }
  const m = debugState.mouse;
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.round(m.x)}, ${Math.round(m.y)} ${map.roomAt(m.x, m.y) ?? ''}`, m.x + 10, m.y - 10);
  ctx.restore();
}
