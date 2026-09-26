import type { MapDef } from './types';

/** The pre-game dropship. */
export const LOBBY: MapDef = {
  id: 'lobby',
  name: 'Dropship',
  theme: { void: '#07090f', hall: 'metal' },
  size: { w: 1000, h: 760 },
  rooms: [
    {
      id: 'dropship',
      name: 'Dropship',
      rects: [
        { x: 100, y: 100, w: 800, h: 450 },
        { x: 350, y: 550, w: 300, h: 110 },
      ],
      floor: 'metal',
    },
  ],
  halls: [],
  obstacles: [
    { rect: { x: 130, y: 460, w: 80, h: 60 }, blocksVision: false, prop: 'box' },
    { rect: { x: 790, y: 460, w: 80, h: 60 }, blocksVision: false, prop: 'box' },
    { rect: { x: 800, y: 130, w: 70, h: 70 }, blocksVision: false, prop: 'crates' },
  ],
  doors: [],
  vents: [],
  stations: [{ id: 'laptop', kind: 'laptop', room: 'dropship', x: 175, y: 140 }],
  cameras: [],
  button: null,
  spawn: { x: 500, y: 330, r: 130 },
  sabotages: [],
  tasks: [],
};
