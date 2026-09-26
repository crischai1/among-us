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
  return {
    kind, label: def.label, stations: [...def.stations], startedAt: now, endsAt, lights, reactorHeld: [], panelsDone: [],
    ...(kind === 'comms' && def.keypad ? { keypad: true } : {}),
  };
}

export function makeO2Code(rng: Rng): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += Math.floor(rng() * 10);
  return s;
}

/** Keypad comms: each station shows a new code this often. */
export const COMMS_CODE_MS = 10_000;

/**
 * The code a keypad comms station shows during time window `win`
 * (floor(time / COMMS_CODE_MS)). Deterministic, so the server can check it.
 */
export function commsCode(seed: number, stationId: string, win: number): string {
  let h = (seed ^ Math.imul(win + 1, 0x9e3779b1)) >>> 0;
  for (let i = 0; i < stationId.length; i++) h = Math.imul(h ^ stationId.charCodeAt(i), 0x01000193) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12;
  return String(h % 100000).padStart(5, '0');
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
  ctx: { o2Code: string; held?: string[]; commsCodes?: string[] },
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
      if (data === ctx.o2Code && !s.panelsDone.includes(stationId)) s.panelsDone.push(stationId);
      return s.stations.every((id) => s.panelsDone.includes(id));
    case 'comms':
      if (!s.keypad) return data === 'tuned';
      if (typeof data === 'string' && ctx.commsCodes?.includes(data) && !s.panelsDone.includes(stationId)) s.panelsDone.push(stationId);
      return s.stations.every((id) => s.panelsDone.includes(id));
  }
}
