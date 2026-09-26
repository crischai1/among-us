import type { Rect } from '../geom';
import { sab } from '../rules/sabotage';
import { ids, recipe, st } from './build';
import type { CameraDef, MapDef, ObstacleDef, Poly, PropKind, StationDef, StationKind } from './types';

/*
 * Polus, traced from the original's minimap: a research base on a frozen
 * planet. Buildings stand in open snow; the Dropship lands top centre with a
 * seismic stabilizer on a tower either side. Coordinates are "cells" of that
 * trace (one cell = 30 world units, plus a 60-unit margin), snapped to 10.
 */
const g = (c: number) => Math.round((60 + c * 30) / 10) * 10;
const R = (c0: number, r0: number, c1: number, r1: number): Rect => ({ x: g(c0), y: g(r0), w: g(c1) - g(c0), h: g(r1) - g(r0) });
const P = (...pts: [number, number][]): Poly => pts.map(([c, r]) => ({ x: g(c), y: g(r) }));
const S = (kind: StationKind, room: string, c: number, r: number, o: { id?: string; main?: boolean; area?: Rect } = {}): StationDef =>
  st(kind, room, g(c), g(r), o);
const box = (prop: PropKind, c0: number, r0: number, c1: number, r1: number, blocksVision = false): ObstacleDef => ({ rect: R(c0, r0, c1, r1), blocksVision, prop });
const round = (prop: PropKind, c: number, r: number, radius: number, blocksVision = false): ObstacleDef => ({
  circle: { x: g(c), y: g(r), r: Math.round(radius * 30) },
  blocksVision,
  prop,
});
/** A security camera at (c, r) watching a 600x400 area centred on (vc, vr). */
const cam = (id: string, name: string, c: number, r: number, vc: number, vr: number): CameraDef => ({
  id, name, x: g(c), y: g(r), view: { x: g(vc) - 300, y: g(vr) - 200, w: 600, h: 400 },
});
/** A vertical door across a gap at column c. */
const vDoor = (id: string, room: string, c: number, r0: number, r1: number, auto = false) => ({
  id, room, seg: { x1: g(c), y1: g(r0), x2: g(c), y2: g(r1) }, ...(auto ? { auto } : {}),
});
/** A horizontal door across a gap at row r. */
const hDoor = (id: string, room: string, r: number, c0: number, c1: number, auto = false) => ({
  id, room, seg: { x1: g(c0), y1: g(r), x2: g(c1), y2: g(r) }, ...(auto ? { auto } : {}),
});

const ADMIN_TABLE = R(67.5, 68.5, 75, 71.5);
const WIRES = ['wires:electrical', 'wires:o2', 'wires:office', 'wires:lab', 'wires:labEast', 'wires:specimen'];
const NODES = ['node:n1', 'node:n2', 'node:n3', 'node:n4', 'node:n5', 'node:n6'];

