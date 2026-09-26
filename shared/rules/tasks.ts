import type { CompiledMap } from '../map/compile';
import type { MapDef, TaskRecipe } from '../map/types';
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

function makeTask(recipe: TaskRecipe, map: MapDef, rng: Rng, idx: number, fake: boolean): TaskInst {
  const params: Record<string, string | number> = { seed: Math.floor(rng() * 1e9) };
  const stations: string[] = [];
  for (const pool of recipe.steps) {
    const free = pool.filter((id) => !stations.includes(id));
    stations.push(free.length === 1 ? free[0] : pick(rng, free));
  }
  const roomOf = (id: string) => map.stations.find((s) => s.id === id)?.room ?? '';
  if (recipe.type === 'divert') {
    params.target = roomOf(stations[1]);
    params.targets = recipe.steps[1].map(roomOf).join(',');
  }
  if (recipe.type === 'transfer') params.from = roomOf(stations[0]);
  return { id: `t${idx}-${recipe.type}`, type: recipe.type, category: recipe.category, stations, step: 0, done: false, params, fake };
}

/**
 * Commons are identical for everyone; short and long tasks are drawn per
 * player. Impostors get a fake list of the same shape.
 */
export function assignTasks(ids: string[], impostorIds: Set<string>, settings: GameSettings, rng: Rng, map: MapDef): Map<string, TaskInst[]> {
  const pool = (c: TaskCategory) => map.tasks.filter((r) => r.category === c);
  const commons = shuffle(rng, pool('common'))
    .slice(0, settings.commonTasks)
    .map((r, i) => makeTask(r, map, rng, i, false));
  const out = new Map<string, TaskInst[]>();
  for (const id of ids) {
    const fake = impostorIds.has(id);
    const list: TaskInst[] = commons.map((c) => ({ ...c, params: { ...c.params }, stations: [...c.stations], fake }));
    let n = list.length;
    for (const r of shuffle(rng, pool('short')).slice(0, settings.shortTasks)) list.push(makeTask(r, map, rng, n++, fake));
    for (const r of shuffle(rng, pool('long')).slice(0, settings.longTasks)) list.push(makeTask(r, map, rng, n++, fake));
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
