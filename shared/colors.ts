export interface PlayerColor {
  name: string;
  body: string;
  shadow: string;
}

export const COLORS: readonly PlayerColor[] = [
  { name: 'Red', body: '#c51111', shadow: '#7a0838' },
  { name: 'Blue', body: '#132ed1', shadow: '#09158e' },
  { name: 'Green', body: '#117f2d', shadow: '#0a4d2e' },
  { name: 'Pink', body: '#ed54ba', shadow: '#ab2bad' },
  { name: 'Orange', body: '#ef7d0d', shadow: '#b33e15' },
  { name: 'Yellow', body: '#f5f557', shadow: '#c38823' },
  { name: 'Black', body: '#3f474e', shadow: '#1e1f26' },
  { name: 'White', body: '#d6e0f0', shadow: '#8394bf' },
  { name: 'Purple', body: '#6b2fbb', shadow: '#3b177c' },
  { name: 'Brown', body: '#71491e', shadow: '#5e2615' },
  { name: 'Cyan', body: '#38fedc', shadow: '#24a8be' },
  { name: 'Lime', body: '#50ef39', shadow: '#15a742' },
  { name: 'Maroon', body: '#6b2b3c', shadow: '#41202b' },
  { name: 'Rose', body: '#ecc0d3', shadow: '#de92b3' },
  { name: 'Banana', body: '#fffebe', shadow: '#d2bc89' },
  { name: 'Gray', body: '#758593', shadow: '#46565f' },
  { name: 'Tan', body: '#928776', shadow: '#51413e' },
  { name: 'Coral', body: '#ec7578', shadow: '#b4435a' },
];

export const colorOf = (i: number): PlayerColor => COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length];
