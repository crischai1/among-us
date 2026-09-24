import { O2_MS, REACTOR_MS } from '../constants';
import type { Rng } from '../rng';
import type { SabotageKind, SabotageState } from '../types';

export const LIGHT_SWITCHES = 5;

export const SABOTAGE_STATIONS: Record<SabotageKind, string[]> = {
  lights: ['lights:electrical'],
  reactor: ['reactor:top', 'reactor:bottom'],
  o2: ['o2:o2', 'o2:admin'],
  comms: ['comms:comms'],
};

export const SABOTAGE_LABEL: Record<SabotageKind, string> = {
  lights: 'Fix Lights',
  reactor: 'Reactor Meltdown',
  o2: 'Oxygen Depleted',
  comms: 'Comms Sabotaged',
};

export function newSabotage(kind: SabotageKind, now: number, rng: Rng): SabotageState {
  let lights: boolean[] | null = null;
  if (kind === 'lights') {
    lights = Array.from({ length: LIGHT_SWITCHES }, () => rng() < 0.5);
    lights[Math.floor(rng() * LIGHT_SWITCHES)] = false;
  }
  const endsAt = kind === 'reactor' ? now + REACTOR_MS : kind === 'o2' ? now + O2_MS : null;
  return { kind, startedAt: now, endsAt, lights, reactorHeld: [], o2Done: [] };
}

export function makeO2Code(rng: Rng): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += Math.floor(rng() * 10);
  return s;
}

/**
 * Apply one fix interaction. Reactor holds are tracked by the caller (it knows
 * who is holding what); pass the resulting held station ids in `held`.
 * Returns true once the sabotage is fully fixed.
 */
export function applyFix(
  s: SabotageState,
  stationId: string,
  data: number | boolean | string,
  ctx: { o2Code: string; held?: string[] },
): boolean {
  if (!SABOTAGE_STATIONS[s.kind].includes(stationId)) return false;
  switch (s.kind) {
    case 'lights': {
      if (typeof data !== 'number' || !s.lights || data < 0 || data >= s.lights.length) return false;
      s.lights[data] = !s.lights[data];
      return s.lights.every(Boolean);
    }
    case 'reactor':
      s.reactorHeld = ctx.held ?? s.reactorHeld;
      return SABOTAGE_STATIONS.reactor.every((id) => s.reactorHeld.includes(id));
    case 'o2':
      if (data === ctx.o2Code && !s.o2Done.includes(stationId)) s.o2Done.push(stationId);
      return SABOTAGE_STATIONS.o2.every((id) => s.o2Done.includes(id));
    case 'comms':
      return data === 'tuned';
  }
}
