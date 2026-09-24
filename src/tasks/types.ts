export interface TaskGameProps {
  step: number;
  params: Record<string, string | number>;
  onComplete: () => void;
}

/** Deterministic PRNG per task so layouts don't reshuffle on re-render. */
export function seeded(seed: number | string | undefined): () => number {
  let a = (Number(seed) || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a pointer event to SVG viewBox coordinates. */
export function svgPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return { x: vb.x + ((e.clientX - r.left) / r.width) * vb.width, y: vb.y + ((e.clientY - r.top) / r.height) * vb.height };
}
