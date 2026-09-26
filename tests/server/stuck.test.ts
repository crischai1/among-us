import { describe, expect, it } from 'vitest';
import { REVEAL_MS } from '../../shared/constants';
import { makeGame, place } from './helpers';

function atTask(h: ReturnType<typeof makeGame>, id: string) {
  const p = h.g.byId.get(id)!;
  const st = h.g.map.stations.get(p.tasks[0].stations[p.tasks[0].step])!;
  place(h.g, id, st.x, st.y + 20);
  return { p, st };
}

describe('never stuck in a task', () => {
  it('a rejected (too early) taskDone does not leave the player frozen once they walk away', () => {
    const h = makeGame(4, { p0: 'impostor' }, { commonTasks: 0, shortTasks: 0, longTasks: 1 });
    h.advance(REVEAL_MS + 100);
    const { p, st } = atTask(h, 'p1');
    h.act('p1', { t: 'taskOpen', stationId: st.id });
    h.advance(50);
    h.act('p1', { t: 'taskDone', stationId: st.id }); // too early: rejected
    // Client UI has closed; the player walks off without a taskClose ever arriving.
    const y0 = p.y;
    for (let i = 1; i <= 10; i++) h.act('p1', { t: 'input', seq: i, dx: 0, dy: 1 });
    h.advance(1000);
    expect(p.openStation).toBeNull();
    expect(p.y).toBeGreaterThan(y0 + 20);
  });

  it('standing still in a task keeps it open; movement queued before opening still applies', () => {
    const h = makeGame(4, { p0: 'impostor' }, { commonTasks: 0, shortTasks: 0, longTasks: 1 });
    h.advance(REVEAL_MS + 100);
    const { p, st } = atTask(h, 'p1');
    // two steps of walking are still in flight when the task opens
    h.act('p1', { t: 'input', seq: 1, dx: 1, dy: 0 });
    h.act('p1', { t: 'input', seq: 2, dx: 1, dy: 0 });
    h.act('p1', { t: 'taskOpen', stationId: st.id });
    const x0 = p.x;
    h.act('p1', { t: 'input', seq: 3, dx: 0, dy: 0 });
    h.advance(1000);
    expect(p.openStation?.id).toBe(st.id);
    expect(p.x).toBeGreaterThan(x0);
    expect(p.lastSeq).toBe(3);
  });

  it('moving away from a console closes it', () => {
    const h = makeGame(4, { p0: 'impostor' });
    h.advance(REVEAL_MS + 100);
    const cams = h.g.map.def.stations.find((s) => s.kind === 'cams')!;
    place(h.g, 'p1', cams.x, cams.y + 20);
    h.act('p1', { t: 'console', kind: 'cams', open: true });
    const p = h.g.byId.get('p1')!;
    expect(p.console).toBe('cams');
    for (let i = 1; i <= 5; i++) h.act('p1', { t: 'input', seq: i, dx: 0, dy: 1 });
    h.advance(500);
    expect(p.console).toBeNull();
  });
});
