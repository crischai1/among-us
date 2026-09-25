import type { TaskType } from '../../shared/types';

/** Icon and accent color per task, shared by the world, task list, map and task frames. */
export const TASK_THEME: Record<TaskType, { icon: string; color: string }> = {
  wires: { icon: '🔌', color: '#ff5a4a' },
  swipe: { icon: '💳', color: '#3fdc6c' },
  calibrate: { icon: '🎛️', color: '#2d9bff' },
  divert: { icon: '⚡', color: '#ffd23b' },
  transfer: { icon: '💾', color: '#46b1ff' },
  align: { icon: '🎚️', color: '#ff8a3b' },
  steering: { icon: '🧭', color: '#2fd6c6' },
  fuel: { icon: '⛽', color: '#e0472e' },
  asteroids: { icon: '☄️', color: '#b884ff' },
  garbage: { icon: '🗑️', color: '#8fbf5a' },
  scan: { icon: '🩺', color: '#41ff7a' },
  simon: { icon: '⚛️', color: '#4bb4ff' },
};
