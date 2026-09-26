import type { KillDistance } from './constants';

export type TaskBarUpdates = 'always' | 'meetings' | 'never';
export type MapId = 'skeld' | 'mira' | 'polus';

export interface GameSettings {
  map: MapId;
  impostors: number;
  killCooldown: number;
  killDistance: KillDistance;
  playerSpeed: number;
  crewVision: number;
  impostorVision: number;
  emergencyMeetings: number;
  emergencyCooldown: number;
  discussionTime: number;
  votingTime: number;
  confirmEjects: boolean;
  anonymousVotes: boolean;
  taskBarUpdates: TaskBarUpdates;
  commonTasks: number;
  shortTasks: number;
  longTasks: number;
  visualTasks: boolean;
  engineerCount: number;
  engineerChance: number;
  engineerVentCooldown: number;
  engineerVentDuration: number;
  scientistCount: number;
  scientistChance: number;
  scientistBattery: number;
  scientistCooldown: number;
  shapeshifterCount: number;
  shapeshifterChance: number;
  shapeshiftDuration: number;
  shapeshiftCooldown: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  map: 'skeld',
  impostors: 2,
  killCooldown: 25,
  killDistance: 'medium',
  playerSpeed: 1,
  crewVision: 1,
  impostorVision: 1.5,
  emergencyMeetings: 1,
  emergencyCooldown: 15,
  discussionTime: 15,
  votingTime: 120,
  confirmEjects: true,
  anonymousVotes: false,
  taskBarUpdates: 'always',
  commonTasks: 1,
  shortTasks: 2,
  longTasks: 1,
  visualTasks: true,
  engineerCount: 0,
  engineerChance: 0,
  engineerVentCooldown: 15,
  engineerVentDuration: 10,
  scientistCount: 0,
  scientistChance: 0,
  scientistBattery: 10,
  scientistCooldown: 15,
  shapeshifterCount: 0,
  shapeshifterChance: 0,
  shapeshiftDuration: 30,
  shapeshiftCooldown: 10,
};

type Key = keyof GameSettings;

export type SettingDef =
  | { key: Key; label: string; group: string; type: 'number'; min: number; max: number; step: number; unit?: string }
  | { key: Key; label: string; group: string; type: 'select'; options: { value: string; label: string }[] }
  | { key: Key; label: string; group: string; type: 'bool' };

const num = (key: Key, label: string, group: string, min: number, max: number, step: number, unit?: string): SettingDef => ({
  key, label, group, type: 'number', min, max, step, unit,
});

/** Drives both the lobby settings panel and server-side validation. */
export const SETTINGS_SCHEMA: SettingDef[] = [
  {
    key: 'map', label: 'Map', group: 'Map', type: 'select',
    options: [{ value: 'skeld', label: 'The Skeld' }, { value: 'mira', label: 'MIRA HQ' }, { value: 'polus', label: 'Polus' }],
  },
  num('impostors', 'Impostors', 'Impostors', 1, 3, 1),
  num('killCooldown', 'Kill Cooldown', 'Impostors', 10, 60, 2.5, 's'),
  {
    key: 'killDistance', label: 'Kill Distance', group: 'Impostors', type: 'select',
    options: [{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Long' }],
  },
  num('impostorVision', 'Impostor Vision', 'Impostors', 0.25, 5, 0.25, 'x'),
  num('playerSpeed', 'Player Speed', 'Crewmates', 0.5, 3, 0.25, 'x'),
  num('crewVision', 'Crewmate Vision', 'Crewmates', 0.25, 5, 0.25, 'x'),
  num('emergencyMeetings', 'Emergency Meetings', 'Meetings', 0, 9, 1),
  num('emergencyCooldown', 'Emergency Cooldown', 'Meetings', 0, 60, 5, 's'),
  num('discussionTime', 'Discussion Time', 'Meetings', 0, 120, 15, 's'),
  num('votingTime', 'Voting Time', 'Meetings', 15, 300, 15, 's'),
  { key: 'confirmEjects', label: 'Confirm Ejects', group: 'Meetings', type: 'bool' },
  { key: 'anonymousVotes', label: 'Anonymous Votes', group: 'Meetings', type: 'bool' },
  {
    key: 'taskBarUpdates', label: 'Task Bar Updates', group: 'Tasks', type: 'select',
    options: [{ value: 'always', label: 'Always' }, { value: 'meetings', label: 'Meetings' }, { value: 'never', label: 'Never' }],
  },
  num('commonTasks', 'Common Tasks', 'Tasks', 0, 2, 1),
  num('shortTasks', 'Short Tasks', 'Tasks', 0, 5, 1),
  num('longTasks', 'Long Tasks', 'Tasks', 0, 5, 1),
  { key: 'visualTasks', label: 'Visual Tasks', group: 'Tasks', type: 'bool' },
  num('engineerCount', 'Engineers', 'Engineer', 0, 3, 1),
  num('engineerChance', 'Chance', 'Engineer', 0, 100, 10, '%'),
  num('engineerVentCooldown', 'Vent Cooldown', 'Engineer', 0, 60, 2.5, 's'),
  num('engineerVentDuration', 'Max Time in Vents', 'Engineer', 5, 60, 2.5, 's'),
  num('scientistCount', 'Scientists', 'Scientist', 0, 3, 1),
  num('scientistChance', 'Chance', 'Scientist', 0, 100, 10, '%'),
  num('scientistBattery', 'Battery Duration', 'Scientist', 5, 30, 2.5, 's'),
  num('scientistCooldown', 'Vitals Cooldown', 'Scientist', 5, 60, 2.5, 's'),
  num('shapeshifterCount', 'Shapeshifters', 'Shapeshifter', 0, 3, 1),
  num('shapeshifterChance', 'Chance', 'Shapeshifter', 0, 100, 10, '%'),
  num('shapeshiftDuration', 'Shapeshift Duration', 'Shapeshifter', 5, 60, 5, 's'),
  num('shapeshiftCooldown', 'Shapeshift Cooldown', 'Shapeshifter', 5, 60, 2.5, 's'),
];

/** Apply an untrusted patch to settings, dropping unknown keys and clamping values. */
export function applySettingsPatch(base: GameSettings, patch: unknown): GameSettings {
  const out: GameSettings = { ...base };
  if (!patch || typeof patch !== 'object') return out;
  const rec = patch as Record<string, unknown>;
  const target = out as unknown as Record<string, unknown>;
  for (const def of SETTINGS_SCHEMA) {
    if (!(def.key in rec)) continue;
    const v = rec[def.key];
    if (def.type === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const snapped = Math.round((v - def.min) / def.step) * def.step + def.min;
      target[def.key] = Math.min(def.max, Math.max(def.min, Number(snapped.toFixed(3))));
    } else if (def.type === 'select') {
      if (def.options.some((o) => o.value === v)) target[def.key] = v;
    } else if (typeof v === 'boolean') {
      target[def.key] = v;
    }
  }
  return out;
}
