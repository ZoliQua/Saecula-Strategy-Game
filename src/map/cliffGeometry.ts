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

const TILE_HALF_HEIGHT = 16;
/** Half-width (px) of the widest thing that can stand behind a block: units/trees ≤ 58 px, building columns ≤ 64 px. */
const OCCUPANT_HALF_WIDTH = 32;
/** How far below its ground point an occupant's sprite reaches (tree roots, unit feet). */
const OCCUPANT_REACH_DOWN = 16;

/**
 * Tiles behind a cliff block (offsets in tile space) whose occupants'
 * sprites can overlap the block on screen: anything standing there is
 * drawn before the block, so the block must be a depth-sorted occluder.
 * The block covers x ∈ [−32, 32], y ∈ [−16 − h, 16] around its tile
 * centre; an occupant at offset (−a, −b) stands at x = (b − a)·32,
 * y = −16(a + b), with its sprite OCCUPANT_HALF_WIDTH to each side and
 * OCCUPANT_REACH_DOWN below its ground point.
 */
export function occluderReach(maxHeight: number): Array<readonly [number, number]> {
  const h = Math.ceil(maxHeight);
  const out: Array<readonly [number, number]> = [];
  for (let s = 1; 16 * s - OCCUPANT_REACH_DOWN < TILE_HALF_HEIGHT + h; s++) {
    for (let a = 0; a <= s; a++) {
      const b = s - a;
      if (Math.abs(b - a) * 32 < 32 + OCCUPANT_HALF_WIDTH) out.push([-a, -b]);
    }
  }
  return out;
}

/**
 * True when cliff tile (tx, ty) must be drawn as a depth-sorted sprite:
 * some non-cliff tile inside the map lies close enough behind it that a
 * unit, tree, building or the water surface there could show through.
 * Other cliff tiles are only ever seen in front of flat ground and stay
 * baked into the terrain chunks.
 */
export function needsOccluder(
  isCliff: CliffTest,
  width: number,
  height: number,
  tx: number,
  ty: number,
  reach: ReadonlyArray<readonly [number, number]>,
): boolean {
  if (!isCliff(tx, ty)) return false;
  for (const [dx, dy] of reach) {
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

/** How many tiles beyond a footprint's front walls a cliff block can still overlap the building's sprite. */
const FOOTPRINT_FRONT_REACH = 2;

/**
 * Tiles in front of a w×h footprint at (fx, fy) along u or v (beside its
 * +u wall or its +v wall, up to FOOTPRINT_FRONT_REACH tiles out). Raised
 * rock standing there hides part of the building, but sorts before it by
 * plain tile depth; such occluders take the building's depth instead.
 */
export function tilesInFrontOfFootprint(fx: number, fy: number, w: number, h: number): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  const r = FOOTPRINT_FRONT_REACH;
  for (let ty = fy; ty < fy + h + r; ty++) {
    for (let tx = fx; tx < fx + w + r; tx++) {
      if (tx < fx + w && ty < fy + h) continue;
      out.push([tx, ty]);
    }
  }
  return out;
}

/**
 * Draw depth for a w×h building at (fx, fy) normally drawn at `depth`
 * (its front tile) beside raised rock: below the lowest occluder in front
 * of its +u / +v walls (`rockOffset` above its tile depth) by `gap`, so
 * that rock covers the building. Raising the rock instead would also lift
 * it over units standing in front of it (a 4×4 Wonder's front tile is two
 * rows ahead of the rock beside its wall). Every tile at that depth or
 * more, other than the footprint, is in front of the building, so units,
 * trees and rock there still sort correctly against it.
 */
export function depthBelowFrontRock(fx: number, fy: number, w: number, h: number, depth: number, isOccluder: CliffTest, rockOffset: number, gap: number): number {
  let d = depth;
  for (const [tx, ty] of tilesInFrontOfFootprint(fx, fy, w, h)) {
    if (isOccluder(tx, ty)) d = Math.min(d, tx + ty + rockOffset - gap);
  }
  return d;
}
