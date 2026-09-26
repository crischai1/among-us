import type { Rect } from '../geom';
import { sab } from '../rules/sabotage';
import { ids, recipe, st } from './build';
import type { MapDef, ObstacleDef, Poly, PropKind, StationDef, StationKind } from './types';

/*
 * MIRA HQ, traced from the original's minimap. Coordinates below are in
 * "cells" of that trace (one cell = 24 world units, plus a 60-unit margin),
 * snapped to 10 so rooms line up with the collision grid.
 */
const g = (c: number) => Math.round((60 + c * 24) / 10) * 10;
const R = (c0: number, r0: number, c1: number, r1: number): Rect => ({ x: g(c0), y: g(r0), w: g(c1) - g(c0), h: g(r1) - g(r0) });
const P = (...pts: [number, number][]): Poly => pts.map(([c, r]) => ({ x: g(c), y: g(r) }));
const S = (kind: StationKind, room: string, c: number, r: number, o: { id?: string; main?: boolean; area?: Rect } = {}): StationDef =>
  st(kind, room, g(c), g(r), o);
const ADMIN_TABLE = R(97.5, 17.5, 102, 21.5);
const box = (prop: PropKind, c0: number, r0: number, c1: number, r1: number, blocksVision = false): ObstacleDef => ({ rect: R(c0, r0, c1, r1), blocksVision, prop });
const round = (prop: PropKind, c: number, r: number, radius: number, blocksVision = false): ObstacleDef => ({
  circle: { x: g(c), y: g(r), r: Math.round(radius * 24) },
  blocksVision,
  prop,
});

/** The Greenhouse's glass dome: half an ellipse over its floor strip. */
function dome(c0: number, c1: number, base: number, top: number, n = 16): Poly {
  const cx = (c0 + c1) / 2;
  const rx = (c1 - c0) / 2;
  const pts: Poly = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push({ x: Math.round(60 + (cx + rx * Math.cos(a)) * 24), y: Math.round(60 + (base - (base - top) * Math.sin(a)) * 24) });
  }
  return pts;
}

const WIRES = ids('wires', ['greenhouse', 'office', 'lab', 'locker', 'storage']);
const POWER_TO = ['admin', 'cafeteria', 'comms', 'greenhouse', 'lab', 'launchpad', 'medbay', 'office'];

