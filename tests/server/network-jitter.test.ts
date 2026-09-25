import { describe, expect, it } from 'vitest';
import { BASE_SPEED, DT, REVEAL_MS, TICK_MS } from '../../shared/constants';
import { INPUT_BURST } from '../../server/game/types';
import { makeGame, place } from './helpers';

const STEP = BASE_SPEED * DT;

describe('bad connections', () => {
  it('a burst of inputs after a network stall is applied in full, not dropped', () => {
    const h = makeGame(4, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    place(g, 'p1', 1400, 450);
    // 600 ms of wifi stall: nothing arrives, then 18 queued inputs land at once.
    h.advance(600);
    for (let i = 1; i <= 18; i++) h.act('p1', { t: 'input', seq: i, dx: 1, dy: 0 });
    h.advance(2000);
    expect(g.byId.get('p1')!.lastSeq).toBe(18);
    expect(g.byId.get('p1')!.x).toBeCloseTo(1400 + 18 * STEP, 1);
  });

  it('a speed hacker sending extra inputs every tick gains at most the burst allowance', () => {
    const h = makeGame(4, { p0: 'impostor' });
    const { g } = h;
    h.advance(REVEAL_MS + 100);
    place(g, 'p1', 1350, 450);
    let seq = 0;
    const ticks = 60;
    for (let t = 0; t < ticks; t++) {
      for (let i = 0; i < 10; i++) h.act('p1', { t: 'input', seq: ++seq, dx: 1, dy: 0 });
      h.advance(TICK_MS);
    }
    const moved = g.byId.get('p1')!.x - 1350;
    expect(moved).toBeLessThanOrEqual((ticks + 1 + INPUT_BURST) * STEP + 0.01);
  });
});
