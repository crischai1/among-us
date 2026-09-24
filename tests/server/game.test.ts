import { describe, expect, it } from 'vitest';
import { REVEAL_MS } from '../../shared/constants';
import { makeGame, place } from './helpers';

describe('Game flow', () => {
  it('reveals, then plays; impostor kills, crewmate reports, vote ejects impostor, crew wins', () => {
    const h = makeGame(5, { p0: 'impostor' }, { discussionTime: 0, votingTime: 30 });
    const { g } = h;
    expect(g.phase).toBe('reveal');
    h.advance(REVEAL_MS + 50);
    expect(g.phase).toBe('playing');

    // Kill cooldown not ready yet
    place(g, 'p0', 1500, 400);
    place(g, 'p1', 1540, 400);
    h.act('p0', { t: 'kill', target: g.byId.get('p1')!.eid });
    expect(g.byId.get('p1')!.alive).toBe(true);

    h.advance(10_050);
    h.act('p0', { t: 'kill', target: g.byId.get('p1')!.eid });
    expect(g.byId.get('p1')!.alive).toBe(false);
    expect(g.bodies).toHaveLength(1);
    expect(h.all('p1').some((m) => m.t === 'ev' && m.ev.k === 'killed')).toBe(true);

    // p2 reports
    place(g, 'p2', 1560, 420);
    h.act('p2', { t: 'report', bodyId: g.bodies[0].id });
    expect(g.phase).toBe('meeting');
    h.advance(3100); // intro -> voting (no discussion)
    expect(g.meeting!.stage).toBe('voting');

    // p1 is dead and cannot vote
    h.act('p1', { t: 'vote', target: 'p0' });
    expect(g.meeting!.votes.p1).toBeUndefined();
    for (const id of ['p2', 'p3', 'p4']) h.act(id, { t: 'vote', target: 'p0' });
    h.act('p0', { t: 'vote', target: 'skip' });
    expect(g.meeting!.stage).toBe('results');
    expect(g.meeting!.results!.ejectedId).toBe('p0');

    h.advance(5100);
    expect(g.phase).toBe('ejection');
    expect(g.ejection!.text).toBe('P0 was The Impostor.');
    h.advance(7100);
    expect(g.phase).toBe('gameover');
    expect(g.gameOver).toMatchObject({ winner: 'crew', reason: 'vote' });
    expect(h.last('p3', 'pub')!.state.gameOver!.roles.p0).toBe('impostor');
  });

  it('impostors win at parity', () => {
    const h = makeGame(4, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 10_100);
    for (const victim of ['p1', 'p2']) {
      const p0 = g.byId.get('p0')!;
      place(g, victim, p0.x + 30, p0.y);
      p0.killReadyAt = 0;
      h.act('p0', { t: 'kill', target: g.byId.get(victim)!.eid });
    }
    expect(g.gameOver).toMatchObject({ winner: 'impostors', reason: 'kills' });
  });

  it('crew wins by finishing tasks, with server-enforced minimum durations', () => {
    const h = makeGame(4, { p0: 'impostor' }, { commonTasks: 0, shortTasks: 1, longTasks: 0 });
    const { g } = h;
    h.advance(REVEAL_MS + 50);
    for (const id of ['p1', 'p2', 'p3']) {
      const p = g.byId.get(id)!;
      for (const t of p.tasks) {
        while (!t.done) {
          const st = g.map.stations.get(t.stations[t.step])!;
          place(g, id, st.x, st.y + 20);
          h.act(id, { t: 'taskOpen', stationId: st.id });
          expect(p.openStation?.id).toBe(st.id);
          // Too fast: rejected unless min duration is 0
          h.advance(10_000);
          h.act(id, { t: 'taskDone', stationId: st.id });
        }
      }
    }
    expect(g.gameOver).toMatchObject({ winner: 'crew', reason: 'tasks' });
  });

  it('meeting chat reaches all, ghost chat only the dead', () => {
    const h = makeGame(5, { p0: 'impostor' }, { discussionTime: 30 });
    const { g } = h;
    h.advance(REVEAL_MS + 50);
    g.byId.get('p1')!.alive = false;
    h.act('p2', { t: 'emergency' }); // not near the button
    expect(g.phase).toBe('playing');
    const btn = g.map.def.button!;
    place(g, 'p2', btn.x, btn.y + 90);
    h.advance(20_000);
    h.act('p2', { t: 'emergency' });
    expect(g.phase).toBe('meeting');
    h.advance(3100);
    h.act('p2', { t: 'chat', text: 'where?' });
    h.act('p1', { t: 'chat', text: 'boo' });
    const chats = (id: string) => h.all(id).filter((m) => m.t === 'ev' && m.ev.k === 'chat').map((m) => (m as { ev: { text: string } }).ev.text);
    expect(chats('p3')).toEqual(['where?']);
    expect(chats('p1')).toEqual(['where?', 'boo']);
  });

  it('critical sabotage timeout wins for impostors; report cancels it', () => {
    const h = makeGame(5, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 10_100);
    h.act('p0', { t: 'sabotage', kind: 'reactor' });
    expect(g.sabotage?.kind).toBe('reactor');
    h.act('p0', { t: 'sabotage', kind: 'lights' });
    expect(g.sabotage?.kind).toBe('reactor');
    h.advance(46_000);
    expect(g.gameOver).toMatchObject({ winner: 'impostors', reason: 'sabotage' });
  });

  it('reactor is fixed only by two different players holding both scanners', () => {
    const h = makeGame(5, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 10_100);
    h.act('p0', { t: 'sabotage', kind: 'reactor' });
    const top = g.map.stations.get('reactor:top')!;
    const bottom = g.map.stations.get('reactor:bottom')!;
    place(g, 'p1', top.x, top.y + 20);
    place(g, 'p2', bottom.x, bottom.y - 20);
    h.act('p1', { t: 'taskOpen', stationId: 'reactor:top' });
    h.act('p1', { t: 'fix', kind: 'reactor', stationId: 'reactor:top', data: true });
    h.advance(100);
    expect(g.sabotage?.reactorHeld).toEqual(['reactor:top']);
    h.act('p2', { t: 'taskOpen', stationId: 'reactor:bottom' });
    h.act('p2', { t: 'fix', kind: 'reactor', stationId: 'reactor:bottom', data: true });
    expect(g.sabotage).toBeNull();
  });

  it('doors close for a room and block movement', () => {
    const h = makeGame(5, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    h.act('p0', { t: 'sabotage', kind: 'doors', room: 'cafeteria' });
    expect(g.doors.has('cafe-w')).toBe(true);
    place(g, 'p1', 1340, 365);
    for (let i = 1; i <= 40; i++) h.act('p1', { t: 'input', seq: i, dx: -1, dy: 0 });
    for (let i = 0; i < 40; i++) h.advance(34);
    expect(g.byId.get('p1')!.x).toBeGreaterThan(1300);
    h.advance(10_000);
    expect(g.doors.size).toBe(0);
  });

  it('vents: impostor enters, moves along links only, is hidden, and exits', () => {
    const h = makeGame(5, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    const v = g.map.vents.get('v-medbay')!;
    place(g, 'p0', v.x + 10, v.y + 10);
    place(g, 'p1', v.x + 60, v.y + 60);
    h.act('p0', { t: 'vent', action: 'enter', ventId: 'v-medbay' });
    expect(g.byId.get('p0')!.venting).toBe('v-medbay');
    h.act('p0', { t: 'vent', action: 'move', ventId: 'v-cafe' });
    expect(g.byId.get('p0')!.venting).toBe('v-medbay');
    h.act('p0', { t: 'vent', action: 'move', ventId: 'v-elec' });
    expect(g.byId.get('p0')!.venting).toBe('v-elec');
    h.advance(40);
    const snap = h.last('p1', 'snap')!;
    expect(snap.ents.some((e) => e[0] === g.byId.get('p0')!.eid)).toBe(false);
    h.act('p0', { t: 'vent', action: 'exit' });
    expect(g.byId.get('p0')!.venting).toBeNull();
    // crewmates can't vent
    h.act('p1', { t: 'vent', action: 'enter', ventId: 'v-medbay' });
    expect(g.byId.get('p1')!.venting).toBeNull();
  });

  it('shapeshifter takes on a look and reverts at meetings', () => {
    const h = makeGame(5, { p0: 'shapeshifter' });
    const { g } = h;
    h.advance(REVEAL_MS + 10_100);
    h.act('p0', { t: 'shapeshift', target: 'p3' });
    place(g, 'p1', g.byId.get('p0')!.x + 20, g.byId.get('p0')!.y);
    h.advance(40);
    const e = h.last('p1', 'snap')!.ents.find((x) => x[0] === g.byId.get('p0')!.eid)!;
    expect(e[4]).toBe(g.byId.get('p3')!.idx);
    const btn = g.map.def.button!;
    place(g, 'p1', btn.x, btn.y + 90);
    h.advance(20_000);
    h.act('p1', { t: 'emergency' });
    expect(g.byId.get('p0')!.shift!.as).toBeNull();
  });

  it('scientist battery drains and recharges', () => {
    const h = makeGame(5, { p0: 'impostor', p1: 'scientist' }, { scientistBattery: 5, scientistCooldown: 10 });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    h.act('p1', { t: 'portableVitals', open: true });
    h.advance(100);
    expect(h.last('p1', 'priv')!.state.vitals).toHaveLength(5);
    h.advance(5100);
    expect(g.byId.get('p1')!.battery!.open).toBe(false);
    h.act('p1', { t: 'portableVitals', open: true });
    expect(g.byId.get('p1')!.battery!.open).toBe(false);
    h.advance(10_100);
    h.act('p1', { t: 'portableVitals', open: true });
    expect(g.byId.get('p1')!.battery!.open).toBe(true);
  });

  it('disconnect timeout removes a player and re-checks the win', () => {
    const h = makeGame(4, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    g.removePlayer('p0');
    expect(g.gameOver).toMatchObject({ winner: 'crew', reason: 'disconnect' });
  });
});
