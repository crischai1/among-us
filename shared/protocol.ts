import type { BodyTuple, ConsoleKind, EntTuple, GameEvent, PrivState, PubState, Role, RoomState, SabotageKind } from './types';

/** Messages a client sends to the server. */
export type ClientMessage =
  | { t: 'create'; name: string }
  | { t: 'join'; code: string; name: string; token?: string }
  | { t: 'leave' }
  | { t: 'setColor'; color: number }
  | { t: 'setHat'; hat: number }
  | { t: 'setSettings'; patch: Record<string, unknown> }
  | { t: 'start' }
  | { t: 'kick'; id: string }
  | { t: 'addBot' }
  | { t: 'devRole'; role: Role | null }
  | { t: 'input'; seq: number; dx: number; dy: number }
  | { t: 'ping'; c: number }
  | { t: 'taskOpen'; stationId: string }
  | { t: 'taskDone'; stationId: string }
  | { t: 'taskClose' }
  | { t: 'kill'; target: number }
  | { t: 'report'; bodyId: number }
  | { t: 'emergency' }
  | { t: 'vent'; action: 'enter' | 'move' | 'exit'; ventId?: string }
  | { t: 'sabotage'; kind: SabotageKind | 'doors'; room?: string }
  | { t: 'fix'; kind: SabotageKind; stationId: string; data: number | boolean | string }
  | { t: 'openDoor'; doorId: string }
  | { t: 'console'; kind: ConsoleKind; open: boolean }
  | { t: 'portableVitals'; open: boolean }
  | { t: 'shapeshift'; target: string }
  | { t: 'revert' }
  | { t: 'chat'; text: string }
  | { t: 'vote'; target: string }
  | { t: 'dev'; cmd: string };

export interface SnapMessage {
  t: 'snap';
  /** Server time of this snapshot (ms). */
  time: number;
  /** Last input seq processed for this client. */
  ack: number;
  /** Increments whenever the server teleports this client. */
  gen: number;
  /** Own authoritative position and flags, or null if not in the world. */
  you: [number, number, number] | null;
  ents: EntTuple[];
  bodies: BodyTuple[];
}

/** Messages the server sends to clients. */
export type ServerMessage =
  | { t: 'joined'; selfId: string; token: string; code: string }
  | { t: 'lobby'; room: RoomState }
  | { t: 'pub'; state: PubState }
  | { t: 'priv'; state: PrivState }
  | SnapMessage
  | { t: 'ev'; ev: GameEvent }
  | { t: 'error'; message: string }
  | { t: 'pong'; c: number; s: number }
  | { t: 'kicked' };
