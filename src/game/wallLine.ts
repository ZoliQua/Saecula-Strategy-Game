import type { TileCoord } from '../iso/coordinates';

/**
 * Tiles of a wall line dragged from `start` to `end`. The drag is snapped to
 * the nearest of the eight tile-space directions (axis-aligned or 45 degree
 * diagonal); a drag that is not exactly on a direction is cut where the
 * dominant axis (or, for a diagonal, the shorter axis) ends. Both endpoints
 * are included; a zero-length drag yields the single start tile.
 */
export function wallLineTiles(start: TileCoord, end: TileCoord): TileCoord[] {
  const dx = end.tx - start.tx;
  const dy = end.ty - start.ty;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  let stepX: number;
  let stepY: number;
  let length: number;
  if (ay * 2 <= ax) {
    stepX = sx;
    stepY = 0;
    length = ax;
  } else if (ax * 2 <= ay) {
    stepX = 0;
    stepY = sy;
    length = ay;
  } else {
    stepX = sx;
    stepY = sy;
    length = Math.min(ax, ay);
  }

  const tiles: TileCoord[] = [];
  for (let i = 0; i <= length; i++) {
    tiles.push({ tx: start.tx + stepX * i, ty: start.ty + stepY * i });
  }
  return tiles;
}

export interface WallPlan {
  /** Segments to build, in line order. */
  readonly build: TileCoord[];
  /** Tiles skipped because something already occupies them. */
  readonly blocked: TileCoord[];
  /** Free tiles dropped because the wood ran out. */
  readonly unaffordable: TileCoord[];
}

/**
 * Splits a wall line into what will be built and what is skipped: occupied
 * tiles are skipped (the rest of the line still goes ahead), and segments
 * are charged in line order only while `wood` lasts.
 */
export function planWallSegments(
  tiles: readonly TileCoord[],
  isFree: (tile: TileCoord) => boolean,
  wood: number,
  woodPerSegment: number,
): WallPlan {
  const build: TileCoord[] = [];
  const blocked: TileCoord[] = [];
  const unaffordable: TileCoord[] = [];
  let left = wood;
  for (const tile of tiles) {
    if (!isFree(tile)) {
      blocked.push(tile);
    } else if (left >= woodPerSegment) {
      left -= woodPerSegment;
      build.push(tile);
    } else {
      unaffordable.push(tile);
    }
  }
  return { build, blocked, unaffordable };
}
