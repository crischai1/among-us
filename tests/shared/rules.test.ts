import { describe, expect, it } from 'vitest';
import { makeRng } from '../../shared/rng';
import { DEFAULT_SETTINGS, applySettingsPatch } from '../../shared/settings';
import { assignRoles, maxImpostors } from '../../shared/rules/roles';
import { tallyVotes } from '../../shared/rules/voting';
import { checkWin } from '../../shared/rules/win';
import { assignTasks, taskView } from '../../shared/rules/tasks';
import { applyFix, newSabotage } from '../../shared/rules/sabotage';
import { isImpostorRole } from '../../shared/types';
import { getShip } from '../../shared/map';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('voting', () => {
  it('ejects the unique top candidate', () => {
    const r = tallyVotes({ a: 'c', b: 'c', c: 'a', d: 'skip' }, ['a', 'b', 'c', 'd']);
    expect(r.ejectedId).toBe('c');
    expect(r.counts).toEqual({ c: 2, a: 1, skip: 1 });
  });
  it('ties eject no one', () => {
    expect(tallyVotes({ a: 'b', b: 'a' }, ['a', 'b', 'c'])).toMatchObject({ ejectedId: null, tie: true });
  });
  it('skip winning or tying ejects no one', () => {
    expect(tallyVotes({ a: 'skip', b: 'skip', c: 'a' }, ['a', 'b', 'c']).ejectedId).toBeNull();
    expect(tallyVotes({ a: 'skip', c: 'a' }, ['a', 'b', 'c'])).toMatchObject({ ejectedId: null, tie: true });
  });
  it('ignores dead voters and dead targets; abstains count for nothing', () => {
    const r = tallyVotes({ a: 'b', dead: 'a', c: 'dead' }, ['a', 'b', 'c']);
    expect(r.counts).toEqual({ b: 1 });
    expect(r.ejectedId).toBe('b');
    expect(tallyVotes({}, ['a']).ejectedId).toBeNull();
  });
});

describe('win conditions', () => {
  const base = { impostorsAlive: 1, crewAlive: 3, tasksDone: 0, tasksTotal: 10, criticalExpired: false };
  it('no win mid game', () => expect(checkWin(base)).toBeNull());
  it('crew wins when impostors are gone', () => expect(checkWin({ ...base, impostorsAlive: 0 })).toEqual({ winner: 'crew', reason: 'vote' }));
  it('crew wins on tasks', () => expect(checkWin({ ...base, tasksDone: 10 })).toEqual({ winner: 'crew', reason: 'tasks' }));
  it('zero total tasks never wins', () => expect(checkWin({ ...base, tasksTotal: 0 })).toBeNull());
  it('impostors win at parity', () => expect(checkWin({ ...base, crewAlive: 1 })).toEqual({ winner: 'impostors', reason: 'kills' }));
  it('impostors win on sabotage timeout', () =>
    expect(checkWin({ ...base, criticalExpired: true })).toEqual({ winner: 'impostors', reason: 'sabotage' }));
});

describe('roles', () => {
  it('caps impostors by player count', () => {
    expect(maxImpostors(5)).toBe(1);
    expect(maxImpostors(8)).toBe(2);
    expect(maxImpostors(15)).toBe(3);
    const roles = assignRoles(ids(5), { ...DEFAULT_SETTINGS, impostors: 3 }, makeRng(1));
    expect(Object.values(roles).filter(isImpostorRole)).toHaveLength(1);
  });
  it('assigns the configured impostor count', () => {
    for (let seed = 0; seed < 20; seed++) {
      const roles = assignRoles(ids(12), { ...DEFAULT_SETTINGS, impostors: 3 }, makeRng(seed));
      expect(Object.values(roles).filter(isImpostorRole)).toHaveLength(3);
    }
  });
  it('rolls special roles with 100% chance up to count, never crossing teams', () => {
    const s = { ...DEFAULT_SETTINGS, impostors: 2, engineerCount: 2, engineerChance: 100, scientistCount: 1, scientistChance: 100, shapeshifterCount: 1, shapeshifterChance: 100 };
    const roles = Object.values(assignRoles(ids(10), s, makeRng(3)));
    expect(roles.filter((r) => r === 'engineer')).toHaveLength(2);
    expect(roles.filter((r) => r === 'scientist')).toHaveLength(1);
    expect(roles.filter((r) => r === 'shapeshifter')).toHaveLength(1);
    expect(roles.filter((r) => r === 'impostor')).toHaveLength(1);
  });
  it('honours forced roles', () => {
    const roles = assignRoles(ids(4), DEFAULT_SETTINGS, makeRng(9), { p2: 'impostor', p0: 'scientist' });
    expect(roles.p2).toBe('impostor');
    expect(roles.p0).toBe('scientist');
    expect(Object.values(roles).filter(isImpostorRole)).toHaveLength(1);
  });
});

