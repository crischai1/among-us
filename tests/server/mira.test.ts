import { describe, expect, it } from 'vitest';
import { DECON_MS, DOOR_LOG_MAX, REVEAL_MS, SENSOR_COOLDOWN_MS } from '../../shared/constants';
import { pointInRect } from '../../shared/geom';
import { COMMS_CODE_MS, commsCode } from '../../shared/rules/sabotage';
import { DIAGNOSTICS_MS } from '../../shared/rules/tasks';
import { startSabotage } from '../../server/game/actions';
import { makeGame, place } from './helpers';

/** Four players (p0 the impostor) so the game doesn't end on its own. */
const mira = (settings: Parameters<typeof makeGame>[2] = {}) => {
  const h = makeGame(4, { p0: 'impostor' }, { map: 'mira', ...settings });
  h.advance(REVEAL_MS + 50);
  return h;
};

/** Walk a player one tick at a time in a direction (up to n ticks), as if they held the key. */
function walk(h: ReturnType<typeof makeGame>, id: string, dx: number, dy: number, n: number) {
  const p = h.g.byId.get(id)!;
  for (let i = 0; i < n; i++) {
    h.act(id, { t: 'input', seq: p.lastSeq + p.inputs.length + 1, dx, dy });
    h.advance(34);
  }
}

