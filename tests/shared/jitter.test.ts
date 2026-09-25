import { describe, expect, it } from 'vitest';
import { INTERP_DELAY_MS } from '../../shared/constants';
import { JitterBuffer, MAX_EXTRAPOLATE_MS, MAX_INTERP_DELAY_MS, sampleAt } from '../../src/net/jitter';

describe('jitter buffer', () => {
  it('stays at the base delay on a steady connection', () => {
    const j = new JitterBuffer();
    for (let i = 0; i < 100; i++) j.note(5 + (i % 3));
    expect(j.delay).toBeCloseTo(INTERP_DELAY_MS, 0);
  });

  it('grows quickly when snapshots arrive late, then recovers slowly', () => {
    const j = new JitterBuffer();
    for (let i = 0; i < 30; i++) j.note(i % 3 === 0 ? 260 : 10);
    expect(j.delay).toBeGreaterThan(280);
    expect(j.delay).toBeLessThanOrEqual(MAX_INTERP_DELAY_MS);
    const high = j.delay;
    for (let i = 0; i < 120; i++) j.note(8);
    expect(j.delay).toBeLessThan(high);
    expect(j.delay).toBeGreaterThanOrEqual(INTERP_DELAY_MS);
  });
});

describe('sampleAt', () => {
  const sm = [
    { t: 0, x: 0, y: 0, flags: 0, look: 1 },
    { t: 100, x: 10, y: 0, flags: 0, look: 1 },
  ];
  it('interpolates between samples', () => {
    expect(sampleAt(sm, 50).x).toBeCloseTo(5);
  });
  it('extrapolates briefly when a snapshot is overdue, instead of freezing', () => {
    expect(sampleAt(sm, 150).x).toBeCloseTo(15);
    expect(sampleAt(sm, 10_000).x).toBeCloseTo(10 + MAX_EXTRAPOLATE_MS / 10);
  });
});
