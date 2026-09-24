import { INTERP_DELAY_MS, LIGHTS_FADE_MS, LIGHTS_VISION_FACTOR, TICK_MS, VISION_BASE } from '../../shared/constants';
import { clamp, dist, lerp } from '../../shared/geom';
import { CRITICAL_SABOTAGES, F_GHOST, isImpostorRole } from '../../shared/types';
import { doorSegs, stepPlayer } from '../../shared/sim/movement';
import { computeVisibility, hasLineOfSight } from '../../shared/sim/visibility';
import { moveInput } from '../input/keyboard';
import { serverNow } from '../net/clock';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { computeNearby, sameNearby } from '../world/nearby';
import { moveCtx, updateEnts, world } from '../world/world';
import { drawDebug, debugEnabled, debugState } from './debug';
import { drawFog } from './fog';
import { drawHighlight } from './props';
import { drawSceneEntities, drawSceneFloor, drawSceneTop, drawTags, type Look } from './scene';
import { VOID, wallsPath } from './mapLayer';

/** World units visible vertically. */
const VIEW_HEIGHT = 720;

export const camera = { x: 0, y: 0, zoom: 1, dpr: 1 };

let lastSentMoving = false;

/** Whether local movement is currently suppressed. */
function frozen(): boolean {
  const room = useSession.getState().room;
  const g = useGame.getState();
  const o = g.overlay;
  if (o && o.kind !== 'map') return true;
  if (!room?.inGame) return false;
  if (!g.pub || g.pub.phase !== 'playing' || g.meetingSplash || g.killedByColor !== null) return true;
  if (g.priv?.venting || g.priv?.console) return true;
  return false;
}

function stepLocal(): void {
  const s = world.self;
  if (!s.ready) return;
  const { dx, dy } = frozen() ? { dx: 0, dy: 0 } : moveInput();
  s.prevX = s.x;
  s.prevY = s.y;
  const moving = dx !== 0 || dy !== 0;
  if (!moving && !lastSentMoving) return;
  lastSentMoving = moving;
  const seq = ++world.seq;
  send({ t: 'input', seq, dx, dy });
  world.pending.push({ seq, dx, dy });
  stepPlayer(s, dx, dy, moveCtx());
  if (dx) s.facing = dx > 0 ? 1 : -1;
}

export function roster(): Look[] {
  const room = useSession.getState().room;
  const pub = useGame.getState().pub;
  if (room?.inGame && pub) return pub.players;
  return room?.members ?? [];
}

export function visionRadius(now: number): number {
  const { priv, pub } = useGame.getState();
  const settings = useSession.getState().room?.settings;
  if (!priv || !settings) return VISION_BASE;
  if (isImpostorRole(priv.role)) return settings.impostorVision * VISION_BASE;
  let r = settings.crewVision * VISION_BASE;
  if (pub?.sabotage?.kind === 'lights') {
    const t = clamp((now - pub.sabotage.startedAt) / LIGHTS_FADE_MS, 0, 1);
    r *= lerp(1, LIGHTS_VISION_FACTOR, t);
  }
  return r;
}

let polyCache: { key: string; poly: { x: number; y: number }[] } | null = null;