describe('tasks', () => {
  it('gives every crewmate the same commons and the configured counts', () => {
    const s = { ...DEFAULT_SETTINGS, commonTasks: 2, shortTasks: 3, longTasks: 2 };
    const tasks = assignTasks(ids(5), new Set(['p4']), s, makeRng(5));
    const lists = [...tasks.values()];
    for (const l of lists) {
      expect(l).toHaveLength(7);
      expect(new Set(l.map((t) => t.type)).size).toBe(7);
      expect(l.filter((t) => t.category === 'short')).toHaveLength(3);
    }
    expect(lists[0].slice(0, 2).map((t) => t.stations)).toEqual(lists[1].slice(0, 2).map((t) => t.stations));
    expect(tasks.get('p4')!.every((t) => t.fake)).toBe(true);
    expect(tasks.get('p0')!.every((t) => !t.fake)).toBe(true);
  });
  it('every task step refers to a real station', () => {
    const map = getShip();
    for (let seed = 0; seed < 30; seed++) {
      const tasks = assignTasks(['a'], new Set(), { ...DEFAULT_SETTINGS, commonTasks: 2, shortTasks: 5, longTasks: 5 }, makeRng(seed));
      for (const t of tasks.get('a')!) {
        for (const st of t.stations) expect(map.stations.has(st), st).toBe(true);
        expect(taskView(t, map).room).not.toBe('');
      }
    }
  });
});

describe('sabotage', () => {
  it('lights fixed once every switch is on', () => {
    const s = newSabotage('lights', 0, makeRng(2));
    expect(s.lights!.some((v) => !v)).toBe(true);
    let fixed = false;
    s.lights!.forEach((on, i) => {
      if (!on) fixed = applyFix(s, 'lights:electrical', i, { o2Code: '' });
    });
    expect(fixed).toBe(true);
  });
  it('reactor needs both scanners held', () => {
    const s = newSabotage('reactor', 1000, makeRng(2));
    expect(s.endsAt).toBe(46_000);
    expect(applyFix(s, 'reactor:top', true, { o2Code: '', held: ['reactor:top'] })).toBe(false);
    expect(applyFix(s, 'reactor:bottom', true, { o2Code: '', held: ['reactor:top', 'reactor:bottom'] })).toBe(true);
  });
  it('o2 needs the right code at both keypads', () => {
    const s = newSabotage('o2', 0, makeRng(2));
    expect(applyFix(s, 'o2:o2', '00000', { o2Code: '12345' })).toBe(false);
    expect(applyFix(s, 'o2:o2', '12345', { o2Code: '12345' })).toBe(false);
    expect(applyFix(s, 'o2:admin', '12345', { o2Code: '12345' })).toBe(true);
  });
  it('rejects fixes at unrelated stations', () => {
    const s = newSabotage('comms', 0, makeRng(2));
    expect(applyFix(s, 'lights:electrical', 'tuned', { o2Code: '' })).toBe(false);
    expect(applyFix(s, 'comms:comms', 'tuned', { o2Code: '' })).toBe(true);
  });
});

describe('settings', () => {
  it('clamps, snaps and ignores junk', () => {
    const s = applySettingsPatch(DEFAULT_SETTINGS, { impostors: 9, killCooldown: 23, killDistance: 'far', bogus: 1, confirmEjects: 'yes', crewVision: 0.3 });
    expect(s.impostors).toBe(3);
    expect(s.killCooldown).toBe(22.5);
    expect(s.killDistance).toBe('medium');
    expect(s.confirmEjects).toBe(true);
    expect(s.crewVision).toBe(0.25);
    expect('bogus' in s).toBe(false);
  });
});
