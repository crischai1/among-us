// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createAppServer, type AppServer } from '../../server/server';
import type { ServerMessage } from '../../shared/protocol';
import { stepPlayer } from '../../shared/sim/movement';
import { applySnap, moveCtx, world } from '../../src/world/world';

const PORT = 8802;
let server: AppServer;

beforeAll(async () => {
  // ~60 ms each way plus up to 500 ms of jitter, order preserved: stalls followed by bursts.
  server = await createAppServer({ port: PORT, host: '127.0.0.1', dev: true, simNet: { lagMs: 60, jitterMs: 500 } });
});
afterAll(async () => {
  await server.close();
});

describe('movement over a bad connection', () => {
  it('client prediction never gets yanked back, and ends exactly where the server says', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    await new Promise((r) => ws.once('open', r));
    const corrections: number[] = [];
    let lastYou: [number, number] | null = null;
    ws.on('message', (d) => {
      const msg = JSON.parse(d.toString()) as ServerMessage;
      if (msg.t !== 'snap') return;
      const wasReady = world.self.ready;
      const bx = world.self.x;
      const by = world.self.y;
      applySnap(msg);
      if (wasReady) corrections.push(Math.hypot(world.self.x - bx, world.self.y - by));
      lastYou = msg.you ? [msg.you[0], msg.you[1]] : null;
    });
    ws.send(JSON.stringify({ t: 'create', name: 'laggy' }));
    while (!world.self.ready) await new Promise((r) => setTimeout(r, 20));

    // Walk a route (right, down, left, up) for ~3 s, predicting locally at 30 Hz.
    const route: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 0], [-1, -1], [0, -1]];
    let seq = 0;
    const start = Date.now();
    await new Promise<void>((done) => {
      const id = setInterval(() => {
        const elapsed = Date.now() - start;
        if (elapsed > 3000) {
          clearInterval(id);
          return done();
        }
        const [dx, dy] = route[Math.floor(elapsed / 500) % route.length];
        seq++;
        ws.send(JSON.stringify({ t: 'input', seq, dx, dy }));
        world.pending.push({ seq, dx, dy });
        world.self.prevX = world.self.x;
        world.self.prevY = world.self.y;
        stepPlayer(world.self, dx, dy, moveCtx());
      }, 1000 / 30);
    });
    // Let the backlog drain.
    await new Promise((r) => setTimeout(r, 1500));
    ws.close();

    expect(seq).toBeGreaterThan(70);
    expect(corrections.length).toBeGreaterThan(20);
    // Deterministic prediction + no dropped inputs => no visible corrections at all.
    expect(Math.max(...corrections)).toBeLessThan(0.5);
    expect(world.pending).toHaveLength(0);
    expect(lastYou![0]).toBeCloseTo(world.self.x, 2);
    expect(lastYou![1]).toBeCloseTo(world.self.y, 2);
  }, 10_000);
});
