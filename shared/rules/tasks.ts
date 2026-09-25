import type { CompiledMap } from '../map/compile';
import { pick, shuffle, type Rng } from '../rng';
import type { GameSettings } from '../settings';
import type { TaskCategory, TaskType, TaskView } from '../types';

export interface TaskDef {
  type: TaskType;
  category: TaskCategory;
  name: string;
  /** Minimum ms between opening and completing each step (server-enforced). */
  minMs: number[];
}

export const TASK_DEFS: Record<TaskType, TaskDef> = {
  wires: { type: 'wires', category: 'common', name: 'Fix Wiring', minMs: [1200, 1200, 1200] },
  swipe: { type: 'swipe', category: 'common', name: 'Swipe Card', minMs: [700] },
  calibrate: { type: 'calibrate', category: 'short', name: 'Calibrate Distributor', minMs: [1500] },
  divert: { type: 'divert', category: 'short', name: 'Divert Power', minMs: [500, 300] },
  transfer: { type: 'transfer', category: 'short', name: 'Download Data', minMs: [6000, 6000] },
  align: { type: 'align', category: 'short', name: 'Align Engine Output', minMs: [400, 400] },
  steering: { type: 'steering', category: 'short', name: 'Stabilize Steering', minMs: [400] },
  fuel: { type: 'fuel', category: 'long', name: 'Fuel Engines', minMs: [2000, 2000] },
  asteroids: { type: 'asteroids', category: 'long', name: 'Clear Asteroids', minMs: [3000] },
  garbage: { type: 'garbage', category: 'long', name: 'Empty Garbage', minMs: [1200, 1200] },
  scan: { type: 'scan', category: 'long', name: 'Submit Scan', minMs: [8500] },
  simon: { type: 'simon', category: 'long', name: 'Start Reactor', minMs: [3000] },
};

export const COMMON_POOL: TaskType[] = ['wires', 'swipe'];
export const SHORT_POOL: TaskType[] = ['calibrate', 'divert', 'transfer', 'align', 'steering'];
export const LONG_POOL: TaskType[] = ['fuel', 'asteroids', 'garbage', 'scan', 'simon'];

export const WIRE_ROOMS = ['electrical', 'storage', 'admin', 'navigation', 'cafeteria', 'security'];
export const DIVERT_TARGETS = ['weapons', 'o2', 'navigation', 'shields', 'comms', 'upperEngine', 'lowerEngine', 'security'];
export const DOWNLOAD_ROOMS = ['cafeteria', 'weapons', 'navigation', 'comms', 'electrical'];

export interface TaskInst {
  id: string;
  type: TaskType;
  category: TaskCategory;
  stations: string[];
  step: number;
  done: boolean;
  params: Record<string, string | number>;
  /** Assigned to an impostor: never counts toward progress. */
  fake: boolean;
}

function makeTask(type: TaskType, rng: Rng, idx: number, fake: boolean): TaskInst {
  const def = TASK_DEFS[type];
  let stations: string[];
  const params: Record<string, string | number> = { seed: Math.floor(rng() * 1e9) };
  switch (type) {
    case 'wires': {
      const rooms = shuffle(rng, WIRE_ROOMS).slice(0, 3);
      stations = rooms.map((r) => `wires:${r}`);
      break;
    }
    case 'divert': {
      const target = pick(rng, DIVERT_TARGETS);
      params.target = target;
      stations = ['divert:electrical', `divert:${target}`];
      break;
    }
    case 'transfer': {
      const from = pick(rng, DOWNLOAD_ROOMS);
      params.from = from;
      stations = [`transfer:${from}`, 'transfer:admin'];
      break;
    }
    case 'align':
      stations = ['align:upperEngine', 'align:lowerEngine'];
      break;
    case 'fuel':
      stations = ['fuel:storage', `fuel:${pick(rng, ['upperEngine', 'lowerEngine'])}`];
      break;
    case 'garbage':
      stations = [`garbage:${pick(rng, ['cafeteria', 'o2'])}`, 'garbage:storage'];
      break;
    default: {
      const room = { swipe: 'admin', calibrate: 'electrical', steering: 'navigation', asteroids: 'weapons', scan: 'medbay', simon: 'reactor' }[
        type as 'swipe'
      ];
      stations = [`${type}:${room}`];
    }
  }
  return { id: `t${idx}-${type}`, type, category: def.category, stations, step: 0, done: false, params, fake };
}

/**
 * Commons are identical for everyone; short and long tasks are drawn per
 * player. Impostors get a fake list of the same shape.
 */
export function assignTasks(ids: string[], impostorIds: Set<string>, settings: GameSettings, rng: Rng): Map<string, TaskInst[]> {
  const commonTypes = shuffle(rng, COMMON_POOL).slice(0, settings.commonTasks);
  const commons = commonTypes.map((t, i) => makeTask(t, rng, i, false));
  const out = new Map<string, TaskInst[]>();
  for (const id of ids) {
    const fake = impostorIds.has(id);
    const list: TaskInst[] = commons.map((c) => ({ ...c, params: { ...c.params }, stations: [...c.stations], fake }));
    let n = list.length;
    for (const t of shuffle(rng, SHORT_POOL).slice(0, settings.shortTasks)) list.push(makeTask(t, rng, n++, fake));
    for (const t of shuffle(rng, LONG_POOL).slice(0, settings.longTasks)) list.push(makeTask(t, rng, n++, fake));
    out.set(id, list);
  }
  return out;
}

export function taskName(t: { type: TaskType; step: number }): string {
  if (t.type === 'transfer') return t.step === 0 ? 'Download Data' : 'Upload Data';
  if (t.type === 'divert' && t.step === 1) return 'Accept Diverted Power';
  return TASK_DEFS[t.type].name;
}

export function taskView(t: TaskInst, map: CompiledMap): TaskView {
  const stationId = t.stations[Math.min(t.step, t.stations.length - 1)];
  const room = map.stations.get(stationId)?.room ?? '';
  return {
    id: t.id,
    type: t.type,
    category: t.category,
    name: taskName(t),
    step: t.step,
    steps: t.stations.length,
    stationId,
    room: map.rooms.get(room)?.name ?? room,
    done: t.done,
    params: t.params,
  };
}
