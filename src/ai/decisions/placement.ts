import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';

export interface PlacementOptions {
  /** Ring distance (tiles, Chebyshev) from the anchor to start searching at. */
  readonly minRadius: number;
  readonly maxRadius: number;
  /**
   * Keep a free ring of tiles around the footprint (1) so buildings never
   * wall in the base, or allow touching (0, e.g. a camp next to trees).
   */
  readonly clearance: 0 | 1;
  /** Extra per-tile rule (e.g. only explored tiles — the AI never builds blind). */
  readonly tileAllowed?: (tx: number, ty: number) => boolean;
  /** Ring tiles that may be blocked anyway (e.g. farms may hug the town centre they deliver to). */
  readonly mayTouch?: (tx: number, ty: number) => boolean;
  /**
   * The free ring only has to be clear of buildings: trees, mines and water
   * may touch, as long as each keeps another passable neighbour (villagers
   * still reach it) and at least two ring tiles stay free.
   */
  readonly natureMayTouch?: boolean;
}

/** Every footprint tile is free and allowed; with clearance, the ring around it is passable too. */
export function canPlaceAt(
  map: MapData,
  origin: TileCoord,
  width: number,
  height: number,
  options: Pick<PlacementOptions, 'clearance' | 'tileAllowed' | 'mayTouch' | 'natureMayTouch'>,
): boolean {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const tx = origin.tx + dx;
      const ty = origin.ty + dy;
      if (!map.isPassable(tx, ty)) return false;
      if (options.tileAllowed && !options.tileAllowed(tx, ty)) return false;
    }
  }
  if (options.clearance === 0) return true;
  const inFootprint = (tx: number, ty: number) =>
    tx >= origin.tx && ty >= origin.ty && tx < origin.tx + width && ty < origin.ty + height;
  let open = 0;
  for (let dy = -1; dy <= height; dy++) {
    for (let dx = -1; dx <= width; dx++) {
      const inside = dx >= 0 && dx < width && dy >= 0 && dy < height;
      if (inside) continue;
      const tx = origin.tx + dx;
      const ty = origin.ty + dy;
      // The map edge is fine; buildings, trees, water and mines are not (nature is, with natureMayTouch).
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
      if (map.isPassable(tx, ty)) {
        open++;
        continue;
      }
      if (options.mayTouch?.(tx, ty)) continue;
      if (!options.natureMayTouch || map.isBlocked(tx, ty)) return false;
      // A tree / mine touching the building must keep another way in.
      if (!hasOpenNeighbour(map, tx, ty, inFootprint)) return false;
    }
  }
  // Touching nature, the building still needs room around it to be reached and walked past.
  return !options.natureMayTouch || open >= NATURE_MIN_OPEN_RING;
}

/** Free ring tiles a building placed against trees / mines must keep. */
const NATURE_MIN_OPEN_RING = 2;

/** Some passable tile next to (tx, ty) that the new footprint will not cover. */
function hasOpenNeighbour(map: MapData, tx: number, ty: number, covered: (tx: number, ty: number) => boolean): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = tx + dx;
      const ny = ty + dy;
      if (!covered(nx, ny) && map.isPassable(nx, ny)) return true;
    }
  }
  return false;
}

/**
 * Searches square rings around `anchor` (nearest ring first, the footprint
 * centred on each ring tile) for a free origin. Deterministic: ties go to
 * the first tile in scan order.
 */
export function findPlacement(
  map: MapData,
  anchor: TileCoord,
  width: number,
  height: number,
  options: PlacementOptions,
): TileCoord | null {
  const ox = Math.floor((width - 1) / 2);
  const oy = Math.floor((height - 1) / 2);
  for (let r = options.minRadius; r <= options.maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const origin = { tx: anchor.tx + dx - ox, ty: anchor.ty + dy - oy };
        if (canPlaceAt(map, origin, width, height, options)) return origin;
      }
    }
  }
  return null;
}

/**
 * Anchor for a drop-off camp: the centre of the resource tiles within
 * `radius` of the nearest one to `home` (a cluster), or null.
 */
export function clusterAnchor(
  nodes: readonly { position?: TileCoord }[],
  home: TileCoord,
  radius: number,
): TileCoord | null {
  let seed: TileCoord | null = null;
  let seedD = Infinity;
  for (const n of nodes) {
    if (!n.position) continue;
    const d = Math.max(Math.abs(n.position.tx - home.tx), Math.abs(n.position.ty - home.ty));
    if (d < seedD) {
      seedD = d;
      seed = n.position;
    }
  }
  if (!seed) return null;
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (const n of nodes) {
    if (!n.position) continue;
    if (Math.max(Math.abs(n.position.tx - seed.tx), Math.abs(n.position.ty - seed.ty)) > radius) continue;
    sx += n.position.tx;
    sy += n.position.ty;
    count++;
  }
  return { tx: Math.round(sx / count), ty: Math.round(sy / count) };
}