describe('MIRA HQ games', () => {
  it('start on the Launchpad and gather in the Cafeteria after meetings', () => {
    const h = mira({ discussionTime: 0, votingTime: 15 });
    const { g } = h;
    expect(g.map.def.id).toBe('mira');
    for (const p of g.players) expect(g.map.roomAt(p.x, p.y)).toBe('launchpad');
    g.startMeeting('emergency', g.players[0], null);
    h.advance(3100 + 15_100 + 5100 + 7100);
    expect(g.phase).toBe('playing');
    for (const p of g.players) expect(g.map.roomAt(p.x, p.y)).toBe('cafeteria');
  });

  it('decontamination shuts both doors when someone walks in, then reopens them', () => {
    const h = mira();
    const { g } = h;
    const dc = g.map.def.decon![0];
    // Just below the chamber's zone, walking up into it.
    place(g, 'p1', dc.zone.x + dc.zone.w / 2, dc.zone.y + dc.zone.h + 20);
    walk(h, 'p1', 0, -1, 8);
    expect(pointInRect(g.byId.get('p1')!.x, g.byId.get('p1')!.y, dc.zone)).toBe(true);
    expect([...g.doors.keys()].sort()).toEqual([...dc.doors].sort());
    expect(h.last('p1', 'pub')!.state.doors).toHaveProperty('decon-n');

    // Nobody gets out while it sprays.
    walk(h, 'p1', 0, -1, 40);
    expect(g.byId.get('p1')!.y).toBeGreaterThan(g.map.doors.get('decon-n')!.seg.y1);

    h.advance(DECON_MS);
    expect(g.doors.size).toBe(0);
    // Standing by the door that just opened (outside the zone), then stepping back in: no second cycle.
    const p1 = g.byId.get('p1')!;
    expect(pointInRect(p1.x, p1.y, dc.zone)).toBe(false);
    expect(g.map.roomAt(p1.x, p1.y)).toBe('decon');
    walk(h, 'p1', 0, 1, 12);
    expect(pointInRect(p1.x, p1.y, dc.zone)).toBe(true);
    expect(g.doors.size).toBe(0);
    // Standing still inside doesn't start another cycle; walking out works.
    walk(h, 'p1', 0, -1, 40);
    expect(g.doors.size).toBe(0);
    expect(g.byId.get('p1')!.y).toBeLessThan(g.map.doors.get('decon-n')!.seg.y1);
  });

  it('impostors cannot lock the decontamination doors', () => {
    const h = mira();
    h.act('p0', { t: 'sabotage', kind: 'doors', room: 'decon' });
    expect(h.g.doors.size).toBe(0);
  });

  it('the door log records who walks through a sensor, once per cooldown', () => {
    const h = mira();
    const { g } = h;
    const north = g.map.def.sensors!.find((s) => s.id === 'north')!;
    const cx = (north.seg.x1 + north.seg.x2) / 2;
    place(g, 'p1', cx, north.seg.y1 - 30);
    walk(h, 'p1', 0, 1, 12);
    expect(g.doorLog).toHaveLength(1);
    expect(g.doorLog[0]).toMatchObject({ color: 1, sensor: 'North' });
    // Straight back through within the cooldown: not logged again.
    walk(h, 'p1', 0, -1, 12);
    expect(g.doorLog).toHaveLength(1);
    h.advance(SENSOR_COOLDOWN_MS);
    walk(h, 'p1', 0, 1, 12);
    expect(g.doorLog).toHaveLength(2);

    // Only players at the door-log console receive it, and never during comms sabotage.
    expect(h.last('p1', 'priv')!.state.doorLog).toBeNull();
    const st = g.map.def.stations.find((s) => s.kind === 'doorlog')!;
    place(g, 'p1', st.x, st.y + 20);
    h.act('p1', { t: 'console', kind: 'doorlog', open: true });
    h.advance(34);
    expect(h.last('p1', 'priv')!.state.doorLog!.map((e) => e.sensor)).toEqual(['North', 'North']);
    startSabotage(g, 'comms');
    h.advance(34);
    expect(g.byId.get('p1')!.console).toBeNull();
    expect(h.last('p1', 'priv')!.state.doorLog).toBeNull();
  });

  it('the door log keeps only the newest entries and ignores teleports', () => {
    const h = mira();
    const { g } = h;
    const north = g.map.def.sensors!.find((s) => s.id === 'north')!;
    const p = g.byId.get('p1')!;
    const cx = (north.seg.x1 + north.seg.x2) / 2;
    g.teleport(p, cx, north.seg.y1 - 200);
    h.advance(34);
    g.teleport(p, cx, north.seg.y1 + 200);
    h.advance(34);
    expect(g.doorLog).toHaveLength(0);
    for (let i = 0; i < DOOR_LOG_MAX + 5; i++) g.doorLog.unshift({ color: 9, sensor: 'North', at: 0 });
    place(g, 'p1', cx, north.seg.y1 - 20);
    walk(h, 'p1', 0, 1, 10);
    expect(g.doorLog).toHaveLength(DOOR_LOG_MAX);
    expect(g.doorLog[0].at).toBeGreaterThan(0);
  });

  it('comms is fixed by typing each keypad’s rotating code', () => {
    const h = mira();
    const { g } = h;
    startSabotage(g, 'comms');
    expect(g.sabotage).toMatchObject({ kind: 'comms', keypad: true, stations: ['comms:comms', 'comms:office'] });
    for (const id of g.sabotage!.stations) {
      const st = g.map.stations.get(id)!;
      place(g, 'p1', st.x, st.y + 20);
      h.act('p1', { t: 'taskOpen', stationId: id });
      h.advance(34);
      const shown = h.last('p1', 'priv')!.state.commsCode!;
      expect(shown.code).toBe(commsCode(g.commsSeed, id, Math.floor(g.now / COMMS_CODE_MS)));
      h.act('p1', { t: 'fix', kind: 'comms', stationId: id, data: '00000' === shown.code ? '11111' : '00000' });
      expect(g.sabotage?.panelsDone ?? []).not.toContain(id);
      h.act('p1', { t: 'fix', kind: 'comms', stationId: id, data: shown.code });
    }
    expect(g.sabotage).toBeNull();
  });

  it('a stale comms code stops working once it has rolled over', () => {
    const h = mira();
    const { g } = h;
    startSabotage(g, 'comms');
    const st = g.map.stations.get('comms:comms')!;
    place(g, 'p1', st.x, st.y + 20);
    h.act('p1', { t: 'taskOpen', stationId: st.id });
    const old = commsCode(g.commsSeed, st.id, Math.floor(g.now / COMMS_CODE_MS));
    h.advance(COMMS_CODE_MS * 2);
    h.act('p1', { t: 'fix', kind: 'comms', stationId: st.id, data: old });
    expect(g.sabotage!.panelsDone).toEqual([]);
  });

  it('run diagnostics can only be collected after it finishes', () => {
    const h = mira({ commonTasks: 0, shortTasks: 0, longTasks: 5 });
    const { g } = h;
    const p = g.byId.get('p1')!;
    const t = p.tasks.find((x) => x.type === 'diagnostics');
    expect(t, 'diagnostics assigned').toBeTruthy();
    expect(t!.stations).toEqual(['diagnostics:launchpad', 'diagnostics:launchpad']);
    const st = g.map.stations.get('diagnostics:launchpad')!;
    place(g, 'p1', st.x, st.y - 30);
    const doStep = () => {
      h.act('p1', { t: 'taskOpen', stationId: st.id });
      h.advance(1000);
      h.act('p1', { t: 'taskDone', stationId: st.id });
    };
    doStep();
    expect(t!.step).toBe(1);
    expect(t!.params.readyAt).toBe(g.now + DIAGNOSTICS_MS);
    doStep();
    expect(t!.step).toBe(1);
    expect(p.openStation).toBeNull();
    h.advance(DIAGNOSTICS_MS);
    doStep();
    expect(t!.done).toBe(true);
  });
});

describe('MIRA HQ decontamination', () => {
  it('runs again for someone who left the chamber and came back', () => {
    const h = mira();
    const { g } = h;
    const dc = g.map.def.decon![0];
    const room = g.map.rooms.get(dc.room)!.rects[0];
    place(g, 'p1', dc.zone.x + dc.zone.w / 2, dc.zone.y + dc.zone.h + 20);
    walk(h, 'p1', 0, -1, 8);
    expect(g.doors.size).toBe(2);
    h.advance(DECON_MS);
    // Out through the top door, clear of the room...
    walk(h, 'p1', 0, -1, 60);
    expect(g.byId.get('p1')!.y).toBeLessThan(room.y);
    expect(g.doors.size).toBe(0);
    // ...and back in: a fresh cycle.
    walk(h, 'p1', 0, 1, 60);
    expect(g.doors.size).toBe(2);
  });
});