export function startLoop(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!;
  let raf = 0;
  let last = performance.now();

  // Simulation runs on a timer, independent of frame rate (rAF pauses in hidden tabs).
  let acc = 0;
  let simLast = performance.now();
  let lastStepAt = simLast;
  let nearbyAt = 0;
  const sim = setInterval(() => {
    const now = performance.now();
    acc += Math.min(250, now - simLast);
    simLast = now;
    while (acc >= TICK_MS) {
      acc -= TICK_MS;
      stepLocal();
      lastStepAt = now;
    }
    if (now >= nearbyAt) {
      nearbyAt = now + 100;
      const n = computeNearby();
      if (!sameNearby(n, useGame.getState().nearby)) useGame.getState().set({ nearby: n });
    }
  }, 8);

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(250, t - last);
    last = t;
    const now = serverNow();
    updateEnts(now - INTERP_DELAY_MS, dt);

    const s = world.self;
    const alpha = clamp((t - lastStepAt) / TICK_MS, 0, 1);
    const sx = s.prevX + (s.x - s.prevX) * alpha + s.offX;
    const sy = s.prevY + (s.y - s.prevY) * alpha + s.offY;
    const movedPx = Math.hypot(s.x - s.prevX, s.y - s.prevY);
    s.moving = movedPx > 0.1;
    if (s.moving) s.walk += (movedPx * dt) / TICK_MS * 0.09;

    // Size
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const zoom = Math.max(0.55, ch / VIEW_HEIGHT);
    camera.x = sx;
    camera.y = sy - 16;
    camera.zoom = zoom;
    camera.dpr = dpr;
    const k = zoom * dpr;
    const W = canvas.width;
    const H = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = VOID;
    ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, H, camera.x, camera.y, k);
    if (!s.ready) return;
    ctx.setTransform(k, 0, 0, k, W / 2 - camera.x * k, H / 2 - camera.y * k);

    const room = useSession.getState().room;
    const selfId = useSession.getState().selfId;
    const { pub, priv, nearby } = useGame.getState();
    const inGame = !!room?.inGame && !!pub;
    const ghost = (s.flags & F_GHOST) !== 0;
    const list = roster();
    const selfIdx = list.findIndex((p) => 'id' in p && (p as { id: string }).id === selfId);
    const selfLook = list[selfIdx] ?? { name: '', color: 0 };
    const shiftedLook = priv?.shift?.as ? list.find((p) => (p as { id?: string }).id === priv.shift!.as) : null;
    const map = world.map;
    const fogOn = inGame && !ghost && !(debugEnabled && debugState.noFog);
    const radius = fogOn ? visionRadius(now) : Infinity;
    const doors = doorSegs(map, world.closedDoors);
    const visible = (x: number, y: number) => {
      if (!fogOn) return true;
      const d = dist(s.x, s.y, x, y);
      if (d > radius + 30) return false;
      return hasLineOfSight(s.x, s.y, x, y - 12, map.visionGrid, doors) || hasLineOfSight(s.x, s.y, x, y - 34, map.visionGrid, doors);
    };

    drawSceneFloor(ctx, map, t, nearby.vent);
    if (nearby.use) {
      const st = nearby.use.kind === 'button' ? map.def.button : nearby.use.kind === 'console' ? map.def.stations.find((x) => x.kind === nearby.use!.id) : map.stations.get(nearby.use.id);
      if (st) drawHighlight(ctx, st.x, st.y, nearby.use.kind === 'button' ? 30 : 22, t);
    }

    if (fogOn) {
      const key = `${Math.round(s.x)},${Math.round(s.y)},${Math.round(radius)},${world.closedDoors.join()}`;
      if (!polyCache || polyCache.key !== key) {
        polyCache = { key, poly: computeVisibility(s.x, s.y - 10, radius, map.visionGrid, doors) };
      }
      const ox = W / 2 - camera.x * k;
      const oy = H / 2 - camera.y * k;
      const poly = polyCache.poly.map((p) => ({ x: p.x * k + ox + (sx - s.x) * k, y: p.y * k + oy + (sy - s.y) * k }));
      drawFog(ctx, poly, sx * k + ox, (sy - 10) * k + oy, radius * k);
    }

    drawSceneTop(ctx, { map, t, closedDoors: world.closedDoors, camsInUse: !!pub?.camsInUse });
    if (fogOn) {
      // Dim walls beyond vision
      const g = ctx.createRadialGradient(sx, sy, radius * 0.85, sx, sy, radius * 1.25);
      g.addColorStop(0, 'rgba(4,6,10,0)');
      g.addColorStop(1, 'rgba(4,6,10,0.72)');
      ctx.save();
      ctx.clip(wallsPath(map));
      ctx.fillStyle = g;
      ctx.fillRect(camera.x - W / k, camera.y - H / k, (2 * W) / k, (2 * H) / k);
      ctx.restore();
    }

    const tags = drawSceneEntities(ctx, {
      map,
      t,
      roster: list,
      self: priv?.venting
        ? null
        : { x: sx, y: sy, look: shiftedLook ?? selfLook, flags: s.flags, facing: s.facing, walk: s.walk, moving: s.moving, red: !!priv && isImpostorRole(priv.role) },
      ghostView: ghost || !inGame,
      visible,
      fade: fogOn ? (x, y) => clamp((radius - dist(s.x, s.y, x, y)) / (radius * 0.22) + 0.15, 0, 1) : undefined,
      ventHighlight: nearby.vent,
      camsInUse: !!pub?.camsInUse,
      names: true,
    });
    drawTags(ctx, tags);
    if (debugEnabled) drawDebug(ctx, map, t);

    // Critical sabotage alarm
    if (inGame && pub?.sabotage && CRITICAL_SABOTAGES.includes(pub.sabotage.kind) && pub.phase === 'playing') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const a = 0.12 + Math.sin(t / 220) * 0.1;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(255,0,0,0)');
      g.addColorStop(1, `rgba(255,0,0,${a + 0.25})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    clearInterval(sim);
  };
}

const stars = Array.from({ length: 160 }, (_, i) => ({ x: (i * 7919) % 2000, y: (i * 104729) % 2000, s: 0.5 + ((i * 31) % 10) / 10 }));

function drawStars(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, k: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const st of stars) {
    const x = (((st.x - cx * 0.1 * st.s) * k * 0.6) % W + W) % W;
    const y = (((st.y - cy * 0.1 * st.s) * k * 0.6) % H + H) % H;
    ctx.fillRect(x, y, st.s * 1.6, st.s * 1.6);
  }
}
