import type { TaskInst } from '../../shared/rules/tasks';
import type { ConsoleKind, MeetingStage, Role, VoteResults } from '../../shared/types';

export interface Input {
  seq: number;
  dx: number;
  dy: number;
}

export interface SPlayer extends InputQueue {
  id: string;
  name: string;
  color: number;
  hat: number;
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
  /** Open task/fix panel; `seq` = last input the client had sent when it opened. */
  openStation: { id: string; at: number; seq: number } | null;
  console: ConsoleKind | null;
  /** Last input seq when the console opened. */
  consoleSeq: number;
  battery: { leftMs: number; readyAt: number; open: boolean } | null;
  shift: { as: string | null; endsAt: number; readyAt: number } | null;
  vote: string | null;
  lastChatAt: number;
  noclip: boolean;
  /** Position at the start of the current tick (door-log sensors). */
  prevX: number;
  prevY: number;
  /** Decontamination room the player has been sprayed in and not yet left. */
  deconDone: string | null;
  /** sensor id -> last time this player tripped it. */
  sensorAt: Record<string, number>;
}

export interface Body {
  id: number;
  x: number;
  y: number;
  color: number;
  hat: number;
  victimId: string;
  /** Server time of the kill. */
  at: number;
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

/** Inputs held while a laggy connection catches up (2 s at 30 Hz). */
export const MAX_QUEUED_INPUTS = 60;
/** Extra ticks of movement a player may bank to catch up after a network stall. */
export const INPUT_BURST = 20;
/** Fastest catch-up rate: inputs applied in one tick. */
export const MAX_INPUTS_PER_TICK = 3;

export interface InputQueue {
  inputs: Input[];
  lastSeq: number;
  /** Token bucket: +1 per tick, capped at INPUT_BURST; each applied input costs 1. */
  inputBudget: number;
}

/**
 * Take this tick's inputs. Normally one; after a stall (bursty wifi) up to
 * MAX_INPUTS_PER_TICK so the backlog drains without dropping anything. The
 * budget means total movement can never exceed real time plus INPUT_BURST
 * ticks, so sending extra inputs doesn't make anyone faster.
 */
export function takeInputs(p: InputQueue): Input[] {
  p.inputBudget = Math.min(INPUT_BURST, p.inputBudget + 1);
  const want = p.inputs.length > 2 ? MAX_INPUTS_PER_TICK : 1;
  const n = Math.min(p.inputs.length, want, Math.floor(p.inputBudget));
  p.inputBudget -= n;
  return p.inputs.splice(0, n);
}

/** Validate and enqueue an input. Returns false if rejected. */
/** Newest input seq received from this player (queued or applied). */
export function latestSeq(p: { inputs: Input[]; lastSeq: number }): number {
  return p.inputs.length ? p.inputs[p.inputs.length - 1].seq : p.lastSeq;
}

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