export const POLUS: MapDef = {
  id: 'polus',
  name: 'Polus',
  blurb:
    'A research base on a frozen planet. Rooms are spread across open snow, doors stay shut until a crewmate flips their switches, and the Specimen Room is only reached through decontamination.',
  theme: { void: '#241d2c', hall: 'metal', rock: true, wallTop: '#352c3d', wallFace: '#8a8ea0', wallTrim: '#5d5670' },
  size: { w: g(125) + 60, h: g(86) + 60 },
  manualDoors: true,
  rooms: [
    { id: 'dropship', name: 'Dropship', rects: [R(43, 4, 58, 30.5)], floor: 'metal', label: { x: g(50.5), y: g(12) } },
    {
      id: 'electrical',
      name: 'Electrical',
      rects: [R(5, 30, 33, 37), R(14, 37, 19, 45), R(20, 37.5, 34, 47)],
      floor: 'grate',
      label: { x: g(19), y: g(33.5) },
    },
    { id: 'security', name: 'Security', rects: [R(5, 37.5, 13, 44.5)], floor: 'dark' },
    {
      id: 'o2',
      name: 'O2',
      rects: [R(0.5, 60.5, 6.5, 68.5), R(6.5, 60.5, 20, 68.5), R(0.5, 68.5, 20, 72.5)],
      polys: [P([0.5, 49], [9, 49], [12, 52], [12, 60], [0.5, 60])],
      floor: 'white',
      label: { x: g(12.5), y: g(70.3) },
    },
    { id: 'boiler', name: 'Boiler Room', short: 'Boiler', rects: [R(0.5, 73, 13, 81)], floor: 'dark' },
    { id: 'comms', name: 'Communications', short: 'Comms', rects: [R(31, 50.5, 40, 59), R(31, 59, 35, 65.5)], floor: 'grate', label: { x: g(35.5), y: g(54.5) } },
    { id: 'weapons', name: 'Weapons', rects: [R(38, 67.5, 42, 71.5), R(30, 71.5, 43, 81.5)], floor: 'dark', label: { x: g(36.5), y: g(76.5) } },
    { id: 'storage', name: 'Storage', rects: [R(52, 36.5, 68, 40.5), R(56, 40.5, 68, 44)], floor: 'metal' },
    {
      // Two rooms on top, a hallway underneath and a leg down to the south door.
      id: 'office',
      name: 'Office',
      rects: [R(47.5, 52.5, 70, 59.5), R(71, 52.5, 87, 59.5), R(47.5, 60, 76.5, 65.5), R(53, 65.5, 58.5, 74.5)],
      floor: 'tile',
      label: { x: g(65), y: g(55) },
    },
    { id: 'admin', name: 'Admin', rects: [R(59, 66, 76.5, 75.5), R(59, 75.5, 68.5, 82.5)], floor: 'carpet', label: { x: g(64), y: g(73.5) } },
    {
      // Entry room with the drill, the main lab, the telescope nook, the lower
      // hallway, the toilets and the east wing.
      id: 'lab',
      name: 'Laboratory',
      rects: [R(75, 25, 86, 31.5), R(86.5, 25, 124, 31.5), R(98.5, 21.5, 112, 25), R(75, 32, 98, 38.5), R(98.5, 32, 106.5, 38.5), R(107, 32, 114, 38.5)],
      floor: 'white',
      label: { x: g(92), y: g(27) },
    },
    {
      id: 'specimen',
      name: 'Specimen Room',
      short: 'Specimen',
      rects: [],
      polys: [P([104.5, 60.5], [119.5, 60.5], [119.5, 70.5], [116, 74], [105, 74], [101.5, 70.5], [101.5, 64])],
      floor: 'white',
      label: { x: g(110.5), y: g(71.5) },
    },
    // Right below Admin, which it opens out of.
    { id: 'deconW', name: 'Decontamination', short: 'Decon', rects: [R(69, 76, 76.5, 82.5)], floor: 'decon' },
    // Between the Laboratory's east wing and the way down to Specimen.
    { id: 'deconE', name: 'Decontamination', short: 'Decon', rects: [R(114.5, 32, 124, 39)], floor: 'decon' },
    {
      id: 'outside',
      name: 'Outside',
      outdoor: true,
      floor: 'snow',
      label: { x: g(60), y: g(47) },
      rects: [
        // Seismic stabilizer towers
        R(11, 15.5, 15, 19.5), R(12, 19.5, 14.5, 28),
        R(71, 13, 75, 16.5), R(72, 16.5, 74.5, 25.5),
        // Around the Dropship
        R(11, 28, 33.5, 29.5), R(33.5, 25.5, 42.5, 30.5), R(58.5, 25.5, 74.5, 30.5),
        // The central snowfield
        R(33.5, 30.5, 74.5, 36), R(34.5, 36, 51.5, 44.5), R(51.5, 41, 55.5, 44.5), R(68.5, 36, 74.5, 44.5),
        R(34.5, 44.5, 74.5, 50), R(40.5, 50, 74.5, 52), R(40.5, 52, 47, 59.5), R(35.5, 59.5, 47, 66),
        // West, between Electrical, O2, Comms and Weapons
        R(19.5, 47.5, 34.5, 50), R(19.5, 50, 30.5, 60), R(20.5, 60, 30.5, 66), R(20.5, 66, 42.5, 67), R(20.5, 67, 37.5, 71),
        R(42.5, 66, 52.5, 71), R(43.5, 71, 52.5, 74.5), R(20.5, 71, 29.5, 73), R(13.5, 73, 29.5, 82), R(43.5, 74.5, 58.5, 83),
        // East: the lava field and the way round to Specimen
        R(74.5, 39, 114.5, 52), R(87.5, 52, 114.5, 60), R(77, 60, 101, 64.5),
      ],
    },
  ],
  halls: [
    R(14, 45, 19, 60), // walled hallway from Electrical down to O2
    R(33, 30.5, 33.5, 36.5), // Electrical east door
    R(21, 37, 24.5, 37.5), // Electrical inner door
    R(7, 37, 11, 37.5), // Security
    R(7, 60, 11, 60.5), // tree room into O2
    R(14, 60, 19, 60.5), // O2 north door
    R(16, 72.5, 20, 73), // O2 south door
    R(3, 72.5, 10, 73), // Boiler Room
    R(31, 65.5, 35, 66), // Comms door
    R(38, 67, 42, 67.5), // Weapons door
    R(51.5, 37, 52, 40), // Storage door
    R(50, 59.5, 54, 60), R(65, 59.5, 69, 60), R(72, 59.5, 75, 60), // Office to its hallway
    R(87, 54, 87.5, 58), // Office east door
    R(62, 65.5, 66, 66), // Admin
    R(74.5, 33, 75, 38), // Laboratory west door
    R(78, 31.5, 83, 32), // Laboratory entry door
    R(86, 26.5, 86.5, 30), // entry room into the lab
    R(88, 31.5, 97, 32), // lab to its hallway
    R(98, 33.5, 98.5, 37), // toilets
    R(108, 31.5, 113, 32), // east wing
    R(114, 33, 114.5, 37), // east wing into decontamination
    R(115.5, 39, 119.5, 60.5), // east way down to Specimen
    R(70, 75.5, 75.5, 76), // Admin down into decontamination
    R(76.5, 77.5, 77, 81.5), // out of decontamination
    R(77, 77, 86, 82), R(81, 70, 86, 77), R(81, 65, 101.5, 70), // round and up to Specimen
  ],
  obstacles: [
    box('seats', 43.3, 8, 44.6, 20),
    box('seats', 56.4, 8, 57.7, 20),
    box('lava', 95, 52.5, 111, 58.5),
    round('rock', 46, 33, 1.2),
    round('rock', 70, 48, 1.2),
    round('rock', 104, 44, 1.5),
    round('rock', 25, 63, 1.1),
    round('rock', 48, 79, 1.2),
    round('rock', 22, 77, 1.3),
    round('rock', 90, 62, 0.9),
    round('dish', 42, 47.2, 1.5),
    round('tree', 5, 55.5, 2.2),
    box('o2Machine', 8.5, 62.5, 16.5, 67, true),
    box('canisterRack', 0.6, 66.3, 3.2, 68.2),
    box('boiler', 4.5, 76, 9, 79.5, true),
    round('cannon', 36.5, 77, 2.4),
    round('specimenCase', 110.5, 67.5, 2.3),
    box('drillRig', 78, 25.3, 82, 27.3),
    box('labBench', 90, 28.3, 96, 30),
    box('labBench', 113, 27.5, 117, 29.5),
    { rect: ADMIN_TABLE, blocksVision: false, prop: 'adminTable' },
    round('bigTable', 59, 56, 1.4),
    box('desk', 6, 43.2, 12, 44.4),
    box('crates', 58, 41, 61, 43.5, true),
    box('barrels', 65.8, 37, 67.6, 40.2),
    box('cabinets', 21, 44, 26, 46.8, true),
    box('commsDesk', 32, 55.5, 37, 57.2),
  ],
  doors: [
    vDoor('elec-e', 'electrical', 33.25, 30.5, 36.5),
    hDoor('elec-in', 'electrical', 37.25, 21, 24.5),
    hDoor('elec-s', 'electrical', 45, 14, 19),
    hDoor('o2-n', 'o2', 60.25, 14, 19),
    hDoor('o2-s', 'o2', 72.75, 16, 20),
    hDoor('comms-s', 'comms', 65.75, 31, 35),
    hDoor('weapons-n', 'weapons', 67.25, 38, 42),
    vDoor('storage-w', 'storage', 51.75, 37, 40),
    vDoor('office-e', 'office', 87.25, 54, 58),
    hDoor('office-s', 'office', 71.25, 53, 58.5),
    vDoor('lab-w', 'lab', 74.75, 33, 38),
    hDoor('lab-in', 'lab', 31.75, 78, 83),
    hDoor('deconW-n', 'deconW', 75.75, 70, 75.5, true),
    vDoor('deconW-e', 'deconW', 76.75, 77.5, 81.5, true),
    vDoor('deconE-w', 'deconE', 114.25, 33, 37, true),
    hDoor('deconE-s', 'deconE', 39, 115.5, 119.5, true),
  ],
  decon: [
    { id: 'deconW', room: 'deconW', doors: ['deconW-n', 'deconW-e'], zone: R(70, 77.5, 75.5, 81) },
    { id: 'deconE', room: 'deconE', doors: ['deconE-w', 'deconE-s'], zone: R(115.5, 32, 124, 38.5) },
  ],
  decals: [{ kind: 'hazard', rect: R(43.5, 29.8, 57.5, 30.5) }],
  vents: [
    { id: 'v-seisL', room: 'outside', x: g(36), y: g(27.5), links: ['v-seisR'] },
    { id: 'v-seisR', room: 'outside', x: g(69), y: g(27.5), links: ['v-seisL'] },
    { id: 'v-elec', room: 'electrical', x: g(7), y: g(34), links: ['v-outElec', 'v-o2'] },
    { id: 'v-outElec', room: 'outside', x: g(22), y: g(49), links: ['v-elec', 'v-o2'] },
    { id: 'v-o2', room: 'o2', x: g(8), y: g(56), links: ['v-elec', 'v-outElec'] },
    { id: 'v-storage', room: 'storage', x: g(66), y: g(42.5), links: ['v-office', 'v-outComms'] },
    { id: 'v-office', room: 'office', x: g(50.5), y: g(64.3), links: ['v-storage', 'v-outComms'] },
    { id: 'v-outComms', room: 'outside', x: g(37.5), y: g(62), links: ['v-storage', 'v-office'] },
    { id: 'v-admin', room: 'admin', x: g(61.5), y: g(81.3), links: ['v-outAdmin', 'v-toilet'] },
    { id: 'v-outAdmin', room: 'outside', x: g(55.5), y: g(80), links: ['v-admin', 'v-outLab'] },
    { id: 'v-outLab', room: 'outside', x: g(94), y: g(41), links: ['v-outAdmin', 'v-toilet'] },
    { id: 'v-toilet', room: 'lab', x: g(101.5), y: g(35), links: ['v-outLab', 'v-admin'] },
  ],
  stations: [
    // Consoles
    S('cams', 'security', 9, 42.2),
    S('vitals', 'office', 81.5, 53.3),
    S('admin', 'admin', 71.25, 72.3, { area: ADMIN_TABLE }),
    // Sabotage fixes
    S('reactor', 'outside', 13, 16.6, { id: 'reactor:left' }),
    S('reactor', 'outside', 73, 14.2, { id: 'reactor:right' }),
    S('lights', 'electrical', 29.5, 38.3),
    S('comms', 'comms', 39.2, 53.5),
    // Common tasks
    S('wires', 'electrical', 10.5, 30.6),
    S('wires', 'o2', 19.2, 61.3),
    S('wires', 'office', 48.2, 58.5),
    S('wires', 'lab', 96.5, 32.7),
    S('wires', 'lab', 113.4, 35.5, { id: 'wires:labEast' }),
    S('wires', 'specimen', 119, 67),
    S('keys', 'dropship', 54, 5),
    S('boarding', 'office', 77.5, 53.3),
    S('swipe', 'office', 74, 53.3),
    // Data: downloaded around the base, uploaded in Communications
    S('transfer', 'electrical', 20, 30.6),
    S('transfer', 'weapons', 41, 72.3),
    S('transfer', 'specimen', 113.5, 61.3),
    S('transfer', 'o2', 8, 50),
    S('transfer', 'office', 85, 53.3),
    S('transfer', 'comms', 35.5, 51.3),
    // Other tasks
    S('chart', 'dropship', 47, 5),
    S('telescope', 'lab', 102.5, 22.3),
    S('sample', 'lab', 109.5, 22.3),
    S('scan', 'lab', 120, 27.6),
    S('drill', 'lab', 84.5, 26),
    S('node', 'lab', 89.5, 25.8, { main: true }),
    S('temperature', 'lab', 93.8, 25.8),
    S('temperature', 'outside', 93.3, 55.3),
    S('node', 'outside', 93.8, 45, { id: 'node:n1' }),
    S('node', 'outside', 68, 28, { id: 'node:n2' }),
    S('node', 'outside', 44, 41, { id: 'node:n3' }),
    S('node', 'outside', 24.5, 56, { id: 'node:n4' }),
    S('node', 'outside', 21.5, 81.2, { id: 'node:n5' }),
    S('node', 'outside', 44.5, 79.8, { id: 'node:n6' }),
    S('tree', 'o2', 9.5, 53),
    S('canisters', 'o2', 2.3, 64.5),
    S('garbage', 'o2', 19.2, 66),
    S('jug', 'boiler', 1.2, 75),
    S('jug', 'office', 49.5, 53.3, { main: true }),
    S('waterways', 'boiler', 2, 80.3, { id: 'waterways:boilerL' }),
    S('waterways', 'boiler', 11.5, 80.3, { id: 'waterways:boilerR' }),
    S('waterways', 'outside', 55.5, 76, { id: 'waterways:outside' }),
    S('wifi', 'comms', 31.8, 51.3),
    S('asteroids', 'weapons', 32, 73),
    S('artifacts', 'specimen', 109.5, 61.4),
    S('simon', 'specimen', 106, 61.4),
    S('manifolds', 'specimen', 103, 65.5),
    S('fuel', 'storage', 63.5, 37.3, { main: true }),
    S('fuel', 'outside', 35, 26.2, { id: 'fuel:engineL' }),
    S('fuel', 'outside', 66.5, 26.2, { id: 'fuel:engineR' }),
  ],
  cameras: [
    cam('cam-dropship', 'Dropship', 34.8, 30.9, 40, 33),
    cam('cam-lab', 'Laboratory', 73.9, 31.5, 79, 36),
    cam('cam-comms', 'Communications', 46.4, 53.8, 42, 56),
    cam('cam-specimen', 'Specimen', 87.5, 60.3, 93, 62),
    cam('cam-admin', 'Admin', 51.2, 67.6, 50, 71),
    cam('cam-o2', 'O2', 14.2, 74.1, 19, 75),
  ],
  button: { x: g(59), y: g(56) },
  spawn: { x: g(59), y: g(56), r: 80 },
  start: { x: g(50.5), y: g(15), r: 150 },
  sabotages: [
    sab('lights', 'electrical', ['lights:electrical']),
    sab('reactor', 'lab', ['reactor:left', 'reactor:right'], { label: 'Seismic Stabilizers', icon: '🌋', ms: 60_000 }),
    sab('comms', 'comms', ['comms:comms']),
  ],
  tasks: [
    recipe('wires', 'common', [WIRES, WIRES, WIRES]),
    recipe('keys', 'common', [['keys:dropship']]),
    recipe('boarding', 'common', [['boarding:office']]),
    recipe('swipe', 'common', [['swipe:office']]),
    recipe('telescope', 'short', [['telescope:lab']]),
    recipe('chart', 'short', [['chart:dropship']]),
    recipe('tree', 'short', [['tree:o2']]),
    recipe('temperature', 'short', [['temperature:lab', 'temperature:outside']]),
    recipe('drill', 'short', [['drill:lab']]),
    recipe('artifacts', 'short', [['artifacts:specimen']]),
    recipe('manifolds', 'short', [['manifolds:specimen']]),
    recipe('garbage', 'short', [['garbage:o2']]),
    recipe('transfer', 'short', [ids('transfer', ['electrical', 'weapons', 'specimen', 'o2', 'office']), ['transfer:comms']]),
    recipe('canisters', 'long', [['canisters:o2']]),
    recipe('node', 'long', [NODES, ['node:lab']]),
    recipe('waterways', 'long', [['waterways:boilerL'], ['waterways:boilerR'], ['waterways:outside']]),
    recipe('wifi', 'long', [['wifi:comms'], ['wifi:comms']]),
    recipe('jug', 'long', [['jug:boiler'], ['jug:office']]),
    recipe('sample', 'long', [['sample:lab'], ['sample:lab']]),
    recipe('simon', 'long', [['simon:specimen']]),
    recipe('scan', 'long', [['scan:lab']]),
    recipe('asteroids', 'long', [['asteroids:weapons']]),
    recipe('fuel', 'long', [['fuel:storage'], ['fuel:engineL'], ['fuel:storage'], ['fuel:engineR']]),
  ],
};
