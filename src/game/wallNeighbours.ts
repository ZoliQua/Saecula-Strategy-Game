import type { TileCoord } from '../iso/coordinates';
import type { BuildingType } from '../types';

/**
 * Bit flags of the eight tile-space neighbours of a wall segment. Cardinal
 * bits (N, E, S, W) occupy the low nibble so `mask & 0x0f` is the classic
 * 4-bit auto-join index; the diagonal bits let art join diagonal lines.
 * N is ty - 1, E is tx + 1, S is ty + 1, W is tx - 1.
 */
export const WALL_N = 1;
export const WALL_E = 2;
export const WALL_S = 4;
export const WALL_W = 8;
export const WALL_NE = 16;
export const WALL_SE = 32;
export const WALL_SW = 64;
export const WALL_NW = 128;

const NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [0, -1, WALL_N],
  [1, 0, WALL_E],
  [0, 1, WALL_S],
  [-1, 0, WALL_W],
  [1, -1, WALL_NE],
  [1, 1, WALL_SE],
  [-1, 1, WALL_SW],
  [-1, -1, WALL_NW],
];

/** Neighbour mask of `tile` given a wall-presence predicate. */
export function wallNeighbourMaskBy(
  isWall: (tx: number, ty: number) => boolean,
  tile: TileCoord,
): number {
  let mask = 0;
  for (const [dx, dy, bit] of NEIGHBOURS) {
    if (isWall(tile.tx + dx, tile.ty + dy)) mask |= bit;
  }
  return mask;
}

/** Minimal view of a world entity needed to find walls. */
interface WallCandidate {
  readonly position?: TileCoord;
  readonly building?: { readonly type: BuildingType };
  readonly owner?: { readonly playerId: number };
  readonly dying?: unknown;
}

/**
 * Neighbour mask of `tile` counting only `owner`'s live wall segments
 * (finished or under construction). Pure: reads the entities, mutates nothing.
 */
export function wallNeighbourMask(
  entities: Iterable<WallCandidate>,
  tile: TileCoord,
  owner: number,
): number {
  const walls = new Set<number>();
  for (const e of entities) {
    if (e.building?.type !== 'wall' || e.owner?.playerId !== owner || e.dying || !e.position) {
      continue;
    }
    // Only tiles within the 3x3 around `tile` matter.
    if (Math.abs(e.position.tx - tile.tx) <= 1 && Math.abs(e.position.ty - tile.ty) <= 1) {
      walls.add(e.position.ty * 100_000 + e.position.tx);
    }
  }
  return wallNeighbourMaskBy((tx, ty) => walls.has(ty * 100_000 + tx), tile);
}
