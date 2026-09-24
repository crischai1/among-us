import type { Rect, Seg, Vec } from '../geom';
import type { TaskType } from '../types';

export type FloorKind = 'metal' | 'tile' | 'dark' | 'white' | 'grate' | 'carpet';

export interface RoomDef {
  id: string;
  name: string;
  rects: Rect[];
  floor: FloorKind;
}

export type PropKind =
  | 'table' | 'bigTable' | 'engine' | 'reactorCore' | 'crates' | 'bed' | 'desk'
  | 'navConsole' | 'chair' | 'adminTable' | 'box';

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
}

export interface CameraDef {
  id: string;
  name: string;
  x: number;
  y: number;
  view: Rect;
}

export interface MapDef {
  id: string;
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
}

/** A wall edge; (nx, ny) points into the walkable side. */
export interface WallEdge extends Seg {
  nx: number;
  ny: number;
}
