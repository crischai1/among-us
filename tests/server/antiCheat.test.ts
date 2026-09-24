import { describe, expect, it } from 'vitest';
import { BASE_SPEED, DT, REVEAL_MS } from '../../shared/constants';
import { F_TEAMMATE } from '../../shared/types';
import { makeGame, place } from './helpers';

describe('anti-cheat', () => {
  it('flooding inputs moves at most two steps per tick', () => {
    const h = makeGame(4, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    place(g, 'p1', 1500, 400);
    for (let i = 1; i <= 100; i++) h.act('p1', { t: 'input', seq: i, dx: 1, dy: 0 });
    h.advance(1000);
    // The queue is capped, so a flood of 100 inputs buys at most 8 steps.
    expect(g.byId.get('p1')!.x - 1500).toBeLessThanOrEqual(8 * BASE_SPEED * DT + 0.01);
    // bogus input values are ignored
    h.act('p1', { t: 'input', seq: 500, dx: 5, dy: 0 });
    expect(g.byId.get('p1')!.inputs.some((i) => i.seq === 500)).toBe(false);
  });

  it('rejects out-of-range, on-cooldown, and crewmate kills', () => {
    const h = makeGame(5, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 10_100);
    place(g, 'p0', 1500, 400);
    place(g, 'p1', 1800, 400);
    h.act('p0', { t: 'kill', target: g.byId.get('p1')!.eid });
    expect(g.byId.get('p1')!.alive).toBe(true);
    place(g, 'p2', 1530, 400);
    h.act('p2', { t: 'kill', target: g.byId.get('p0')!.eid });
    expect(g.byId.get('p0')!.alive).toBe(true);
    h.act('p0', { t: 'kill', target: g.byId.get('p2')!.eid });
    expect(g.byId.get('p2')!.alive).toBe(false);
    place(g, 'p3', g.byId.get('p0')!.x + 20, 400);
    h.act('p0', { t: 'kill', target: g.byId.get('p3')!.eid });
    expect(g.byId.get('p3')!.alive).toBe(true);
  });

  it('rejects kills through walls', () => {
    const h = makeGame(5, { p0: 'impostor' }, { killDistance: 'long' });
    const { g } = h;
    h.advance(REVEAL_MS + 10_100);
    place(g, 'p0', 1320, 250); // cafeteria, west wall at x=1300
    place(g, 'p1', 1230, 250); // void/other side
    h.act('p0', { t: 'kill', target: g.byId.get('p1')!.eid });
    expect(g.byId.get('p1')!.alive).toBe(true);
  });

  it('rejects early taskDone and taskDone without taskOpen', () => {
    const h = makeGame(4, { p0: 'impostor' }, { commonTasks: 0, shortTasks: 0, longTasks: 1 });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    const p = g.byId.get('p1')!;
    const t = p.tasks[0];
    const st = g.map.stations.get(t.stations[0])!;
    h.act('p1', { t: 'taskDone', stationId: st.id });
    expect(t.step).toBe(0);
    place(g, 'p1', st.x, st.y + 20);
    h.act('p1', { t: 'taskOpen', stationId: st.id });
    h.advance(100);
    h.act('p1', { t: 'taskDone', stationId: st.id });
    expect(t.step === 0 && !t.done).toBe(true);
    // Impostors cannot open (fake) tasks
    const imp = g.byId.get('p0')!;
    const fst = g.map.stations.get(imp.tasks[0].stations[0])!;
    place(g, 'p0', fst.x, fst.y + 20);
    h.act('p0', { t: 'taskOpen', stationId: fst.id });
    expect(imp.openStation).toBeNull();
  });

  it('never leaks roles, ghosts, or distant players to living crewmates', () => {
    const h = makeGame(6, { p0: 'impostor', p1: 'crewmate' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    place(g, 'p1', 1500, 400);
    place(g, 'p2', 1520, 400);
    g.byId.get('p2')!.alive = false; // ghost right next to p1
    place(g, 'p3', 3100, 950); // navigation, far away
    place(g, 'p0', 1550, 420);
    h.advance(40);
    const snap = h.last('p1', 'snap')!;
    const eids = snap.ents.map((e) => e[0]);
    expect(eids).toContain(g.byId.get('p0')!.eid);
    expect(eids).not.toContain(g.byId.get('p2')!.eid);
    expect(eids).not.toContain(g.byId.get('p3')!.eid);
    expect(snap.ents.every((e) => (e[3] & F_TEAMMATE) === 0)).toBe(true);

    const priv = h.last('p1', 'priv')!.state;
    expect(priv.role).toBe('crewmate');
    expect(priv.team).toEqual([]);
    const text = JSON.stringify(h.all('p1'));
    expect(text).not.toContain('"impostor"');
    // p2's death is not public yet
    expect(h.last('p1', 'pub')!.state.players.find((p) => p.id === 'p2')!.dead).toBe(false);

    // The impostor does see its team
    expect(h.last('p0', 'priv')!.state.team).toEqual(['p0']);
  });

  it('keeps individual votes hidden until results; anonymous votes stay hidden', () => {
    const h = makeGame(5, { p0: 'impostor' }, { discussionTime: 0, anonymousVotes: true });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    const btn = g.map.def.button!;
    place(g, 'p1', btn.x, btn.y + 90);
    h.advance(20_000);
    h.act('p1', { t: 'emergency' });
    h.advance(3100);
    h.act('p1', { t: 'vote', target: 'p0' });
    h.advance(40);
    const pub = h.last('p2', 'pub')!.state;
    expect(pub.meeting!.votedIds).toEqual(['p1']);
    expect(JSON.stringify(pub.meeting)).not.toContain('"p1":"p0"');
    for (const id of ['p0', 'p2', 'p3', 'p4']) h.act(id, { t: 'vote', target: 'skip' });
    h.advance(40);
    const res = h.last('p2', 'pub')!.state.meeting!.results!;
    expect(res.votes).toBeNull();
    expect(res.counts).toEqual({ p0: 1, skip: 4 });
  });

  it('vent moves to unlinked vents are rejected', () => {
    const h = makeGame(4, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    const v = g.map.vents.get('v-ue')!;
    place(g, 'p0', v.x, v.y);
    h.act('p0', { t: 'vent', action: 'enter', ventId: 'v-ue' });
    h.act('p0', { t: 'vent', action: 'move', ventId: 'v-shields' });
    expect(g.byId.get('p0')!.venting).toBe('v-ue');
  });
});
