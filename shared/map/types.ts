import type { Rect, Seg, Vec } from '../geom';
import type { SabotageKind, TaskCategory, TaskType } from '../types';

export type FloorKind = 'metal' | 'tile' | 'dark' | 'white' | 'grate' | 'carpet';

export interface RoomDef {
  id: string;
  name: string;
  rects: Rect[];
  floor: FloorKind;
}

export type PropKind =
  | 'table' | 'bigTable' | 'engine' | 'reactorCore' | 'crates' | 'bed' | 'desk'
  | 'navConsole' | 'chair' | 'adminTable' | 'box' | 'cabinets';

export interface ObstacleDef {
  rect?: Rect;
  circle?: { x: number; y: number; r: number };
  blocksVision: boolean;
  prop: PropKind;
}

export interface DoorDef {
  id: string;
  room: string;
  seg: Seg;
}

export interface VentDef {
  id: string;
  room: string;
  x: number;
  y: number;
  links: string[];
}

export type StationKind =
  | TaskType
  | 'lights' | 'reactor' | 'o2' | 'comms'
  | 'cams' | 'admin' | 'vitals'
  | 'laptop';

export interface StationDef {
  id: string;
  kind: StationKind;
  room: string;
  x: number;
  y: number;
  /** The hub end of a multi-station task (power switchboard, fuel cans): drawn bigger. */
  main?: boolean;
}

export interface CameraDef {
  id: string;
  name: string;
  x: number;
  y: number;
  view: Rect;
}

/** A sabotage this map supports and where it is fixed. */
export interface SabotageDef {
  kind: SabotageKind;
  /** Room the sabotage button sits over on the impostor map. */
  room: string;
  label: string;
  icon: string;
  /** Fix stations: all of them for reactor/o2, any one for lights/comms. */
  stations: string[];
  /** Countdown for critical sabotages (defaults per kind). */
  ms?: number;
}

/**
 * How one task type is drawn on this map: one station is picked per step
 * from its pool, never repeating a station within the task.
 */
export interface TaskRecipe {
  type: TaskType;
  category: TaskCategory;
  steps: string[][];
}

export interface MapTheme {
  /** Colour outside the walls. */
  void: string;
  /** Floor used for halls. */
  hall: FloorKind;
}

export interface MapDef {
  id: string;
  name: string;
  theme: MapTheme;
  size: { w: number; h: number };
  rooms: RoomDef[];
  halls: Rect[];
  obstacles: ObstacleDef[];
  doors: DoorDef[];
  vents: VentDef[];
  stations: StationDef[];
  cameras: CameraDef[];
  button: Vec | null;
  spawn: { x: number; y: number; r: number };
  sabotages: SabotageDef[];
  tasks: TaskRecipe[];
}

/** A wall edge; (nx, ny) points into the walkable side. */
export interface WallEdge extends Seg {
  nx: number;
  ny: number;
}
