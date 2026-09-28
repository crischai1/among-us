import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { botLine, cleanLine, llmLine, type ChatContext } from '../../server/bots/chat';
import { navFor } from '../../server/bots/nav';
import { ServerRoom } from '../../server/room';
import { TICK_MS, USE_RANGE } from '../../shared/constants';
import { getMap, spawnPoint } from '../../shared/map';
import { stationDistance } from '../../shared/map/build';
import type { MapId } from '../../shared/settings';

const fakeWs = { readyState: 3, OPEN: 1, send() {}, close() {} } as unknown as WebSocket;

describe('bot navigation', () => {
  for (const id of ['skeld', 'mira', 'polus'] as MapId[]) {
    it(`reaches every station on ${id}`, () => {
      const map = getMap(id);
      const nav = navFor(map);
      const sp = spawnPoint(map.def, 0, 10);
      const missing: string[] = [];
      for (const st of map.def.stations) {
        const path = nav.findPath(sp.x, sp.y, { key: st.id, x: st.x, y: st.y, range: USE_RANGE, dist: (x, y) => stationDistance(st, x, y) });
        if (!path) missing.push(st.id);
      }
      expect(missing).toEqual([]);
    });
  }
});

describe('bots in a room', () => {
  for (const map of ['skeld', 'mira', 'polus'] as MapId[]) {
    it(`play a whole game on ${map}`, () => {
      const room = new ServerRoom('TEST', false);
      let now = 1_000_000;
      const host = room.addMember('h', 't', 'Host', fakeWs, now);
      room.settings = { ...room.settings, map, impostors: 1, discussionTime: 5, votingTime: 30, killCooldown: 15 };
      for (let i = 0; i < 7; i++) expect(room.addBot()).not.toBeNull();
      expect(room.roomState().members.filter((m) => m.bot)).toHaveLength(7);
      expect(room.start(host, now)).toBe(true);
      const g = room.game!;

      let meetings = 0;
      let lastPhase = g.phase;
      let maxDone = 0;
      const badVotes: string[] = [];
      // Movement quality: how often a walking bot turns straight back on itself (jitter).
      const prev = new Map<string, { x: number; y: number; dx: number; dy: number }>();
      let steps = 0;
      let reversals = 0;
      const end = now + 20 * 60_000;
      while (room.game && now < end) {
        now += TICK_MS;
        room.tick(now);
        if (g.phase !== lastPhase) {
          if (g.phase === 'meeting') meetings++;
          lastPhase = g.phase;
        }
        maxDone = Math.max(maxDone, g.taskProgress().done);
        for (const p of g.players) {
          if (p.id === host.id) continue;
          const q = prev.get(p.id);
          const dx = q ? Math.sign(Math.round(p.x - q.x)) : 0;
          const dy = q ? Math.sign(Math.round(p.y - q.y)) : 0;
          const walking = g.phase === 'playing' && p.alive && !p.venting && q && Math.hypot(p.x - q.x, p.y - q.y) < 20;
          if (walking && (dx || dy)) {
            steps++;
            if ((dx && dx === -q.dx) || (dy && dy === -q.dy)) reversals++;
          }
          prev.set(p.id, { x: p.x, y: p.y, dx, dy });
        }
        const m = g.meeting;
        if (m?.stage === 'results' && m.results) {
          for (const [voter, target] of Object.entries(m.votes)) {
            const v = g.byId.get(voter)!;
            const t = g.byId.get(target);
            if (voter === target) badVotes.push(`${voter} voted self`);
            if (t && g.isImpostor(v) && g.isImpostor(t)) badVotes.push(`${voter} voted teammate`);
          }
        }
      }
      expect(room.game).toBeNull();
      expect(g.gameOver).not.toBeNull();
      expect(badVotes).toEqual([]);
      expect(steps).toBeGreaterThan(1000);
      expect(reversals / steps).toBeLessThan(0.02);
      // The bots actually played: tasks got done, someone died, or a meeting was called.
      expect(maxDone + meetings + g.players.filter((p) => !p.alive).length).toBeGreaterThan(0);
    }, 60_000);
  }

  it('bots leave with the last human', () => {
    const room = new ServerRoom('TEST', false);
    room.addMember('h', 't', 'Host', fakeWs, 0);
    room.addBot();
    room.addBot();
    room.removeMember('h');
    room.tick(1000);
    expect(room.memberCount).toBe(0);
  });

  it('only the host adds bots, and never past a full room', () => {
    const room = new ServerRoom('TEST', false);
    const host = room.addMember('h', 't', 'Host', fakeWs, 0);
    const guest = room.addMember('g', 't2', 'Guest', fakeWs, 0);
    room.handle(guest, { t: 'addBot' }, 0);
    expect(room.memberCount).toBe(2);
    for (let i = 0; i < 20; i++) room.handle(host, { t: 'addBot' }, 0);
    expect(room.memberCount).toBe(15);
  });
});

describe('bot chat', () => {
  const ctx: ChatContext = {
    name: 'Pip', impostor: false, teammates: [], purpose: 'open', reporter: true, caller: 'Pip', kind: 'report',
    victim: 'Nova', bodyRoom: 'Electrical', myRoom: 'Electrical', myTask: 'Fix Wiring', sawKill: null, sawVent: null,
    nearBody: ['Rex'], withVictim: [], lastSeen: [], suspect: 'Rex', accuser: null, alive: ['Pip', 'Rex', 'Juno'], chat: [],
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses canned lines without a key', async () => {
    vi.stubEnv('BOT_LLM_KEY', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const line = await botLine(ctx, Math.random);
    expect(line).toContain('Electrical');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('falls back to canned lines when the API fails', async () => {
    vi.stubEnv('BOT_LLM_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const line = await botLine(ctx, Math.random);
    expect(line.length).toBeGreaterThan(0);
  });

  it('asks the configured free-tier endpoint and cleans the reply', async () => {
    vi.stubEnv('BOT_LLM_KEY', 'test-key');
    vi.stubEnv('BOT_LLM_PROVIDER', 'gemini');
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'Pip: "rex was standing on the body"' } }] }) });
    vi.stubGlobal('fetch', fetch);
    expect(await llmLine(ctx)).toBe('rex was standing on the body');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(init.headers.authorization).toBe('Bearer test-key');
  });

  it('strips a name prefix and quotes', () => {
    expect(cleanLine('  Pip:  "hello  there" ', 'Pip')).toBe('hello there');
  });
});
