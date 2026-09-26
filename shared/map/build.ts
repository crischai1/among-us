import type { Rect } from '../geom';
import type { TaskCategory, TaskType } from '../types';
import type { StationDef, StationKind, TaskRecipe } from './types';

/** A station; its id defaults to `kind:room`. */
export const st = (kind: StationKind, room: string, x: number, y: number, o: { id?: string; main?: boolean; area?: Rect } = {}): StationDef => ({
  id: o.id ?? `${kind}:${room}`, kind, room, x, y, ...(o.main ? { main: true } : {}), ...(o.area ? { area: o.area } : {}),
});

/** How far (x, y) is from being at a station: to its point, or to the edge of its area. */
export function stationDistance(s: StationDef, x: number, y: number): number {
  if (!s.area) return Math.hypot(x - s.x, y - s.y);
  const { x: ax, y: ay, w, h } = s.area;
  return Math.hypot(Math.max(ax - x, 0, x - ax - w), Math.max(ay - y, 0, y - ay - h));
}

/** Station ids `kind:room` for each room. */
export const ids = (kind: StationKind, rooms: string[]): string[] => rooms.map((r) => `${kind}:${r}`);

export const recipe = (type: TaskType, category: TaskCategory, steps: string[][]): TaskRecipe => ({ type, category, steps });

