/**
 * One filled/stroked shape of a hat, as SVG path data in crewmate units
 * (feet at 0,0; top of the head at about 1,-37). `fill` may be 'body' or
 * 'shadow' to use the wearer's colour. Shared by the canvas and SVG renderers.
 */
export interface HatPart {
  d: string;
  fill: string;
  /** Stroke colour instead of the black outline ('none' for no stroke). */
  stroke?: string;
  width?: number;
}

export interface Hat {
  name: string;
  parts: HatPart[];
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;

export const HATS: readonly Hat[] = [
  { name: 'None', parts: [] },
  {
    name: 'Party Hat',
    parts: [
      { d: 'M-5 -34 L4 -53 L11 -34 Z', fill: '#ff5ab4' },
      { d: 'M-1.5 -41.5 L8 -41.5 M0.7 -47 L6 -47', fill: 'none', stroke: '#fff27a', width: 2 },
      { d: circle(4, -54, 2.8), fill: '#fff27a' },
    ],
  },
  {
    name: 'Top Hat',
    parts: [
      { d: 'M-4 -35 L-4 -53 L10 -53 L10 -35 Z', fill: '#26262e' },
      { d: 'M-4 -41 L10 -41 L10 -37.5 L-4 -37.5 Z', fill: '#c51111' },
      { d: 'M-9 -35.5 C-9 -32 15 -32 15 -35.5 C15 -37 -9 -37 -9 -35.5 Z', fill: '#26262e' },
    ],
  },
  {
    name: 'Crown',
    parts: [
      { d: 'M-6 -34 L-7.5 -48 L-2 -41.5 L2 -50 L6 -41.5 L10.5 -48 L9 -34 Z', fill: '#ffd23a' },
      { d: circle(2, -38, 1.8), fill: '#e0344f', width: 1.2 },
    ],
  },
  {
    name: 'Beanie',
    parts: [
      { d: 'M-10 -33 C-10 -48 12 -48 12 -33 Z', fill: '#2f8fdc' },
      { d: 'M-11 -36 L13 -36 L13 -31 L-11 -31 Z', fill: '#1d5f9a' },
      { d: circle(1, -46.5, 3), fill: '#f4f4f4' },
    ],
  },
  {
    name: 'Chef Hat',
    parts: [
      { d: 'M-7 -34 L-7 -42 C-14 -44 -11 -55 -4 -52 C-2 -59 6 -59 7 -52 C14 -55 16 -44 9 -42 L9 -34 Z', fill: '#f4f4f4' },
      { d: 'M-7 -38 L9 -38', fill: 'none', width: 1.4 },
    ],
  },
  {
    name: 'Cowboy Hat',
    parts: [
      { d: 'M-6 -35 C-7 -46 -4 -49 1 -45.5 C6 -49 9 -46 8 -35 Z', fill: '#8b5a2b' },
      { d: 'M-6 -38 L8 -38', fill: 'none', stroke: '#4a2c12', width: 2.2 },
      { d: 'M-15 -36 C-10 -31 12 -31 17 -36 C12 -38 -10 -38 -15 -36 Z', fill: '#8b5a2b' },
    ],
  },
  {
    name: 'Cat Ears',
    parts: [
      { d: 'M-9.5 -31 L-8 -45 L-1 -36.5 Z', fill: 'body' },
      { d: 'M4 -36.5 L11 -45 L12.5 -31 Z', fill: 'body' },
      { d: 'M-7.5 -34 L-7 -41 L-3.5 -36.5 Z', fill: '#f7a1c4', stroke: 'none' },
      { d: 'M6 -36.5 L9.5 -41 L10.5 -34 Z', fill: '#f7a1c4', stroke: 'none' },
    ],
  },
  {
    name: 'Sprout',
    parts: [
      { d: 'M1 -36 Q0 -43 2 -47', fill: 'none', stroke: '#2e7d32', width: 2.2 },
      { d: 'M2 -47 C-4 -52 -9 -48 -7.5 -44.5 C-3 -44 0 -45 2 -47 Z', fill: '#5bd35b', width: 1.6 },
      { d: 'M2 -47 C7 -54 12 -50 10.5 -46.5 C6 -45.5 4 -46 2 -47 Z', fill: '#5bd35b', width: 1.6 },
    ],
  },
  {
    name: 'Halo',
    parts: [
      { d: 'M-9 -46 C-9 -50 11 -50 11 -46 C11 -42 -9 -42 -9 -46 Z', fill: 'none', stroke: '#8a6d00', width: 5 },
      { d: 'M-9 -46 C-9 -50 11 -50 11 -46 C11 -42 -9 -42 -9 -46 Z', fill: 'none', stroke: '#ffe766', width: 2.6 },
    ],
  },
  {
    name: 'Baseball Cap',
    parts: [
      { d: 'M-10 -33 C-10 -46 12 -46 12 -33 Z', fill: '#e0344f' },
      { d: 'M8 -34.5 L21 -33.5 C21 -31 10 -31 8 -32 Z', fill: '#a8192f' },
      { d: circle(1, -44.5, 1.6), fill: '#a8192f' },
    ],
  },
  {
    name: 'Wizard Hat',
    parts: [
      { d: 'M-9 -35 L13 -35 L5 -52 Q2 -58 -5 -57 Q-1 -54 -1 -49 Z', fill: '#4b2a9a' },
      { d: 'M-14 -34.5 C-14 -31 18 -31 18 -34.5 C18 -37.5 -14 -37.5 -14 -34.5 Z', fill: '#4b2a9a' },
      { d: 'M3 -46 l1 2.2 2.4 .3 -1.8 1.6 .5 2.4 -2.1 -1.2 -2.1 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3 Z', fill: '#ffe766', stroke: 'none' },
    ],
  },
  {
    name: 'Viking Helmet',
    parts: [
      { d: 'M-10 -38 C-17 -40 -18 -48 -15 -53 C-14 -47 -11 -44 -7 -43 Z', fill: '#f1e6c8' },
      { d: 'M12 -38 C19 -40 20 -48 17 -53 C16 -47 13 -44 9 -43 Z', fill: '#f1e6c8' },
      { d: 'M-10 -32 C-10 -47 12 -47 12 -32 Z', fill: '#9aa3ad' },
      { d: 'M-11 -35 L13 -35 L13 -31 L-11 -31 Z', fill: '#6b4a26' },
    ],
  },
  {
    name: 'Santa Hat',
    parts: [
      { d: 'M-10 -35 C-8 -50 8 -54 16 -46 C18 -44 17 -41 15 -40 C12 -44 8 -44 12 -35 Z', fill: '#d62828' },
      { d: 'M-12 -35.5 C-12 -32 14 -32 14 -35.5 C14 -39 -12 -39 -12 -35.5 Z', fill: '#f4f4f4' },
      { d: circle(16, -40, 3), fill: '#f4f4f4' },
    ],
  },
  {
    name: 'Pirate Hat',
    parts: [
      { d: 'M-15 -34 C-12 -51 14 -51 17 -34 C8 -38.5 -6 -38.5 -15 -34 Z', fill: '#1d1d24' },
      { d: circle(1, -42.5, 2.4), fill: '#f4f4f4', stroke: 'none' },
      { d: 'M-2.5 -38.5 L4.5 -38.5', fill: 'none', stroke: '#f4f4f4', width: 1.4 },
    ],
  },
  {
    name: 'Propeller Cap',
    parts: [
      { d: 'M1 -45 L1 -50', fill: 'none', stroke: '#333', width: 1.8 },
      { d: 'M-8 -51 C-4 -53.5 0 -51.5 1 -50 C0 -48.5 -4 -48 -8 -51 Z', fill: '#2f8fdc', width: 1.4 },
      { d: 'M10 -49 C6 -46.5 2 -48.5 1 -50 C2 -51.5 6 -52 10 -49 Z', fill: '#e0344f', width: 1.4 },
      { d: 'M-10 -33 C-10 -47 12 -47 12 -33 Z', fill: '#ffd23a' },
      { d: 'M1 -46 L1 -33', fill: 'none', stroke: '#e0344f', width: 3 },
    ],
  },
  {
    name: 'Bunny Ears',
    parts: [
      { d: 'M-7 -34 C-11 -44 -9 -56 -5 -56 C-1 -56 -1 -44 -3 -35 Z', fill: '#f4f4f4' },
      { d: 'M-6 -37 C-8 -45 -7 -52 -5 -52 C-3 -52 -3 -45 -4 -37 Z', fill: '#f7a1c4', stroke: 'none' },
      { d: 'M5 -35 C3 -44 3 -56 7 -56 C11 -56 13 -44 9 -34 Z', fill: '#f4f4f4' },
      { d: 'M6 -37 C5 -45 5 -52 7 -52 C9 -52 10 -45 8 -37 Z', fill: '#f7a1c4', stroke: 'none' },
    ],
  },
  {
    name: 'Graduation Cap',
    parts: [
      { d: 'M-6 -35 L-6 -43 L10 -43 L10 -35 Z', fill: '#26262e' },
      { d: 'M-13 -44 L2 -49.5 L17 -44 L2 -38.5 Z', fill: '#26262e' },
      { d: 'M2 -44 L13 -42 L13 -35.5', fill: 'none', stroke: '#ffd23a', width: 1.6 },
      { d: circle(13, -35, 1.6), fill: '#ffd23a', stroke: 'none' },
    ],
  },
  {
    name: 'Headphones',
    parts: [
      { d: 'M-12 -27 C-12 -48 14 -48 14 -27', fill: 'none', stroke: '#2a2a33', width: 3 },
      { d: 'M-15 -32 L-9 -32 L-9 -21 L-15 -21 Z', fill: '#16c2c2' },
      { d: 'M12 -32 L17 -32 L17 -21 L12 -21 Z', fill: '#16c2c2' },
    ],
  },
  {
    name: 'Flower',
    parts: [
      ...[0, 72, 144, 216, 288].map((a) => ({
        d: circle(4 + 3.4 * Math.cos((a * Math.PI) / 180), -42 + 3.4 * Math.sin((a * Math.PI) / 180), 2.6),
        fill: '#f4f4f4',
        width: 1.2,
      })),
      { d: circle(4, -42, 2.2), fill: '#ffc93a', width: 1.2 },
    ],
  },
  {
    name: 'Antenna',
    parts: [
      { d: 'M1 -37 L1 -49', fill: 'none', stroke: '#333', width: 1.8 },
      { d: circle(1, -51.5, 3), fill: '#ff4d4d' },
    ],
  },
  {
    name: 'Traffic Cone',
    parts: [
      { d: 'M-5 -34 L1 -55 L7 -34 Z', fill: '#ff7a1a' },
      { d: 'M-2.4 -43 L4.4 -43 L5.4 -39 L-3.4 -39 Z', fill: '#f4f4f4', stroke: 'none' },
      { d: 'M-9 -35.5 L11 -35.5 L11 -32 L-9 -32 Z', fill: '#ff7a1a' },
    ],
  },
];

export const hatOf = (i: number): Hat => HATS[i] ?? HATS[0];
export const isHat = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < HATS.length;
