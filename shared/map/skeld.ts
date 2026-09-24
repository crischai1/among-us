import type { MapDef, StationDef, StationKind } from './types';

const st = (kind: StationKind, room: string, x: number, y: number, id = `${kind}:${room}`): StationDef => ({
  id, kind, room, x, y,
});

/**
 * The ship. An original layout following the classic topology: engines,
 * reactor and security on the left; cafeteria, weapons, O2 and navigation
 * across the top and right; electrical, storage, admin, comms and shields below.
 */
export const SKELD: MapDef = {
  id: 'skeld',
  size: { w: 3300, h: 2000 },
  rooms: [
    { id: 'upperEngine', name: 'Upper Engine', rects: [{ x: 200, y: 120, w: 400, h: 400 }], floor: 'metal' },
    { id: 'reactor', name: 'Reactor', rects: [{ x: 30, y: 720, w: 270, h: 380 }], floor: 'dark' },
    { id: 'security', name: 'Security', rects: [{ x: 610, y: 800, w: 230, h: 260 }], floor: 'grate' },
    { id: 'lowerEngine', name: 'Lower Engine', rects: [{ x: 200, y: 1300, w: 400, h: 400 }], floor: 'metal' },
    { id: 'medbay', name: 'MedBay', rects: [{ x: 900, y: 520, w: 350, h: 330 }], floor: 'white' },
    { id: 'cafeteria', name: 'Cafeteria', rects: [{ x: 1300, y: 80, w: 800, h: 620 }], floor: 'tile' },
    { id: 'weapons', name: 'Weapons', rects: [{ x: 2350, y: 120, w: 400, h: 360 }], floor: 'dark' },
    { id: 'o2', name: 'O2', rects: [{ x: 2200, y: 580, w: 250, h: 250 }], floor: 'white' },
    { id: 'navigation', name: 'Navigation', rects: [{ x: 2900, y: 750, w: 350, h: 400 }], floor: 'carpet' },
    { id: 'shields', name: 'Shields', rects: [{ x: 2450, y: 1400, w: 400, h: 350 }], floor: 'dark' },
    { id: 'comms', name: 'Communications', rects: [{ x: 2050, y: 1680, w: 350, h: 270 }], floor: 'grate' },
    { id: 'storage', name: 'Storage', rects: [{ x: 1500, y: 1100, w: 450, h: 650 }], floor: 'metal' },
    { id: 'admin', name: 'Admin', rects: [{ x: 2050, y: 920, w: 350, h: 300 }], floor: 'carpet' },
    { id: 'electrical', name: 'Electrical', rects: [{ x: 1000, y: 1100, w: 350, h: 300 }], floor: 'grate' },
  ],
  halls: [
    { x: 600, y: 300, w: 700, h: 130 }, // upper hall
    { x: 1000, y: 430, w: 130, h: 90 }, // medbay mouth
    { x: 400, y: 520, w: 130, h: 780 }, // left corridor
    { x: 300, y: 850, w: 100, h: 120 }, // reactor mouth
    { x: 530, y: 860, w: 80, h: 110 }, // security mouth
    { x: 600, y: 1450, w: 900, h: 130 }, // lower hall
    { x: 1100, y: 1400, w: 130, h: 50 }, // electrical mouth
    { x: 1650, y: 700, w: 130, h: 400 }, // cafeteria -> storage
    { x: 1780, y: 940, w: 270, h: 120 }, // admin hall
    { x: 2100, y: 250, w: 250, h: 130 }, // weapons hall
    { x: 2500, y: 480, w: 130, h: 920 }, // right corridor
    { x: 2450, y: 650, w: 50, h: 110 }, // o2 mouth
    { x: 2630, y: 890, w: 270, h: 120 }, // navigation hall
    { x: 1950, y: 1450, w: 500, h: 130 }, // storage -> shields
    { x: 2170, y: 1580, w: 130, h: 100 }, // comms mouth
  ],
  obstacles: [
    { circle: { x: 1700, y: 390, r: 70 }, blocksVision: false, prop: 'bigTable' },
    { circle: { x: 1480, y: 220, r: 50 }, blocksVision: false, prop: 'table' },
    { circle: { x: 1920, y: 220, r: 50 }, blocksVision: false, prop: 'table' },
    { circle: { x: 1480, y: 570, r: 50 }, blocksVision: false, prop: 'table' },
    { circle: { x: 1920, y: 570, r: 50 }, blocksVision: false, prop: 'table' },
    { rect: { x: 250, y: 210, w: 170, h: 170 }, blocksVision: true, prop: 'engine' },
    { rect: { x: 250, y: 1420, w: 170, h: 170 }, blocksVision: true, prop: 'engine' },
    { circle: { x: 170, y: 910, r: 55 }, blocksVision: true, prop: 'reactorCore' },
    { rect: { x: 2175, y: 1040, w: 100, h: 60 }, blocksVision: false, prop: 'adminTable' },
    { rect: { x: 1640, y: 1300, w: 170, h: 130 }, blocksVision: true, prop: 'crates' },
    { rect: { x: 1540, y: 1600, w: 90, h: 90 }, blocksVision: true, prop: 'crates' },
    { rect: { x: 1120, y: 570, w: 110, h: 40 }, blocksVision: false, prop: 'bed' },
    { rect: { x: 1120, y: 650, w: 110, h: 40 }, blocksVision: false, prop: 'bed' },
    { rect: { x: 650, y: 800, w: 150, h: 25 }, blocksVision: false, prop: 'desk' },
    { rect: { x: 3190, y: 900, w: 45, h: 100 }, blocksVision: false, prop: 'navConsole' },
    { circle: { x: 2600, y: 330, r: 30 }, blocksVision: false, prop: 'chair' },
    { rect: { x: 2150, y: 1905, w: 180, h: 45 }, blocksVision: false, prop: 'desk' },
    { rect: { x: 2280, y: 680, w: 70, h: 50 }, blocksVision: false, prop: 'box' },
  ],
  doors: [
    { id: 'cafe-w', room: 'cafeteria', seg: { x1: 1300, y1: 300, x2: 1300, y2: 430 } },
    { id: 'cafe-s', room: 'cafeteria', seg: { x1: 1650, y1: 700, x2: 1780, y2: 700 } },
    { id: 'cafe-e', room: 'cafeteria', seg: { x1: 2100, y1: 250, x2: 2100, y2: 380 } },
    { id: 'medbay-n', room: 'medbay', seg: { x1: 1000, y1: 520, x2: 1130, y2: 520 } },
    { id: 'security-w', room: 'security', seg: { x1: 610, y1: 860, x2: 610, y2: 970 } },
    { id: 'elec-s', room: 'electrical', seg: { x1: 1100, y1: 1400, x2: 1230, y2: 1400 } },
    { id: 'storage-w', room: 'storage', seg: { x1: 1500, y1: 1450, x2: 1500, y2: 1580 } },
    { id: 'storage-n', room: 'storage', seg: { x1: 1650, y1: 1100, x2: 1780, y2: 1100 } },
    { id: 'storage-e', room: 'storage', seg: { x1: 1950, y1: 1450, x2: 1950, y2: 1580 } },
    { id: 'ue-e', room: 'upperEngine', seg: { x1: 600, y1: 300, x2: 600, y2: 430 } },
    { id: 'ue-s', room: 'upperEngine', seg: { x1: 400, y1: 520, x2: 530, y2: 520 } },
    { id: 'le-n', room: 'lowerEngine', seg: { x1: 400, y1: 1300, x2: 530, y2: 1300 } },
    { id: 'le-e', room: 'lowerEngine', seg: { x1: 600, y1: 1450, x2: 600, y2: 1580 } },
  ],
  vents: [
    { id: 'v-ue', room: 'upperEngine', x: 555, y: 470, links: ['v-reactor-top'] },
    { id: 'v-reactor-top', room: 'reactor', x: 70, y: 765, links: ['v-ue'] },
    { id: 'v-reactor-bottom', room: 'reactor', x: 70, y: 1055, links: ['v-le'] },
    { id: 'v-le', room: 'lowerEngine', x: 555, y: 1345, links: ['v-reactor-bottom'] },
    { id: 'v-medbay', room: 'medbay', x: 945, y: 570, links: ['v-security', 'v-elec'] },
    { id: 'v-security', room: 'security', x: 800, y: 1020, links: ['v-medbay', 'v-elec'] },
    { id: 'v-elec', room: 'electrical', x: 1310, y: 1360, links: ['v-medbay', 'v-security'] },
    { id: 'v-cafe', room: 'cafeteria', x: 2050, y: 130, links: ['v-admin', 'v-hall'] },
    { id: 'v-admin', room: 'admin', x: 2200, y: 1180, links: ['v-cafe', 'v-hall'] },
    { id: 'v-hall', room: 'shields', x: 2760, y: 1460, links: ['v-cafe', 'v-admin'] },
    { id: 'v-weapons', room: 'weapons', x: 2705, y: 165, links: ['v-nav-top'] },
    { id: 'v-nav-top', room: 'navigation', x: 2960, y: 795, links: ['v-weapons'] },
    { id: 'v-nav-bottom', room: 'navigation', x: 2960, y: 1105, links: ['v-shields'] },
    { id: 'v-shields', room: 'shields', x: 2805, y: 1705, links: ['v-nav-bottom'] },
  ],
  stations: [
    // Consoles
    st('cams', 'security', 725, 850),
    st('admin', 'admin', 2225, 1070),
    st('vitals', 'medbay', 1225, 800),
    // Sabotage fixes
    st('lights', 'electrical', 1030, 1290),
    st('reactor', 'reactor', 170, 750, 'reactor:top'),
    st('reactor', 'reactor', 170, 1070, 'reactor:bottom'),
    st('o2', 'o2', 2420, 605),
    st('o2', 'admin', 2375, 950),
    st('comms', 'comms', 2375, 1790),
    // Wiring
    st('wires', 'electrical', 1030, 1130),
    st('wires', 'storage', 1530, 1130),
    st('wires', 'admin', 2080, 950),
    st('wires', 'navigation', 3220, 790),
    st('wires', 'cafeteria', 1330, 110),
    st('wires', 'security', 635, 1035),
    // Other tasks
    st('swipe', 'admin', 2370, 1190),
    st('calibrate', 'electrical', 1320, 1130),
    st('divert', 'electrical', 1180, 1125),
    st('divert', 'weapons', 2720, 450),
    st('divert', 'o2', 2230, 610),
    st('divert', 'navigation', 3220, 1110),
    st('divert', 'shields', 2825, 1425),
    st('divert', 'comms', 2080, 1710),
    st('divert', 'upperEngine', 230, 150),
    st('divert', 'lowerEngine', 230, 1670),
    st('divert', 'security', 815, 1035),
    st('transfer', 'cafeteria', 2070, 670),
    st('transfer', 'weapons', 2380, 450),
    st('transfer', 'navigation', 3100, 1125),
    st('transfer', 'comms', 2080, 1920),
    st('transfer', 'electrical', 1320, 1250),
    st('transfer', 'admin', 2080, 1190),
    st('align', 'upperEngine', 230, 480),
    st('align', 'lowerEngine', 230, 1340),
    st('steering', 'navigation', 3160, 950),
    st('fuel', 'storage', 1920, 1720),
    st('fuel', 'upperEngine', 555, 150),
    st('fuel', 'lowerEngine', 555, 1670),
    st('asteroids', 'weapons', 2550, 150),
    st('garbage', 'cafeteria', 1330, 670),
    st('garbage', 'o2', 2230, 800),
    st('garbage', 'storage', 1720, 1720),
    st('scan', 'medbay', 1000, 780),
    st('simon', 'reactor', 55, 910),
  ],
  cameras: [
    { id: 'cam-nav', name: 'Navigation', x: 2615, y: 900, view: { x: 2420, y: 800, w: 480, h: 320 } },
    { id: 'cam-admin', name: 'Admin', x: 1765, y: 960, view: { x: 1470, y: 740, w: 480, h: 320 } },
    { id: 'cam-medbay', name: 'MedBay', x: 1100, y: 315, view: { x: 760, y: 220, w: 480, h: 320 } },
    { id: 'cam-security', name: 'Security', x: 515, y: 1150, view: { x: 250, y: 1000, w: 480, h: 320 } },
  ],
  button: { x: 1700, y: 390 },
  spawn: { x: 1700, y: 390, r: 150 },
};
