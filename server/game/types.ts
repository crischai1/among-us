import type { TaskInst } from '../../shared/rules/tasks';
import type { ConsoleKind, MeetingStage, Role, VoteResults } from '../../shared/types';

export interface Input {
  seq: number;
  dx: number;
  dy: number;
}

export interface SPlayer {
  id: string;
  name: string;
  color: number;
  /** Opaque per-game entity id sent in snapshots. */
  eid: number;
  /** Index in the roster (pub.players order). */
  idx: number;
  role: Role;
  alive: boolean;
  connected: boolean;
  removed: boolean;
  /** Death has been revealed to everyone (meeting or ejection). */
  knownDead: boolean;
  x: number;
  y: number;
  gen: number;
  inputs: Input[];
  lastSeq: number;
  tasks: TaskInst[];
  killReadyAt: number;
  emergencyUsed: number;
  venting: string | null;
  ventReadyAt: number;
  ventEndsAt: number | null;
  openStation: { id: string; at: number } | null;
  console: ConsoleKind | null;
  battery: { leftMs: number; readyAt: number; open: boolean } | null;
  shift: { as: string | null; endsAt: number; readyAt: number } | null;
  vote: string | null;
  lastChatAt: number;
  noclip: boolean;
}

export interface Body {
  id: number;
  x: number;
  y: number;
  color: number;
  victimId: string;
}

export interface Meeting {
  stage: MeetingStage;
  endsAt: number;
  kind: 'emergency' | 'report';
  callerId: string;
  bodyColor: number | null;
  votes: Record<string, string>;
  results: VoteResults | null;
}

/** Take this tick's inputs: one normally, two when the client is catching up. */
export function takeInputs(p: { inputs: Input[] }): Input[] {
  const n = p.inputs.length > 3 ? 2 : 1;
  return p.inputs.splice(0, n);
}

export const MAX_QUEUED_INPUTS = 8;

/** Validate and enqueue an input. Returns false if rejected. */
export function queueInput(p: { inputs: Input[]; lastSeq: number }, seq: unknown, dx: unknown, dy: unknown): boolean {
  if (typeof seq !== 'number' || !Number.isInteger(seq)) return false;
  if (dx !== -1 && dx !== 0 && dx !== 1) return false;
  if (dy !== -1 && dy !== 0 && dy !== 1) return false;
  const last = p.inputs.length ? p.inputs[p.inputs.length - 1].seq : p.lastSeq;
  if (seq <= last) return false;
  p.inputs.push({ seq, dx, dy });
  if (p.inputs.length > MAX_QUEUED_INPUTS) {
    const dropped = p.inputs.splice(0, p.inputs.length - MAX_QUEUED_INPUTS);
    p.lastSeq = dropped[dropped.length - 1].seq;
  }
  return true;
}
