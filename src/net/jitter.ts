import { INTERP_DELAY_MS } from '../../shared/constants';

/** Never render remote players further in the past than this. */
export const MAX_INTERP_DELAY_MS = 450;
/** How far a remote player may be extrapolated when snapshots are overdue. */
export const MAX_EXTRAPOLATE_MS = 150;

/**
 * Adaptive jitter buffer. Remote players render `delay` ms in the past; on a
 * steady connection that's INTERP_DELAY_MS, and when snapshots start arriving
 * late (bad wifi) it grows to cover the 95th-percentile lateness, then shrinks
 * back slowly once the connection recovers.
 */
export class JitterBuffer {
  delay = INTERP_DELAY_MS;
  private late: number[] = [];

  /** `lateMs` = our estimate of server time on arrival minus the snapshot's server time. */
  note(lateMs: number): void {
    this.late.push(lateMs);
    if (this.late.length > 90) this.late.shift();
    const sorted = [...this.late].sort((a, b) => a - b);
    const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)];
    const target = Math.min(MAX_INTERP_DELAY_MS, Math.max(INTERP_DELAY_MS, p95 + 50));
    // Grow fast so players stop freezing; shrink slowly so it doesn't oscillate.
    const k = target > this.delay ? 0.5 : 0.02;
    this.delay += (target - this.delay) * k;
  }
}

export interface Sampled {
  x: number;
  y: number;
  flags: number;
  look: number;
}

/**
 * Position at time t from timestamped samples: interpolate between the two
 * around t; if t is past the newest sample (snapshot overdue), keep moving at
 * the last known velocity for up to MAX_EXTRAPOLATE_MS instead of freezing.
 */
export function sampleAt<S extends Sampled & { t: number }>(sm: S[], t: number): Sampled {
  const last = sm[sm.length - 1];
  if (t >= last.t) {
    if (sm.length < 2) return last;
    const prev = sm[sm.length - 2];
    const span = last.t - prev.t;
    if (span <= 0 || span > 250) return last;
    const ahead = Math.min(t - last.t, MAX_EXTRAPOLATE_MS);
    return { ...last, x: last.x + ((last.x - prev.x) / span) * ahead, y: last.y + ((last.y - prev.y) / span) * ahead };
  }
  if (t <= sm[0].t) return sm[0];
  for (let i = sm.length - 1; i > 0; i--) {
    const a = sm[i - 1];
    const b = sm[i];
    if (a.t <= t && t <= b.t) {
      const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      const near = k < 0.5 ? a : b;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, flags: near.flags, look: near.look };
    }
  }
  return last;
}
