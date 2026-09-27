import type { Server } from 'node:http';
import { nanoid } from 'nanoid';
import { WebSocketServer, type WebSocket } from 'ws';
import { MAX_PLAYERS, TICK_MS } from '../shared/constants';
import type { ClientMessage } from '../shared/protocol';
import { createHttpServer } from './http';
import { makeRoomCode, sendWs, ServerRoom, type Member } from './room';

export interface AppServer {
  http: Server;
  wss: WebSocketServer;
  rooms: Map<string, ServerRoom>;
  close(): Promise<void>;
}

export interface AppServerOptions {
  port: number;
  dev?: boolean;
  distDir?: string;
  host?: string;
  /** Dev only: redirect page requests to the Vite dev server on this port. */
  devClientPort?: number;
  /** Dev/test only: simulate a bad connection (one-way delay plus random jitter, order preserved). */
  simNet?: { lagMs: number; jitterMs: number };
}

/**
 * Delay a stream of callbacks by lag + random jitter without reordering, like
 * TCP on bad wifi. A single FIFO queue guarantees order (separate timers don't).
 */
function laggy(sim: { lagMs: number; jitterMs: number }) {
  const q: { at: number; fn: () => void }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pump = () => {
    timer = null;
    while (q.length && q[0].at <= Date.now()) q.shift()!.fn();
    if (q.length) timer = setTimeout(pump, q[0].at - Date.now());
  };
  return (fn: () => void) => {
    const prev = q.length ? q[q.length - 1].at : 0;
    const at = Math.max(prev, Date.now() + sim.lagMs + Math.random() * sim.jitterMs);
    q.push({ at, fn });
    if (!timer) timer = setTimeout(pump, at - Date.now());
  };
}

/** HTTP (static client) and WebSocket (/ws) on one port. */
export function createAppServer(opts: AppServerOptions): Promise<AppServer> {
  const http = createHttpServer(opts.distDir ?? 'dist', opts.devClientPort, () => ({
    rooms: [...rooms.values()].filter((r) => [...r.members.values()].some((m) => m.connected)).length,
  }));
  const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 8 * 1024 });
  const rooms = new Map<string, ServerRoom>();
  const alive = new WeakMap<WebSocket, boolean>();

  const uniqueCode = () => {
    let code = makeRoomCode();
    while (rooms.has(code)) code = makeRoomCode();
    return code;
  };

  wss.on('connection', (ws) => {
    const sim = opts.simNet;
    if (sim) {
      const out = laggy(sim);
      const rawSend = ws.send.bind(ws);
      ws.send = ((data: string) => out(() => ws.readyState === ws.OPEN && rawSend(data))) as typeof ws.send;
    }
    const inbound = sim ? laggy(sim) : (fn: () => void) => fn();
    let room: ServerRoom | null = null;
    let member: Member | null = null;
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));

    const joinedMsg = () => {
      sendWs(ws, { t: 'joined', selfId: member!.id, token: member!.token, code: room!.code });
      sendWs(ws, { t: 'lobby', room: room!.roomState() });
    };

    ws.on('message', (data) => inbound(() => handleMessage(data)));
    const handleMessage = (data: import('ws').RawData) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      const now = Date.now();

      if (msg.t === 'ping') {
        sendWs(ws, { t: 'pong', c: msg.c, s: now });
        return;
      }
      if (msg.t === 'create') {
        if (member) return;
        room = new ServerRoom(uniqueCode(), !!opts.dev);
        rooms.set(room.code, room);
        member = room.addMember(nanoid(10), nanoid(), msg.name, ws, now);
        joinedMsg();
        return;
      }
      if (msg.t === 'join') {
        if (member) return;
        const target = rooms.get(String(msg.code ?? '').trim().toUpperCase());
        if (!target) return sendWs(ws, { t: 'error', message: 'Room not found' });
        const existing = msg.token ? [...target.members.values()].find((m) => m.token === msg.token) : undefined;
        if (existing) {
          room = target;
          member = existing;
          target.rebind(existing, ws);
          joinedMsg();
          return;
        }
        if (target.game) return sendWs(ws, { t: 'error', message: 'Game already in progress' });
        if (target.memberCount >= MAX_PLAYERS) return sendWs(ws, { t: 'error', message: 'Room is full' });
        room = target;
        member = target.addMember(nanoid(10), nanoid(), msg.name, ws, now);
        joinedMsg();
        return;
      }
      if (!room || !member) return;
      if (msg.t === 'leave') {
        room.removeMember(member.id);
        member = null;
        ws.close();
        return;
      }
      room.handle(member, msg, now);
    };

    ws.on('close', () => {
      if (room && member && member.ws === ws) room.disconnect(ws, Date.now());
    });
  });

  const tick = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      room.tick(now);
      if (room.memberCount === 0) rooms.delete(code);
    }
  }, TICK_MS);

  // Keep connections alive through proxies and drop dead sockets.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, 20_000);

  return new Promise((resolveServer) => {
    http.listen(opts.port, opts.host ?? '0.0.0.0', () => {
      resolveServer({
        http,
        wss,
        rooms,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(tick);
            clearInterval(heartbeat);
            for (const c of wss.clients) c.terminate();
            wss.close(() => http.close(() => done()));
          }),
      });
    });
  });
}
