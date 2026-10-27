/** A rectangle in texture px. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Bounding box (relative to the cell) of the non-transparent pixels of
 * an RGBA cell, grown outward to multiples of `align` (so downscaled
 * normal maps stay texel-aligned), or null when the cell is empty.
 */
export function alphaBounds(
  data: ArrayLike<number>,
  stride: number,
  cell: Rect,
  align: number,
): Rect | null {
  let x0 = cell.w;
  let y0 = cell.h;
  let x1 = -1;
  let y1 = -1;
  for (let j = 0; j < cell.h; j++) {
    for (let i = 0; i < cell.w; i++) {
      if ((data[((cell.y + j) * stride + cell.x + i) * 4 + 3] ?? 0) === 0) continue;
      if (i < x0) x0 = i;
      if (i > x1) x1 = i;
      if (j < y0) y0 = j;
      if (j > y1) y1 = j;
    }
  }
  if (x1 < 0) return null;
  const ax = Math.floor(x0 / align) * align;
  const ay = Math.floor(y0 / align) * align;
  const bx = Math.min(cell.w, Math.ceil((x1 + 1) / align) * align);
  const by = Math.min(cell.h, Math.ceil((y1 + 1) / align) * align);
  return { x: ax, y: ay, w: bx - ax, h: by - ay };
}

/**
 * Shelf packing into a fixed-width atlas: rectangles go left to right in
 * rows as tall as their tallest member (inputs sorted tallest first),
 * `gutter` px of empty space after every rectangle and row (so linear
 * filtering, also of a downscaled normal map, never mixes neighbours).
 * Returns each rectangle's position (input order) and the atlas height.
 */
export function shelfPack(
  sizes: ReadonlyArray<{ w: number; h: number }>,
  width: number,
  gutter = 0,
): { at: Array<[number, number]>; height: number } {
  const order = sizes.map((_, i) => i).sort((a, b) => (sizes[b]?.h ?? 0) - (sizes[a]?.h ?? 0));
  const at: Array<[number, number]> = new Array<[number, number]>(sizes.length);
  let x = 0;
  let y = 0;
  let row = 0;
  for (const i of order) {
    const s = sizes[i];
    if (!s) continue;
    if (x + s.w > width) {
      x = 0;
      y += row + gutter;
      row = 0;
    }
    at[i] = [x, y];
    x += s.w + gutter;
    row = Math.max(row, s.h);
  }
  return { at, height: y + row + gutter };
}

/** The smallest rectangle on multiples of `align` that contains `r`. */
export function alignOut(r: Rect, align: number): Rect {
  const x = Math.floor(r.x / align) * align;
  const y = Math.floor(r.y / align) * align;
  return { x, y, w: Math.ceil((r.x + r.w) / align) * align - x, h: Math.ceil((r.y + r.h) / align) * align - y };
}
