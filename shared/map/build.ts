import type { TaskCategory, TaskType } from '../types';
import type { StationDef, StationKind, TaskRecipe } from './types';

/** A station; its id defaults to `kind:room`. */
export const st = (kind: StationKind, room: string, x: number, y: number, o: { id?: string; main?: boolean } = {}): StationDef => ({
  id: o.id ?? `${kind}:${room}`, kind, room, x, y, ...(o.main ? { main: true } : {}),
});

/** Station ids `kind:room` for each room. */
export const ids = (kind: StationKind, rooms: string[]): string[] => rooms.map((r) => `${kind}:${r}`);

export const recipe = (type: TaskType, category: TaskCategory, steps: string[][]): TaskRecipe => ({ type, category, steps });

