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
];

export const hatOf = (i: number): Hat => HATS[i] ?? HATS[0];
export const isHat = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < HATS.length;
