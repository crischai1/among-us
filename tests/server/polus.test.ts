import { describe, expect, it } from 'vitest';
import { REVEAL_MS } from '../../shared/constants';
import { REBOOT_MS } from '../../shared/rules/tasks';
import { startSabotage } from '../../server/game/actions';
import { makeGame, place } from './helpers';

/** Four players (p0 the impostor) on Polus, already playing. */
const polus = (settings: Parameters<typeof makeGame>[2] = {}) => {
  const h = makeGame(4, { p0: 'impostor' }, { map: 'polus', ...settings });
  h.advance(REVEAL_MS + 50);
  return h;
};

const mid = (seg: { x1: number; y1: number; x2: number; y2: number }) => ({ x: (seg.x1 + seg.x2) / 2, y: (seg.y1 + seg.y2) / 2 });

describe('Polus games', () => {
  it('start in the Dropship and gather in the Office after meetings', () => {
    const h = polus({ discussionTime: 0, votingTime: 15 });
    const { g } = h;
    for (const p of g.players) expect(g.map.roomAt(p.x, p.y)).toBe('dropship');
    g.startMeeting('emergency', g.players[1], null);
    h.advance(3100 + 15_100 + 5100 + 7100);
    expect(g.phase).toBe('playing');
    for (const p of g.players) expect(g.map.roomAt(p.x, p.y)).toBe('office');
  });

  it('sabotaged doors stay shut until a living player opens them', () => {
    const h = polus();
    const { g } = h;
    h.act('p0', { t: 'sabotage', kind: 'doors', room: 'office' });
    expect([...g.doors.keys()].sort()).toEqual(['office-e', 'office-s']);
    h.advance(60_000);
    expect(g.doors.has('office-e')).toBe(true);

    const door = g.map.doors.get('office-e')!;
    const at = mid(door.seg);
    // Too far away: nothing happens.
    place(g, 'p1', at.x + 300, at.y);
    h.act('p1', { t: 'openDoor', doorId: 'office-e' });
    expect(g.doors.has('office-e')).toBe(true);
    // A ghost can't open it either.
    place(g, 'p2', at.x + 30, at.y);
    g.byId.get('p2')!.alive = false;
    h.act('p2', { t: 'openDoor', doorId: 'office-e' });
    expect(g.doors.has('office-e')).toBe(true);
    // Next to it: open. The other door stays shut.
    place(g, 'p1', at.x + 30, at.y);
    h.act('p1', { t: 'openDoor', doorId: 'office-e' });
    expect(g.doors.has('office-e')).toBe(false);
    expect(g.doors.has('office-s')).toBe(true);
    h.advance(34);
    expect(h.last('p1', 'pub')!.state.doors).not.toHaveProperty('office-e');
  });

  it('decontamination doors cannot be opened by hand', () => {
    const h = polus();
    const { g } = h;
    g.doors.set('deconW-n', g.now + 3000);
    const at = mid(g.map.doors.get('deconW-n')!.seg);
    place(g, 'p1', at.x, at.y - 30);
    h.act('p1', { t: 'openDoor', doorId: 'deconW-n' });
    expect(g.doors.has('deconW-n')).toBe(true);
  });

  it('the seismic stabilizers need both towers held within a minute', () => {
    const h = polus();
    const { g } = h;
    startSabotage(g, 'reactor');
    expect(g.sabotage).toMatchObject({ label: 'Seismic Stabilizers', stations: ['reactor:left', 'reactor:right'] });
    expect(g.sabotage!.endsAt! - g.now).toBe(60_000);
    for (const [id, st] of [['p1', 'reactor:left'], ['p2', 'reactor:right']] as const) {
      const s = g.map.stations.get(st)!;
      place(g, id, s.x, s.y + 25);
      h.act(id, { t: 'taskOpen', stationId: st });
      h.act(id, { t: 'fix', kind: 'reactor', stationId: st, data: true });
    }
    expect(g.sabotage).toBeNull();
  });

  it('reboot wifi has to wait a minute between turning it off and on', () => {
    const h = polus({ commonTasks: 0, shortTasks: 0, longTasks: 5 });
    const { g } = h;
    // Give p1 the task directly so the test doesn't depend on the draw.
    const p = g.byId.get('p1')!;
    p.tasks = [{ id: 't-wifi', type: 'wifi', category: 'long', stations: ['wifi:comms', 'wifi:comms'], step: 0, done: false, params: { seed: 1 }, fake: false }];
    const st = g.map.stations.get('wifi:comms')!;
    place(g, 'p1', st.x, st.y + 30);
    const doStep = () => {
      h.act('p1', { t: 'taskOpen', stationId: st.id });
      h.advance(600);
      h.act('p1', { t: 'taskDone', stationId: st.id });
    };
    doStep();
    expect(p.tasks[0].step).toBe(1);
    doStep();
    expect(p.tasks[0].step).toBe(1);
    h.advance(REBOOT_MS);
    doStep();
    expect(p.tasks[0].done).toBe(true);
  });

  it('the admin map ignores people out in the snow', () => {
    const h = polus();
    const { g } = h;
    const admin = g.map.def.stations.find((s) => s.kind === 'admin')!;
    place(g, 'p1', admin.area!.x - 30, admin.area!.y + 10);
    const snow = g.map.def.rooms.find((r) => r.id === 'outside')!.rects[5];
    place(g, 'p2', snow.x + snow.w / 2, snow.y + snow.h / 2);
    h.act('p1', { t: 'console', kind: 'admin', open: true });
    h.advance(34);
    const counts = h.last('p1', 'priv')!.state.admin!;
    expect(counts.admin).toBe(1);
    expect(counts.outside).toBeUndefined();
  });

  it('the admin table works from its far side too', () => {
    const h = polus();
    const { g } = h;
    const admin = g.map.def.stations.find((s) => s.kind === 'admin')!;
    const a = admin.area!;
    // Opposite side from where the station point is drawn.
    place(g, 'p1', a.x + a.w / 2, a.y - 30);
    h.act('p1', { t: 'console', kind: 'admin', open: true });
    expect(g.byId.get('p1')!.console).toBe('admin');
  });
});
