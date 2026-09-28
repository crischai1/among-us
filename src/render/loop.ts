import { LIGHTS_FADE_MS, LIGHTS_VISION_FACTOR, TICK_MS, VISION_BASE } from '../../shared/constants';
import { clamp, dist, lerp } from '../../shared/geom';
import { stationDistance } from '../../shared/map/build';
import { taskReady } from '../../shared/rules/tasks';
import { F_GHOST, isImpostorRole } from '../../shared/types';
import { doorSegs, stepPlayer } from '../../shared/sim/movement';
import { computeVisibility, hasLineOfSight } from '../../shared/sim/visibility';
import { moveInput } from '../input/keyboard';
import { serverNow } from '../net/clock';
import { send } from '../net/session';
import { useGame } from '../store/game';
import { useSession } from '../store/session';
import { computeNearby, sameNearby } from '../world/nearby';
import { easeAmp, jitter, moveCtx, updateEnts, WALK_RATE, world } from '../world/world';
import { drawDebug, debugEnabled, debugState } from './debug';
import { drawFog } from './fog';
import { drawHighlight, drawStationMarks, type StationMarks } from './props';
import { TASK_THEME } from '../tasks/theme';
import { drawSceneEntities, drawSceneFloor, drawSceneTop, drawTags, type Look } from './scene';
import { wallsPath } from './mapLayer';
import { drawRockGround, drawSky } from './sky';

// The running loop keeps references to render functions, so hot-swapping any
// render module would leave stale drawing code on screen: reload instead.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

/** World units visible vertically. */
const VIEW_HEIGHT = 720;
/** Badge icons for consoles, shown like task markers. */
const CONSOLE_ICON = { cams: '📹', admin: '🗺️', vitals: '💓', doorlog: '📋' } as const;

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
    updateEnts(now - jitter.delay, dt);

    const s = world.self;
    const alpha = clamp((t - lastStepAt) / TICK_MS, 0, 1);
    const sx = s.prevX + (s.x - s.prevX) * alpha + s.offX;
    const sy = s.prevY + (s.y - s.prevY) * alpha + s.offY;
    const movedPx = Math.hypot(s.x - s.prevX, s.y - s.prevY);
    s.moving = movedPx > 0.1;
    if (s.moving) s.walk += ((movedPx * dt) / TICK_MS) * WALK_RATE;
    s.amp = easeAmp(s.amp, s.moving, dt);

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
    if (world.map.def.theme.sky) {
      drawSky(ctx, W, H, camera.x, camera.y, k, t);
    } else if (world.map.def.theme.rock) {
      drawRockGround(ctx, W, H, camera.x, camera.y, k);
    } else {
      ctx.fillStyle = world.map.def.theme.void;
      ctx.fillRect(0, 0, W, H);
      drawStars(ctx, W, H, camera.x, camera.y, k);
    }
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

    const marks: StationMarks = { tasks: new Map(), sabotage: new Set(), consoles: new Map(), inRange: null };
    if (inGame && priv && pub?.phase === 'playing' && !priv.venting) {
      if (!isImpostorRole(priv.role)) {
        for (const tk of priv.tasks) if (!tk.done) marks.tasks.set(tk.stationId, taskReady(tk, now) ? TASK_THEME[tk.type].icon : '⏳');
      }
      if (!ghost && pub.sabotage) for (const id of pub.sabotage.stations) marks.sabotage.add(id);
      // Consoles work for ghosts too.
      for (const st of map.def.stations) {
        const icon = CONSOLE_ICON[st.kind as keyof typeof CONSOLE_ICON];
        // Comms sabotage knocks out cameras and admin, so they aren't usable then.
        if (icon && (st.kind === 'vitals' || !priv.commsDown)) marks.consoles.set(st.id, icon);
      }
      if (nearby.use && (nearby.use.kind === 'task' || nearby.use.kind === 'fix')) marks.inRange = nearby.use.id;
      if (nearby.use?.kind === 'console') {
        const kind = nearby.use.id;
        const st = map.def.stations.filter((x) => x.kind === kind).sort((a, b) => stationDistance(a, s.x, s.y) - stationDistance(b, s.x, s.y))[0];
        if (st) marks.inRange = st.id;
      }
    }
    drawSceneFloor(ctx, map, t, nearby.vent);
    if (nearby.use && nearby.use.kind !== 'task' && nearby.use.kind !== 'fix' && nearby.use.kind !== 'console') {
      const st = nearby.use.kind === 'button' ? map.def.button : map.stations.get(nearby.use.id);
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
    drawStationMarks(ctx, map, t, marks, visible);

    const tags = drawSceneEntities(ctx, {
      map,
      t,
      roster: list,
      self: priv?.venting
        ? null
        : { x: sx, y: sy, look: shiftedLook ?? selfLook, flags: s.flags, facing: s.facing, walk: s.walk, amp: s.amp, red: !!priv && isImpostorRole(priv.role) },
      ghostView: ghost || !inGame,
      visible,
      fade: fogOn ? (x, y) => clamp((radius - dist(s.x, s.y, x, y)) / (radius * 0.22) + 0.15, 0, 1) : undefined,
      ventHighlight: nearby.vent,
      camsInUse: !!pub?.camsInUse,
      killTarget: priv && isImpostorRole(priv.role) && now >= priv.killReadyAt ? nearby.kill : null,
      names: true,
    });
    drawTags(ctx, tags);
    if (debugEnabled) drawDebug(ctx, map, t);

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
