import type { Rect, Seg, Vec } from '../geom';
import type { SabotageKind, TaskCategory, TaskType } from '../types';

export type FloorKind =
  | 'metal' | 'tile' | 'dark' | 'white' | 'grate' | 'carpet'
  | 'mira' | 'pad' | 'decon' | 'greenhouse' | 'balcony'
  | 'snow';

/** A simple polygon (any winding), for diagonal halls and curved walls. */
export type Poly = Vec[];

export interface RoomDef {
  id: string;
  name: string;
  rects: Rect[];
  /** Extra non-rectangular pieces. */
  polys?: Poly[];
  floor: FloorKind;
  /** Where the room's name and map markers go (defaults to the centre of its first piece). */
  label?: Vec;
  /** Shorter name for the map, where the full one doesn't fit. */
  short?: string;
  /** Open ground outside the buildings: not shown on the admin map. */
  outdoor?: boolean;
}

export type PropKind =
  | 'table' | 'bigTable' | 'engine' | 'reactorCore' | 'crates' | 'bed' | 'desk'
  | 'navConsole' | 'chair' | 'adminTable' | 'box' | 'cabinets'
  // MIRA HQ
  | 'rocket' | 'miraReactor' | 'labBench' | 'lockers' | 'bench' | 'medBed' | 'officeDesk'
  | 'planter' | 'o2Tank' | 'vending' | 'cafeTable' | 'dish' | 'barrels' | 'commsDesk' | 'railing'
  // Polus
  | 'lava' | 'rock' | 'tree' | 'o2Machine' | 'boiler' | 'cannon' | 'specimenCase' | 'drillRig' | 'canisterRack' | 'seats';

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
  /** Opened and closed by the ship itself (decontamination), never by sabotage. */
  auto?: boolean;
}

/**
 * A decontamination chamber: walking into `zone` shuts both doors for a few
 * seconds while the room is sprayed, then they open again.
 */
export interface DeconDef {
  id: string;
  room: string;
  doors: string[];
  zone: Rect;
}

/** A door-log sensor: a line across a hallway that records who walks through it. */
export interface SensorDef {
  id: string;
  name: string;
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
  | 'cams' | 'admin' | 'vitals' | 'doorlog'
  | 'laptop';

export interface StationDef {
  id: string;
  kind: StationKind;
  room: string;
  x: number;
  y: number;
  /** The hub end of a multi-station task (power switchboard, fuel cans): drawn bigger. */
  main?: boolean;
  /** Usable from anywhere around this rectangle (the admin table), not just near (x, y). */
  area?: Rect;
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
  /** Comms only: fixed by typing a rotating code at every station instead of tuning one dial. */
  keypad?: boolean;
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
  /** Open sky with clouds outside the walls, instead of space. */
  sky?: boolean;
  /** Rocky planet surface outside the walls, instead of space. */
  rock?: boolean;
  /** Wall colours (default: the Skeld's dark steel). */
  wallTop?: string;
  wallFace?: string;
  wallTrim?: string;
  /** A coloured band along the front of walls. */
  stripe?: string;
}

/** Floor markings drawn under everything else. */
export type DecalDef =
  | { kind: 'landing'; x: number; y: number; r: number }
  | { kind: 'hazard'; rect: Rect }
  | { kind: 'rug'; rect: Rect; color: string };

export interface SpawnRing {
  x: number;
  y: number;
  r: number;
}

export interface MapDef {
  id: string;
  name: string;
  /** One line for the help screen. */
  blurb?: string;
  theme: MapTheme;
  size: { w: number; h: number };
  rooms: RoomDef[];
  halls: Rect[];
  hallPolys?: Poly[];
  obstacles: ObstacleDef[];
  doors: DoorDef[];
  vents: VentDef[];
  stations: StationDef[];
  cameras: CameraDef[];
  button: Vec | null;
  /** Where everyone stands after a meeting. */
  spawn: SpawnRing;
  /** Where everyone starts the game (defaults to `spawn`). */
  start?: SpawnRing;
  sabotages: SabotageDef[];
  tasks: TaskRecipe[];
  decon?: DeconDef[];
  sensors?: SensorDef[];
  decals?: DecalDef[];
  /** Sabotaged doors stay shut until someone opens them with the door switches. */
  manualDoors?: boolean;
}

/** A wall edge; (nx, ny) points into the walkable side. */
export interface WallEdge extends Seg {
  nx: number;
  ny: number;
  /** Comes from a polygon piece rather than a rectangle. */
  poly?: boolean;
}