export const MIRA: MapDef = {
  id: 'mira',
  name: 'MIRA HQ',
  blurb:
    'A headquarters floating above the clouds. Every vent connects to every other, there are no doors to lock or cameras to watch, and a door log in Communications records who walks through the Y-shaped hallway.',
  theme: {
    void: '#86bfe6',
    hall: 'mira',
    sky: true,
    wallTop: '#4e5d73',
    wallFace: '#d5dde8',
    wallTrim: '#8a99ad',
    stripe: '#3d8fd6',
  },
  size: { w: g(124) + 60, h: g(89) + 60 },
  rooms: [
    { id: 'launchpad', name: 'Launchpad', rects: [R(0.5, 53.5, 34.5, 77.5)], floor: 'pad', label: { x: g(21), y: g(63) } },
    {
      // The locker cubicle plus the landing below Decontamination.
      id: 'locker',
      name: 'Locker Room',
      rects: [R(61.5, 60, 69.5, 77.5), R(47.5, 69.5, 61.5, 79.5)],
      floor: 'tile',
      label: { x: g(62), y: g(71) },
    },
    { id: 'decon', name: 'Decontamination', short: 'Decon', rects: [R(50.5, 52, 57, 66)], floor: 'decon' },
    { id: 'reactor', name: 'Reactor', rects: [R(35.5, 26.5, 50, 48)], floor: 'dark', label: { x: g(43), y: g(40.5) } },
    { id: 'lab', name: 'Laboratory', rects: [R(57.5, 31.5, 72, 48)], floor: 'white' },
    { id: 'comms', name: 'Communications', short: 'Comms', rects: [R(77.5, 60, 87.5, 70.5)], floor: 'grate', label: { x: g(82.5), y: g(63.5) } },
    { id: 'medbay', name: 'MedBay', rects: [R(77.5, 71, 87.5, 84.5)], floor: 'white' },
    { id: 'office', name: 'Office', rects: [R(74.5, 12, 85.5, 27)], floor: 'carpet' },
    { id: 'admin', name: 'Admin', rects: [R(93.5, 12, 105, 27)], floor: 'carpet' },
    {
      id: 'greenhouse',
      name: 'Greenhouse',
      rects: [R(74.5, 7.5, 105, 11.5)],
      polys: [dome(74.5, 105, 7.5, 0.5)],
      floor: 'greenhouse',
      label: { x: g(89.75), y: g(8.2) },
    },
    { id: 'cafeteria', name: 'Cafeteria', rects: [R(100, 60, 124, 77)], floor: 'tile', label: { x: g(112), y: g(64.5) } },
    { id: 'storage', name: 'Storage', rects: [R(89.5, 60, 98.5, 73)], floor: 'metal' },
    { id: 'balcony', name: 'Balcony', rects: [R(89.5, 80.5, 124, 86), R(89.5, 86, 97, 89)], floor: 'balcony', label: { x: g(106), y: g(83.2) } },
  ],
  halls: [
    R(86, 12, 93, 40.5), // north hallway
    R(88, 11.5, 91.5, 12), // into the Greenhouse
    R(85.5, 19, 86, 26.5), // Office door
    R(93, 18.5, 93.5, 22.5), // Admin door
    R(70.5, 52, 76.5, 79.5), // down from the Y past Locker Room, Comms and MedBay
    R(69.5, 64, 70.5, 67.5), // Locker Room door
    R(76.5, 64, 77.5, 67.5), // Comms door
    R(76.5, 76, 77.5, 79.5), // MedBay door
    R(17, 79.5, 76.5, 85), // lower hallway to the Launchpad
    R(17, 77.5, 27, 79.5), // Launchpad exit
    R(50.5, 31.5, 57, 52), // between Reactor and Laboratory
    R(50, 44.5, 50.5, 48), // Reactor door
    R(57, 33.5, 57.5, 37), // Laboratory door
    R(50.5, 66, 57, 69.5), // below Decontamination
    R(92, 73, 96, 73.5), // Storage door
    R(89.5, 73.5, 99.5, 77), // outside Storage
    R(89.5, 77, 124, 80), // along the Cafeteria, above the Balcony
    R(95.5, 80, 104.5, 80.5), // Balcony doors
    R(109.5, 80, 116, 80.5),
  ],
  hallPolys: [
    // The Y: the north hallway splits into a southwest arm (down to Locker Room)
    // and a southeast arm that ends at the Cafeteria's top door.
    P([86, 40.5], [93, 40.5], [105, 52.5], [110, 52.5], [110, 60], [103.5, 60], [89.5, 46], [76.5, 59], [76.5, 52], [74.5, 52]),
  ],
  obstacles: [
    box('rocket', 2, 56.5, 10.5, 74, true),
    round('miraReactor', 42.75, 31, 2.3),
    box('labBench', 62, 38.5, 68, 41.5),
    box('lockers', 61.5, 60, 63.2, 68.5),
    box('bench', 65.8, 70, 67.2, 75.5),
    box('medBed', 84, 76.5, 87, 79),
    box('medBed', 84, 80.5, 87, 83),
    box('officeDesk', 77.5, 22, 82.5, 24.2),
    { rect: ADMIN_TABLE, blocksVision: false, prop: 'adminTable' },
    box('planter', 77.5, 6.2, 84, 8),
    box('planter', 95.5, 6.2, 102, 8),
    round('o2Tank', 89.75, 2.9, 1.5),
    box('vending', 117.5, 60, 121.5, 62.2),
    round('cafeTable', 111, 69, 2.3),
    round('table', 103.5, 74.3, 1.5),
    round('table', 119, 74.3, 1.5),
    round('dish', 91.8, 87.2, 1.3),
    box('barrels', 96.5, 64, 98.3, 70.5),
    box('commsDesk', 80, 65.5, 86.5, 67.5),
    box('railing', 97, 85.6, 124, 86),
    box('railing', 89.5, 88.6, 97, 89),
  ],
  doors: [
    { id: 'decon-n', room: 'decon', seg: { x1: g(50.5), y1: g(52), x2: g(57), y2: g(52) }, auto: true },
    { id: 'decon-s', room: 'decon', seg: { x1: g(50.5), y1: g(66), x2: g(57), y2: g(66) }, auto: true },
  ],
  decon: [{ id: 'decon', room: 'decon', doors: ['decon-n', 'decon-s'], zone: R(50.5, 55, 57, 63) }],
  sensors: [
    { id: 'north', name: 'North', seg: { x1: g(86), y1: g(28), x2: g(93), y2: g(28) } },
    { id: 'southwest', name: 'Southwest', seg: { x1: g(74.5), y1: g(52), x2: g(79), y2: g(56.5) } },
    { id: 'southeast', name: 'Southeast', seg: { x1: g(105), y1: g(52.5), x2: g(100.5), y2: g(57) } },
  ],
  vents: [
    // One network: every vent can reach every other.
    { id: 'v-greenhouse', room: 'greenhouse', x: g(102.8), y: g(10.2), links: ['v-office', 'v-admin'] },
    { id: 'v-office', room: 'office', x: g(76.6), y: g(17.2), links: ['v-greenhouse', 'v-admin', 'v-lab'] },
    { id: 'v-admin', room: 'admin', x: g(103), y: g(25.3), links: ['v-greenhouse', 'v-office', 'v-cafeteria'] },
    { id: 'v-cafeteria', room: 'cafeteria', x: g(106.8), y: g(64.5), links: ['v-admin', 'v-balcony'] },
    { id: 'v-balcony', room: 'balcony', x: g(110), y: g(84.2), links: ['v-cafeteria', 'v-medbay'] },
    { id: 'v-medbay', room: 'medbay', x: g(80), y: g(83.4), links: ['v-balcony', 'v-locker'] },
    { id: 'v-locker', room: 'locker', x: g(49.8), y: g(72.3), links: ['v-medbay', 'v-launchpad'] },
    { id: 'v-launchpad', room: 'launchpad', x: g(14.5), y: g(58), links: ['v-locker', 'v-reactor'] },
    { id: 'v-reactor', room: 'reactor', x: g(38.5), y: g(45.5), links: ['v-launchpad', 'v-lab', 'v-decon'] },
    { id: 'v-lab', room: 'lab', x: g(69.5), y: g(36), links: ['v-reactor', 'v-decon', 'v-office'] },
    { id: 'v-decon', room: 'decon', x: g(53.75), y: g(64.6), links: ['v-reactor', 'v-lab'] },
  ],
  stations: [
    // Consoles
    S('admin', 'admin', 99.75, 22.3, { area: ADMIN_TABLE }),
    S('doorlog', 'comms', 85, 61),
    // Sabotage fixes
    S('lights', 'office', 80, 12.8),
    S('reactor', 'reactor', 38, 27.4, { id: 'reactor:left' }),
    S('reactor', 'reactor', 47.5, 27.4, { id: 'reactor:right' }),
    S('o2', 'greenhouse', 93.5, 5.2),
    S('o2', 'locker', 48.4, 77.6),
    S('comms', 'comms', 81.3, 60.9),
    S('comms', 'office', 75.3, 20),
    // Wiring
    S('wires', 'greenhouse', 86.3, 10.9),
    S('wires', 'office', 77.3, 12.8),
    S('wires', 'lab', 62.5, 32.3),
    S('wires', 'locker', 66, 60.8),
    S('wires', 'storage', 90.3, 64),
    // Power: diverted from the Reactor to one of eight rooms
    S('divert', 'reactor', 36.3, 41.5, { main: true }),
    S('divert', 'admin', 96, 12.8),
    S('divert', 'cafeteria', 101.2, 60.8),
    S('divert', 'comms', 78.4, 61.5),
    S('divert', 'greenhouse', 75.4, 9.3),
    S('divert', 'lab', 59.3, 32.3),
    S('divert', 'launchpad', 13.4, 76.7),
    S('divert', 'medbay', 78.4, 72),
    S('divert', 'office', 84.8, 15),
    // Other tasks
    S('idcode', 'admin', 94.3, 15.5),
    S('chart', 'admin', 102.8, 12.8),
    S('shields', 'admin', 98, 26.3),
    S('process', 'office', 83, 12.8),
    S('filter', 'greenhouse', 86, 5.3),
    S('water', 'storage', 95, 60.9),
    S('water', 'greenhouse', 98.7, 8.8, { main: true }),
    S('beverage', 'cafeteria', 119.5, 62.9),
    S('garbage', 'cafeteria', 112.8, 60.8),
    S('weather', 'balcony', 122.8, 83.2),
    S('asteroids', 'balcony', 95.3, 87.8),
    S('samples', 'lab', 65.5, 46.8),
    S('artifact', 'lab', 67.5, 32.3),
    S('manifolds', 'reactor', 36.3, 33.5),
    S('simon', 'reactor', 43, 36.5),
    S('scan', 'medbay', 84, 73.8),
    S('fuel', 'launchpad', 30.5, 54.4, { id: 'fuel:launchpadTank', main: true }),
    S('fuel', 'launchpad', 11.4, 67),
    S('diagnostics', 'launchpad', 31.5, 76.6),
  ],
  decals: [
    { kind: 'landing', x: g(22), y: g(65), r: 190 },
    { kind: 'hazard', rect: R(17, 77, 27, 77.8) },
    { kind: 'hazard', rect: R(50.5, 51.2, 57, 52) },
    { kind: 'hazard', rect: R(50.5, 66, 57, 66.8) },
    { kind: 'rug', rect: R(76, 14.5, 84, 21), color: '#3b4f78' },
    { kind: 'rug', rect: R(95, 23, 104, 26.5), color: '#3b4f78' },
  ],
  cameras: [],
  button: { x: g(111), y: g(69) },
  spawn: { x: g(111), y: g(69), r: 150 },
  start: { x: g(22), y: g(65), r: 150 },
  sabotages: [
    sab('lights', 'office', ['lights:office']),
    sab('reactor', 'reactor', ['reactor:left', 'reactor:right']),
    sab('o2', 'greenhouse', ['o2:greenhouse', 'o2:locker']),
    sab('comms', 'comms', ['comms:comms', 'comms:office'], { keypad: true }),
  ],
  tasks: [
    recipe('wires', 'common', [WIRES, WIRES, WIRES]),
    recipe('idcode', 'common', [['idcode:admin']]),
    recipe('divert', 'short', [['divert:reactor'], ids('divert', POWER_TO)]),
    recipe('beverage', 'short', [['beverage:cafeteria']]),
    recipe('chart', 'short', [['chart:admin']]),
    recipe('filter', 'short', [['filter:greenhouse']]),
    recipe('garbage', 'short', [['garbage:cafeteria']]),
    recipe('weather', 'short', [['weather:balcony']]),
    recipe('shields', 'short', [['shields:admin']]),
    recipe('process', 'short', [['process:office']]),
    recipe('samples', 'short', [['samples:lab']]),
    recipe('manifolds', 'short', [['manifolds:reactor']]),
    recipe('artifact', 'short', [['artifact:lab']]),
    recipe('asteroids', 'long', [['asteroids:balcony']]),
    recipe('fuel', 'long', [['fuel:launchpadTank'], ['fuel:launchpad']]),
    recipe('diagnostics', 'long', [['diagnostics:launchpad'], ['diagnostics:launchpad']]),
    recipe('simon', 'long', [['simon:reactor']]),
    recipe('scan', 'long', [['scan:medbay']]),
    recipe('water', 'long', [['water:storage'], ['water:greenhouse']]),
  ],
};
