/**
 * Tile-level rules for raised cliff plateaus in the isometric view.
 *
 * Tile (i, j) covers tile space u ∈ [i − 0.5, i + 0.5), v ∈ [j − 0.5, j + 0.5)
 * (tile centres at integer coordinates, as tileToScreen places them). A
 * world point painted `h` px above the ground point (sx, sy + h) appears
 * at screen (sx, sy): raised rock covers the screen area of the tiles
 * behind it (smaller u, v). See cliffRelief.ts for the rock surface itself.
 */

export type CliffTest = (tx: number, ty: number) => boolean;

function cell(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Tiles behind a cliff block (offsets in tile space) whose occupants'
 * sprites can overlap the block on screen: anything standing there is
 * drawn before the block, so the block must be a depth-sorted occluder.
 * Derived for blocks up to 47 px tall, units/trees ≤ 58 px wide and
 * building columns ≤ 64 px wide (see the Task 18 report).
 */
export const OCCLUDER_REACH: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [0, -1],
  [-1, -1],
  [-2, -1],
  [-1, -2],
  [-2, -2],
];

/**
 * True when cliff tile (tx, ty) must be drawn as a depth-sorted sprite:
 * some non-cliff tile inside the map lies close enough behind it that a
 * unit, tree, building or the water surface there could show through.
 * Other cliff tiles are only ever seen in front of flat ground and stay
 * baked into the terrain chunks.
 */
export function needsOccluder(isCliff: CliffTest, width: number, height: number, tx: number, ty: number): boolean {
  if (!isCliff(tx, ty)) return false;
  for (const [dx, dy] of OCCLUDER_REACH) {
    const x = tx + dx;
    const y = ty + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    if (!isCliff(x, y)) return true;
  }
  return false;
}

/**
 * Distance (tiles) from the ground point (u, v) back to the foot of the
 * nearest cliff face behind it, or Infinity when no face is within one
 * tile. Drives the contact shadow and scree at cliff feet.
 */
export function cliffFootDistance(isCliff: CliffTest, u: number, v: number): number {
  const i = cell(u);
  const j = cell(v);
  if (isCliff(i, j)) return Infinity;
  const du = u - (i - 0.5);
  const dv = v - (j - 0.5);
  let d = Infinity;
  if (isCliff(i - 1, j)) d = Math.min(d, du);
  if (isCliff(i, j - 1)) d = Math.min(d, dv);
  if (d === Infinity && isCliff(i - 1, j - 1)) d = Math.hypot(du, dv);
  return d;
}
