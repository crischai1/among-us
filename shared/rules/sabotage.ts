import { O2_MS, REACTOR_MS } from '../constants';
import type { SabotageDef } from '../map/types';
import type { Rng } from '../rng';
import type { SabotageKind, SabotageState } from '../types';

export const LIGHT_SWITCHES = 5;

/** Default names and icons; a map can rename them. */
export const SABOTAGE_LABEL: Record<SabotageKind, string> = {
  lights: 'Fix Lights',
  reactor: 'Reactor Meltdown',
  o2: 'Oxygen Depleted',
  comms: 'Comms Sabotaged',
};

export const SABOTAGE_ICON: Record<SabotageKind, string> = {
  lights: '💡',
  reactor: '☢',
  o2: '🫧',
  comms: '📡',
};

/** Shorthand for map files: a sabotage with its default name and icon. */
export const sab = (kind: SabotageKind, room: string, stations: string[], extra: Partial<SabotageDef> = {}): SabotageDef => ({
  kind, room, stations, label: SABOTAGE_LABEL[kind], icon: SABOTAGE_ICON[kind], ...extra,
});

export function newSabotage(def: SabotageDef, now: number, rng: Rng): SabotageState {
  const { kind } = def;
  let lights: boolean[] | null = null;
  if (kind === 'lights') {
    lights = Array.from({ length: LIGHT_SWITCHES }, () => rng() < 0.5);
    lights[Math.floor(rng() * LIGHT_SWITCHES)] = false;
  }
  const ms = def.ms ?? (kind === 'reactor' ? REACTOR_MS : kind === 'o2' ? O2_MS : 0);
  const endsAt = kind === 'reactor' || kind === 'o2' ? now + ms : null;
  return { kind, label: def.label, stations: [...def.stations], startedAt: now, endsAt, lights, reactorHeld: [], o2Done: [] };
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
  if (!s.stations.includes(stationId)) return false;
  switch (s.kind) {
    case 'lights': {
      if (typeof data !== 'number' || !s.lights || data < 0 || data >= s.lights.length) return false;
      s.lights[data] = !s.lights[data];
      return s.lights.every(Boolean);
    }
    case 'reactor':
      s.reactorHeld = ctx.held ?? s.reactorHeld;
      return s.stations.every((id) => s.reactorHeld.includes(id));
    case 'o2':
      if (data === ctx.o2Code && !s.o2Done.includes(stationId)) s.o2Done.push(stationId);
      return s.stations.every((id) => s.o2Done.includes(id));
    case 'comms':
      return data === 'tuned';
  }
}
