// @vitest-environment jsdom
import { act, render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TaskType } from '../../shared/types';
import { TASK_GAMES } from '../../src/tasks/registry';
import { DivertPower } from '../../src/tasks/games/DivertPower';
import { CalibrateDistributor } from '../../src/tasks/games/CalibrateDistributor';

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
});
