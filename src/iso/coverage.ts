/**
 * Column coverage of occluder sprites, and the part of a unit they hide.
 * Pure geometry in world px (no Phaser), used by UnitXRay.
 */

/** Per art column: first / last opaque row (-1 = empty column). */
export interface ColumnCover {
  readonly width: number;
  readonly top: Int16Array;
  readonly bottom: Int16Array;
}

/** Alpha at or above this counts as covering (soft edges don't). */
export const COVER_ALPHA = 128;

export function columnCover(alpha: (x: number, y: number) => number, w: number, h: number): ColumnCover {
  const top = new Int16Array(w).fill(-1);
  const bottom = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (alpha(x, y) < COVER_ALPHA) continue;
      if (top[x] === -1) top[x] = y;
      bottom[x] = y;
    }
  }
  return { width: w, top, bottom };
}

/** A cover drawn in the world: art px (left, top) is the drawn image's top-left, `scale` world px per art px. */
export interface PlacedCover {
  readonly cover: ColumnCover;
  readonly left: number;
  readonly top: number;
  readonly scale: number;
  readonly flipX: boolean;
  /** Draw depth of the occluder. */
  readonly depth: number;
}

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * The part of `unit` (a world rect) hidden behind `covers` (all drawn in
 * front of it), sampled every `step` px across: the covered columns'
 * x span, from the lowest covered top to the highest covered bottom (so
 * the result never reaches over visible parts of the unit), with the
 * depth of the frontmost contributing cover. Null when less than
 * `minPx` tall or wide.
 */
export function hiddenRect(unit: Box, covers: readonly PlacedCover[], step: number, minPx: number): (Box & { depth: number }) | null {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = -Infinity;
  let y1 = Infinity;
  let depth = -Infinity;
  for (let x = unit.left + step / 2; x < unit.right; x += step) {
    let top = Infinity;
    let bottom = -Infinity;
    let d = -Infinity;
    for (const c of covers) {
      const w = c.cover.width * c.scale;
      if (x < c.left || x >= c.left + w) continue;
      let col = Math.floor((x - c.left) / c.scale);
      if (c.flipX) col = c.cover.width - 1 - col;
      const t = c.cover.top[col] ?? -1;
      if (t < 0) continue;
      top = Math.min(top, c.top + t * c.scale);
      bottom = Math.max(bottom, c.top + ((c.cover.bottom[col] ?? t) + 1) * c.scale);
      d = Math.max(d, c.depth);
    }
    const it = Math.max(top, unit.top);
    const ib = Math.min(bottom, unit.bottom);
    if (ib - it < minPx) continue;
    x0 = Math.min(x0, x - step / 2);
    x1 = Math.max(x1, x + step / 2);
    y0 = Math.max(y0, it);
    y1 = Math.min(y1, ib);
    depth = Math.max(depth, d);
  }
  if (x0 === Infinity || y1 - y0 < minPx) return null;
  const left = Math.max(unit.left, x0);
  const right = Math.min(unit.right, x1);
  if (right - left < minPx) return null;
  return { left, top: y0, right, bottom: y1, depth };
}

/** Something that draws occluders: adds those overlapping `box` and drawn deeper than `minDepth` to `out`. */
export interface CoverSource {
  collectCovers(box: Box, minDepth: number, out: PlacedCover[]): void;
}

/** Spatial hash cell size (world px) of static cover sources. */
export const COVER_CELL = 128;

/** Calls `fn` with each hash cell key overlapping `box` (cells of COVER_CELL px). */
export function forEachCoverCell(box: Box, fn: (key: number) => void): void {
  const cx0 = Math.floor(box.left / COVER_CELL);
  const cx1 = Math.floor(box.right / COVER_CELL);
  const cy0 = Math.floor(box.top / COVER_CELL);
  const cy1 = Math.floor(box.bottom / COVER_CELL);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) fn(cellKey(cx, cy));
}

function cellKey(cx: number, cy: number): number {
  return (cy + 4096) * 8192 + (cx + 4096);
}
