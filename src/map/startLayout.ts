import type { TileCoord } from '../iso/coordinates';

/**
 * Where a player's starting entities stand relative to their start tile
 * (GameBootstrap spawns them, map validation keeps them clear): a 3×3
 * town centre centred on the start, three villagers in a row below it.
 */
export const TOWN_CENTER_SIZE = 3;

/** Top-left tile of the starting town centre. */
export function townCenterOrigin(start: TileCoord): TileCoord {
  return { tx: start.tx - 1, ty: start.ty - 1 };
}

/** The tiles the starting villagers spawn on. */
export function villagerSpawnTiles(start: TileCoord): TileCoord[] {
  return [-1, 0, 1].map((dx) => ({ tx: start.tx + dx, ty: start.ty + 3 }));
}

