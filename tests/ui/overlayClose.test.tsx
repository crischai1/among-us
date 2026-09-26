// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/settings';
import { TASK_DEFS } from '../../shared/rules/tasks';
import type { PrivState } from '../../shared/types';

const sent: { t: string; [k: string]: unknown }[] = [];
vi.mock('../../src/net/session', () => ({ send: (m: { t: string }) => sent.push(m) }));

const { useGame } = await import('../../src/store/game');
const { useSession } = await import('../../src/store/session');
const { closeOverlay } = await import('../../src/game/actions');
const { TaskOverlay } = await import('../../src/tasks/TaskOverlay');

useSession.setState({ room: { code: 'X', hostId: 'a', members: [], settings: DEFAULT_SETTINGS, inGame: true, dev: false } });

const priv = (stationId: string, type: 'swipe' | 'divert' = 'divert'): PrivState =>
  ({
    role: 'crewmate', team: [], commsDown: false, killReadyAt: 0, emergencyLeft: 1, venting: null, ventReadyAt: 0, ventEndsAt: null,
    sabotageReadyAt: 0, doorReadyAt: {}, openStation: stationId, console: null, admin: null, vitals: null, battery: null, shift: null,
    o2Code: null, commsCode: null, doorLog: null, vote: null,
    tasks: [{ id: 't1', type, category: 'short', name: 'T', step: 1, steps: 2, stationId, room: 'O2', done: false, params: { seed: 1, target: 'o2' } }],
  }) as PrivState;

afterEach(() => {
  sent.length = 0;
  useGame.setState({ overlay: null });
  vi.useRealTimers();
});

describe('closing panels always tells the server', () => {
  it('any way a task panel disappears sends taskClose', () => {
    useGame.setState({ overlay: { kind: 'task', stationId: 'divert:o2' } });
    useGame.setState({ overlay: null }); // e.g. closed by a sabotage/meeting, not the X button
    expect(sent).toEqual([{ t: 'taskClose' }]);
  });

  it('closing a console sends console close', () => {
    useGame.setState({ overlay: { kind: 'console', console: 'cams' } });
    closeOverlay();
    expect(sent).toEqual([{ t: 'console', kind: 'cams', open: false }]);
  });
});

describe('finishing a task', () => {
  it('reports taskDone only after the server minimum (plus margin), then closes', () => {
    vi.useFakeTimers();
    useGame.setState({ priv: priv('divert:o2'), overlay: { kind: 'task', stationId: 'divert:o2' } });
    const { container } = render(<TaskOverlay stationId="divert:o2" />);
    act(() => container.querySelector<HTMLButtonElement>('.power-switch')!.click());
    act(() => vi.advanceTimersByTime(350)); // the switch animation calls onComplete
    expect(container.textContent).toContain('Task Completed!');
    // closing is deferred while the completion is pending
    closeOverlay();
    expect(useGame.getState().overlay).not.toBeNull();
    expect(sent.find((m) => m.t === 'taskDone')).toBeUndefined();
    act(() => vi.advanceTimersByTime(TASK_DEFS.divert.minMs[1] + 600));
    expect(sent.map((m) => m.t)).toEqual(['taskDone', 'taskClose']);
    expect(useGame.getState().overlay).toBeNull();
  });

  it('comms sabotage hiding the task list does not close an open task', () => {
    useGame.setState({ priv: priv('divert:o2'), overlay: { kind: 'task', stationId: 'divert:o2' } });
    render(<TaskOverlay stationId="divert:o2" />);
    act(() => useGame.setState({ priv: { ...priv('divert:o2'), tasks: [], commsDown: true } }));
    expect(useGame.getState().overlay).toEqual({ kind: 'task', stationId: 'divert:o2' });
    expect(sent).toEqual([]);
  });
});
