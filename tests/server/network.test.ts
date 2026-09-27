import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createAppServer, type AppServer } from '../../server/server';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';

const PORT = 8799;
let server: AppServer;

beforeAll(async () => {
  server = await createAppServer({ port: PORT, dev: true, host: '127.0.0.1' });
});
afterAll(async () => {
  await server.close();
});

interface Client {
  ws: WebSocket;
  send: (msg: ClientMessage) => void;
  /** Wait for the next message of a given type (others are buffered). */
  waitFor: <K extends ServerMessage['t']>(t: K, pred?: (m: Extract<ServerMessage, { t: K }>) => boolean) => Promise<Extract<ServerMessage, { t: K }>>;
  seen: ServerMessage[];
  close: () => Promise<void>;
}

function connect(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const seen: ServerMessage[] = [];
    let waiters: { t: string; pred?: (m: never) => boolean; res: (m: ServerMessage) => void }[] = [];
    let cursor = 0;
    ws.on('message', (d) => {
      const msg = JSON.parse(d.toString()) as ServerMessage;
      seen.push(msg);
      waiters = waiters.filter((w) => {
        if (w.t === msg.t && (!w.pred || w.pred(msg as never))) {
          w.res(msg);
          return false;
        }
        return true;
      });
    });
    ws.once('open', () =>
      resolve({
        ws,
        seen,
        send: (msg) => ws.send(JSON.stringify(msg)),
        waitFor: (t, pred) => {
          for (let i = cursor; i < seen.length; i++) {
            const m = seen[i];
            if (m.t === t && (!pred || pred(m as never))) {
              cursor = i + 1;
              return Promise.resolve(m as never);
            }
          }
          cursor = seen.length;
          return new Promise((res) => waiters.push({ t, pred: pred as never, res: res as never }));
        },
        close: () =>
          new Promise<void>((r) => {
            if (ws.readyState === ws.CLOSED) return r();
            ws.once('close', () => r());
            ws.close();
          }),
      }),
    );
    ws.once('error', reject);
  });
}

async function createRoom(name = 'Host') {
  const host = await connect();
  host.send({ t: 'create', name });
  const joined = await host.waitFor('joined');
  return { host, joined };
}

