import type { Seg } from '../geom';

/** Uniform-grid spatial hash over segments for collision and ray queries. */
export class SegGrid {
  readonly cols: number;
  readonly rows: number;
  private cells: number[][];
  private stamp: Uint32Array;
  private stampId = 1;

  constructor(
    readonly segs: Seg[],
    w: number,
    h: number,
    readonly bucket = 128,
  ) {
    this.cols = Math.ceil(w / bucket) + 1;
    this.rows = Math.ceil(h / bucket) + 1;
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    this.stamp = new Uint32Array(segs.length);
    segs.forEach((s, i) => {
      const c0 = this.col(Math.min(s.x1, s.x2));
      const c1 = this.col(Math.max(s.x1, s.x2));
      const r0 = this.row(Math.min(s.y1, s.y2));
      const r1 = this.row(Math.max(s.y1, s.y2));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.cells[r * this.cols + c].push(i);
    });
  }

  private col(x: number): number {
    return Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.bucket)));
  }
  private row(y: number): number {
    return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.bucket)));
  }

  /** Append every segment whose bucket overlaps the box to `out` (deduplicated). */
  query(minX: number, minY: number, maxX: number, maxY: number, out: Seg[]): Seg[] {
    const id = ++this.stampId;
    if (id === 0xffffffff) {
      this.stamp.fill(0);
      this.stampId = 1;
    }
    const c0 = this.col(minX);
    const c1 = this.col(maxX);
    const r0 = this.row(minY);
    const r1 = this.row(maxY);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        for (const i of this.cells[r * this.cols + c]) {
          if (this.stamp[i] === this.stampId) continue;
          this.stamp[i] = this.stampId;
          out.push(this.segs[i]);
        }
      }
    }
    return out;
  }
}
