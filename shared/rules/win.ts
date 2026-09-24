import type { WinReason, Winner } from '../types';

export interface WinInput {
  impostorsAlive: number;
  crewAlive: number;
  tasksDone: number;
  tasksTotal: number;
  criticalExpired: boolean;
}

export function checkWin(i: WinInput): { winner: Winner; reason: WinReason } | null {
  if (i.criticalExpired) return { winner: 'impostors', reason: 'sabotage' };
  if (i.impostorsAlive === 0) return { winner: 'crew', reason: 'vote' };
  if (i.tasksTotal > 0 && i.tasksDone >= i.tasksTotal) return { winner: 'crew', reason: 'tasks' };
  if (i.impostorsAlive >= i.crewAlive) return { winner: 'impostors', reason: 'kills' };
  return null;
}
