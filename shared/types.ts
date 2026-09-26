import type { GameSettings } from './settings';

export type Role = 'crewmate' | 'impostor' | 'engineer' | 'scientist' | 'shapeshifter';
export const ROLES: readonly Role[] = ['crewmate', 'impostor', 'engineer', 'scientist', 'shapeshifter'];
export const isImpostorRole = (r: Role): boolean => r === 'impostor' || r === 'shapeshifter';
export const canVentRole = (r: Role): boolean => r === 'impostor' || r === 'shapeshifter' || r === 'engineer';

export const ROLE_LABEL: Record<Role, string> = {
  crewmate: 'Crewmate',
  impostor: 'Impostor',
  engineer: 'Engineer',
  scientist: 'Scientist',
  shapeshifter: 'Shapeshifter',
};

export type Phase = 'reveal' | 'playing' | 'meeting' | 'ejection' | 'gameover';
export type MeetingStage = 'intro' | 'discussion' | 'voting' | 'results';

export type TaskType =
  | 'wires' | 'swipe'
  | 'calibrate' | 'divert' | 'transfer' | 'align' | 'steering'
  | 'fuel' | 'asteroids' | 'garbage' | 'scan' | 'simon'
  // MIRA HQ
  | 'idcode' | 'diagnostics' | 'water' | 'beverage' | 'weather' | 'samples'
  | 'artifact' | 'process' | 'manifolds' | 'filter' | 'shields' | 'chart'
  // Polus
  | 'keys' | 'boarding' | 'telescope' | 'canisters' | 'node' | 'tree' | 'waterways'
  | 'wifi' | 'temperature' | 'drill' | 'jug' | 'artifacts' | 'sample';
export type TaskCategory = 'common' | 'short' | 'long';

export type SabotageKind = 'lights' | 'reactor' | 'o2' | 'comms';
export const CRITICAL_SABOTAGES: readonly SabotageKind[] = ['reactor', 'o2'];
export type ConsoleKind = 'cams' | 'admin' | 'vitals' | 'doorlog';

export type Winner = 'crew' | 'impostors';
export type WinReason = 'tasks' | 'vote' | 'kills' | 'sabotage' | 'disconnect' | 'dev';

// ---- Lobby ----

export interface LobbyMember {
  id: string;
  name: string;
  color: number;
  connected: boolean;
  isHost: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  members: LobbyMember[];
  settings: GameSettings;
  inGame: boolean;
  dev: boolean;
}

// ---- Game (public, filtered per viewer) ----

export interface PubPlayer {
  id: string;
  name: string;
  color: number;
  /** Dead as far as this viewer is allowed to know. */
  dead: boolean;
  disconnected: boolean;
}

export interface VoteResults {
  /** voterId -> targetId | 'skip'. Null when votes are anonymous. */
  votes: Record<string, string> | null;
  /** targetId | 'skip' -> count */
  counts: Record<string, number>;
  ejectedId: string | null;
  tie: boolean;
}

export interface MeetingState {
  stage: MeetingStage;
  endsAt: number;
  kind: 'emergency' | 'report';
  callerId: string;
  bodyColor: number | null;
  votedIds: string[];
  results: VoteResults | null;
}

export interface SabotageState {
  kind: SabotageKind;
  /** Display name from the map, e.g. "Reactor Meltdown". */
  label: string;
  /** Stations that fix it on the current map. */
  stations: string[];
  startedAt: number;
  /** Critical sabotages end the game at this time. */
  endsAt: number | null;
  lights: boolean[] | null;
  /** Reactor hand-scanner station ids currently held. */
  reactorHeld: string[];
  /** Keypad station ids completed (O2, and comms on maps with comms keypads). */
  panelsDone: string[];
  /** Comms is fixed by typing a code at every station rather than tuning one dial. */
  keypad?: boolean;
}

/** One door-log line: someone walked through a sensor. */
export interface DoorLogEntry {
  color: number;
  sensor: string;
  at: number;
}

export interface EjectionInfo {
  ejectedId: string | null;
  color: number | null;
  text: string;
  subtext: string;
}

export interface GameOverInfo {
  winner: Winner;
  reason: WinReason;
  roles: Record<string, Role>;
}

export interface PubState {
  phase: Phase;
  phaseEndsAt: number;
  players: PubPlayer[];
  taskBar: number | null;
  sabotage: SabotageState | null;
  /** doorId -> time it reopens */
  doors: Record<string, number>;
  camsInUse: boolean;
  buttonReadyAt: number;
  meeting: MeetingState | null;
  ejection: EjectionInfo | null;
  gameOver: GameOverInfo | null;
}

// ---- Game (private, one player) ----

export interface TaskView {
  id: string;
  type: TaskType;
  category: TaskCategory;
  name: string;
  step: number;
  steps: number;
  /** Station of the current step (or last step once done). */
  stationId: string;
  room: string;
  done: boolean;
  params: Record<string, string | number>;
}

export interface VitalsEntry {
  id: string;
  state: 'alive' | 'dead' | 'disconnected';
}

export interface PrivState {
  role: Role;
  /** Impostor-team member ids (only for impostors). */
  team: string[];
  tasks: TaskView[];
  commsDown: boolean;
  killReadyAt: number;
  emergencyLeft: number;
  venting: string | null;
  ventReadyAt: number;
  ventEndsAt: number | null;
  sabotageReadyAt: number;
  doorReadyAt: Record<string, number>;
  openStation: string | null;
  console: ConsoleKind | null;
  admin: Record<string, number> | null;
  vitals: VitalsEntry[] | null;
  battery: { leftMs: number; readyAt: number; open: boolean } | null;
  shift: { as: string | null; endsAt: number; readyAt: number } | null;
  o2Code: string | null;
  /** Comms keypad code at the open station, and when it changes. */
  commsCode: { code: string; until: number } | null;
  /** Door log, newest first (only while the console is open). */
  doorLog: DoorLogEntry[] | null;
  vote: string | null;
}

// ---- Snapshots ----

/** [entityId, x, y, flags, lookIndex] – lookIndex indexes the current roster. */
export type EntTuple = [number, number, number, number, number];
/** [bodyId, x, y, color, diedAt] – diedAt is server time, for the fall animation. */
export type BodyTuple = [number, number, number, number, number];

export const F_GHOST = 1;
export const F_SCANNING = 2;
export const F_TEAMMATE = 4;
export const F_DISCONNECTED = 8;

export type GameEvent =
  | { k: 'killed'; killerColor: number }
  | { k: 'meeting'; kind: 'emergency' | 'report'; callerColor: number; bodyColor: number | null }
  | { k: 'chat'; channel: 'lobby' | 'meeting' | 'ghost'; fromId: string; name: string; color: number; text: string; dead: boolean; at: number }
  | { k: 'voted'; voterId: string }
  | { k: 'vent'; x: number; y: number }
  | { k: 'shift'; x: number; y: number }
  | { k: 'doorSlam'; room: string }
  | { k: 'notice'; text: string };
