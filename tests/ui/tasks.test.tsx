// @vitest-environment jsdom
import { act, render, screen, fireEvent } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TaskType } from '../../shared/types';
import { TASK_GAMES } from '../../src/tasks/registry';
import { DivertPower } from '../../src/tasks/games/DivertPower';
import { CalibrateDistributor } from '../../src/tasks/games/CalibrateDistributor';
import { ClearAsteroids } from '../../src/tasks/games/ClearAsteroids';
import { TransferData } from '../../src/tasks/games/TransferData';

describe('task mini-games', () => {
  it.each(Object.keys(TASK_GAMES) as TaskType[])('%s renders every step without crashing', (type) => {
    const Game = TASK_GAMES[type];
    for (const step of [0, 1, 2]) {
      const { unmount, container } = render(<Game step={step} params={{ seed: 42, target: 'weapons', from: 'cafeteria' }} onComplete={() => {}} />);
      expect(container.firstChild).not.toBeNull();
      unmount();
    }
  });

  it('accept-power step completes on flipping the switch', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const { container } = render(<DivertPower step={1} params={{ seed: 1, target: 'o2' }} onComplete={done} />);
    fireEvent.click(container.querySelector('.power-switch')!);
    act(() => vi.advanceTimersByTime(500));
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('calibrate only enables the current row', () => {
    render(<CalibrateDistributor step={0} params={{ seed: 1 }} onComplete={() => {}} />);
    const buttons = screen.getAllByText('CALIBRATE');
    expect(buttons.map((b) => (b as HTMLButtonElement).disabled)).toEqual([false, true, true]);
  });

  it('asteroids keep spawning under StrictMode', () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const { container } = render(
      <StrictMode>
        <ClearAsteroids step={0} params={{ seed: 1 }} onComplete={() => {}} />
      </StrictMode>,
    );
    const counts: number[] = [];
    for (let i = 0; i < 180; i++) {
      now += 1000 / 60;
      act(() => frames.splice(0).forEach((f) => f(now)));
      if (i % 30 === 29) counts.push(container.querySelectorAll('polygon').length);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // Over 3 seconds the field stays busy rather than emptying out.
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(5);
  });

  it('download progress is uneven but finishes on time', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const { container } = render(<TransferData step={0} params={{ seed: 1 }} onComplete={done} />);
    fireEvent.click(screen.getByText('Download'));
    act(() => vi.advanceTimersByTime(3000));
    expect(container.querySelector('.transfer-status')!.textContent).toMatch(/% · Estimated time: /);
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(4200));
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
