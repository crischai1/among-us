import type { CompiledMap } from '../map/compile';
import type { MapDef, TaskRecipe } from '../map/types';
import { pick, shuffle, type Rng } from '../rng';
import type { GameSettings } from '../settings';
import type { TaskCategory, TaskType, TaskView } from '../types';

/** How long Run Diagnostics takes before you can come back for the results. */
export const DIAGNOSTICS_MS = 60_000;
/** Polus: Reboot Wifi and Inspect Sample make you wait this long between steps. */
export const REBOOT_MS = 60_000;

export interface TaskDef {
  type: TaskType;
  category: TaskCategory;
  name: string;
  /** Minimum ms between opening and completing each step (server-enforced). */
  minMs: number[];
  /** Ms to wait after a step before the next one can start (Run Diagnostics). */
  waitMs?: number[];
}

export const TASK_DEFS: Record<TaskType, TaskDef> = {
  wires: { type: 'wires', category: 'common', name: 'Fix Wiring', minMs: [1200, 1200, 1200] },
  swipe: { type: 'swipe', category: 'common', name: 'Swipe Card', minMs: [700] },
  calibrate: { type: 'calibrate', category: 'short', name: 'Calibrate Distributor', minMs: [1500] },
  divert: { type: 'divert', category: 'short', name: 'Divert Power', minMs: [500, 300] },
  transfer: { type: 'transfer', category: 'short', name: 'Download Data', minMs: [6000, 6000] },
  align: { type: 'align', category: 'short', name: 'Align Engine Output', minMs: [400, 400] },
  steering: { type: 'steering', category: 'short', name: 'Stabilize Steering', minMs: [400] },
  fuel: { type: 'fuel', category: 'long', name: 'Fuel Engines', minMs: [2000, 2000, 2000, 2000] },
  asteroids: { type: 'asteroids', category: 'long', name: 'Clear Asteroids', minMs: [3000] },
  garbage: { type: 'garbage', category: 'long', name: 'Empty Garbage', minMs: [1200, 1200] },
  scan: { type: 'scan', category: 'long', name: 'Submit Scan', minMs: [8500] },
  simon: { type: 'simon', category: 'long', name: 'Start Reactor', minMs: [3000] },
  idcode: { type: 'idcode', category: 'common', name: 'Enter ID Code', minMs: [1500] },
  diagnostics: { type: 'diagnostics', category: 'long', name: 'Run Diagnostics', minMs: [300, 300], waitMs: [0, DIAGNOSTICS_MS] },
  water: { type: 'water', category: 'long', name: 'Water Plants', minMs: [600, 1500] },
  beverage: { type: 'beverage', category: 'short', name: 'Buy Beverage', minMs: [1500] },
  weather: { type: 'weather', category: 'short', name: 'Measure Weather', minMs: [3000] },
  samples: { type: 'samples', category: 'short', name: 'Sort Samples', minMs: [2000] },
  artifact: { type: 'artifact', category: 'short', name: 'Assemble Artifact', minMs: [1500] },
  process: { type: 'process', category: 'short', name: 'Process Data', minMs: [4000] },
  manifolds: { type: 'manifolds', category: 'short', name: 'Unlock Manifolds', minMs: [2000] },
  filter: { type: 'filter', category: 'short', name: 'Clean O2 Filter', minMs: [1500] },
  shields: { type: 'shields', category: 'short', name: 'Prime Shields', minMs: [800] },
  chart: { type: 'chart', category: 'short', name: 'Chart Course', minMs: [1200] },
  keys: { type: 'keys', category: 'common', name: 'Insert Keys', minMs: [800] },
  boarding: { type: 'boarding', category: 'common', name: 'Scan Boarding Pass', minMs: [1500] },
  telescope: { type: 'telescope', category: 'short', name: 'Align Telescope', minMs: [1200] },
  canisters: { type: 'canisters', category: 'long', name: 'Fill Canisters', minMs: [2500] },
  node: { type: 'node', category: 'long', name: 'Fix Weather Node', minMs: [1500, 400] },
  tree: { type: 'tree', category: 'short', name: 'Monitor Tree', minMs: [1500] },
  waterways: { type: 'waterways', category: 'long', name: 'Open Waterways', minMs: [1200, 1200, 1200] },
  wifi: { type: 'wifi', category: 'long', name: 'Reboot Wifi', minMs: [400, 400], waitMs: [0, REBOOT_MS] },
  temperature: { type: 'temperature', category: 'short', name: 'Record Temperature', minMs: [1000] },
  drill: { type: 'drill', category: 'short', name: 'Repair Drill', minMs: [1200] },
  jug: { type: 'jug', category: 'long', name: 'Replace Water Jug', minMs: [2000, 2000] },
  artifacts: { type: 'artifacts', category: 'short', name: 'Store Artifacts', minMs: [2000] },
  sample: { type: 'sample', category: 'long', name: 'Inspect Sample', minMs: [300, 300], waitMs: [0, REBOOT_MS] },
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
    // A step may come back to a station already used (start, then collect results).
    const free = pool.filter((id) => !stations.includes(id));
    const from = free.length ? free : pool;
    stations.push(from.length === 1 ? from[0] : pick(rng, from));
  }
  const roomOf = (id: string) => map.stations.find((s) => s.id === id)?.room ?? '';
  if (recipe.type === 'divert') {
    params.target = roomOf(stations[1]);
    params.targets = recipe.steps[1].map(roomOf).join(',');
  }
  if (recipe.type === 'transfer' || recipe.type === 'temperature') params.from = roomOf(stations[0]);
  // Which outdoor weather node was fixed, so the lab panel can switch that one on.
  if (recipe.type === 'node') params.node = stations[0].split(':')[1];
  return { id: `t${idx}-${recipe.type}`, type: recipe.type, category: recipe.category, stations, step: 0, done: false, params, fake };
}

/** Finish the current step: advance, and start any wait before the next one. */
export function advanceTask(t: TaskInst, now: number): void {
  t.step++;
  if (t.step >= t.stations.length) {
    t.done = true;
    t.step = t.stations.length - 1;
    delete t.params.readyAt;
    return;
  }
  const wait = TASK_DEFS[t.type].waitMs?.[t.step] ?? 0;
  if (wait > 0) t.params.readyAt = now + wait;
  else delete t.params.readyAt;
}

/** A step that is still waiting (Run Diagnostics) can't be opened yet. */
export const taskReady = (t: { params: Record<string, string | number> }, now: number): boolean =>
  typeof t.params.readyAt !== 'number' || now >= t.params.readyAt;

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
  if (t.type === 'water' && t.step === 0) return 'Retrieve Watering Can';
  if (t.type === 'node' && t.step === 1) return 'Start Weather Node';
  if (t.type === 'jug' && t.step === 0) return 'Fill Water Jug';
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