describe('room server', () => {
  it('healthz counts rooms with someone connected', async () => {
    const rooms = async () =>
      ((await (await fetch(`http://127.0.0.1:${PORT}/healthz`)).json()) as { rooms: number }).rooms;
    const before = await rooms();
    const { host } = await createRoom();
    expect(await rooms()).toBe(before + 1);
    await host.close();
    await expect.poll(rooms).toBe(before);
  });

  it('rejects unknown rooms', async () => {
    const c = await connect();
    c.send({ t: 'join', code: 'ZZZZZZ', name: 'x' });
    expect((await c.waitFor('error')).message).toMatch(/not found/);
    await c.close();
  });

  it('create, join, unique colors, host-only settings', async () => {
    const { host, joined } = await createRoom();
    const guest = await connect();
    guest.send({ t: 'join', code: joined.code.toLowerCase(), name: '  Guest   Name  ' });
    const gj = await guest.waitFor('joined');
    expect(gj.code).toBe(joined.code);
    const lobby = await guest.waitFor('lobby', (m) => m.room.members.length === 2);
    const [h, g] = lobby.room.members;
    expect(h.isHost).toBe(true);
    expect(g.name).toBe('Guest Name');
    expect(h.color).not.toBe(g.color);

    guest.send({ t: 'setColor', color: h.color });
    guest.send({ t: 'setSettings', patch: { impostors: 3 } });
    host.send({ t: 'setSettings', patch: { killCooldown: 40 } });
    const after = await guest.waitFor('lobby', (m) => m.room.settings.killCooldown === 40);
    expect(after.room.members[1].color).toBe(g.color);
    expect(after.room.settings.impostors).toBe(2);
    await Promise.all([host.close(), guest.close()]);
  });

  it('non-dev rooms need 4 players; room fills at 15', async () => {
    const prodServer = await createAppServer({ port: PORT + 1, host: '127.0.0.1' });
    const ws = new WebSocket(`ws://127.0.0.1:${PORT + 1}/ws`);
    await new Promise((r) => ws.once('open', r));
    const msgs: ServerMessage[] = [];
    ws.on('message', (d) => msgs.push(JSON.parse(d.toString())));
    ws.send(JSON.stringify({ t: 'create', name: 'solo' }));
    await new Promise((r) => setTimeout(r, 50));
    ws.send(JSON.stringify({ t: 'start' }));
    await new Promise((r) => setTimeout(r, 80));
    expect(msgs.some((m) => m.t === 'error' && /at least 4/.test(m.message))).toBe(true);
    ws.close();
    await prodServer.close();

    const { host, joined } = await createRoom();
    const guests: Client[] = [];
    for (let i = 0; i < 14; i++) {
      const c = await connect();
      c.send({ t: 'join', code: joined.code, name: `g${i}` });
      await c.waitFor('joined');
      guests.push(c);
    }
    const extra = await connect();
    extra.send({ t: 'join', code: joined.code, name: 'late' });
    expect((await extra.waitFor('error')).message).toMatch(/full/);
    await Promise.all([host, extra, ...guests].map((c) => c.close()));
  });

  it('plays a game over the wire without leaking roles', async () => {
    const { host, joined } = await createRoom();
    const others: Client[] = [];
    for (let i = 0; i < 3; i++) {
      const c = await connect();
      c.send({ t: 'join', code: joined.code, name: `c${i}` });
      await c.waitFor('joined');
      others.push(c);
    }
    host.send({ t: 'devRole', role: 'impostor' });
    for (const c of others) c.send({ t: 'devRole', role: 'crewmate' });
    await new Promise((r) => setTimeout(r, 50));
    host.send({ t: 'start' });
    const hp = await host.waitFor('priv');
    expect(hp.state.role).toBe('impostor');
    const cp = await others[0].waitFor('priv');
    expect(cp.state.role).toBe('crewmate');
    const pub = await others[0].waitFor('pub');
    expect(pub.state.phase).toBe('reveal');
    await others[0].waitFor('snap');
    // Nothing a crewmate received mentions the impostor role
    expect(JSON.stringify(others[0].seen)).not.toContain('"impostor"');
    // Dev command ends the game and reveals roles
    host.send({ t: 'dev', cmd: 'win imp' });
    const over = await others[0].waitFor('pub', (m) => m.state.phase === 'gameover');
    expect(over.state.gameOver!.roles[joined.selfId]).toBe('impostor');
    await Promise.all([host, ...others].map((c) => c.close()));
  });

  it('reconnects with the session token and keeps the seat', async () => {
    const { host, joined } = await createRoom('Keeper');
    await host.close();
    await new Promise((r) => setTimeout(r, 50));
    const back = await connect();
    back.send({ t: 'join', code: joined.code, name: 'whatever', token: joined.token });
    const j2 = await back.waitFor('joined');
    expect(j2.selfId).toBe(joined.selfId);
    const lobby = await back.waitFor('lobby', (m) => m.room.members[0]?.connected === true);
    expect(lobby.room.members).toHaveLength(1);
    expect(lobby.room.members[0].name).toBe('Keeper');
    await back.close();
  });

  it('echoes pings and streams lobby snapshots with movement', async () => {
    const { host } = await createRoom();
    host.send({ t: 'ping', c: 123 });
    expect((await host.waitFor('pong')).c).toBe(123);
    const s0 = await host.waitFor('snap');
    for (let i = 1; i <= 10; i++) host.send({ t: 'input', seq: i, dx: 1, dy: 0 });
    const s1 = await host.waitFor('snap', (m) => m.ack === 10);
    expect(s1.you![0]).toBeGreaterThan(s0.you![0]);
    await host.close();
  });
});
