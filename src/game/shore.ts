import { NAVAL } from '../config/balance';
import type { TileCoord } from '../iso/coordinates';
import type { MapData } from '../map/MapData';
import { waterGrid } from '../map/navGrid';

/** Open water tiles a dock's footprint at `origin` lies alongside: the tiles next to its sides (not its corners). */
export function shoreWaterTiles(map: MapData, origin: TileCoord, width: number, height: number): TileCoord[] {
  const water = waterGrid(map);
  const out: TileCoord[] = [];
  const add = (tx: number, ty: number) => {
    if (water.isPassable(tx, ty)) out.push({ tx, ty });
  };
  for (let dx = 0; dx < width; dx++) {
    add(origin.tx + dx, origin.ty - 1);
    add(origin.tx + dx, origin.ty + height);
  }
  for (let dy = 0; dy < height; dy++) {
    add(origin.tx - 1, origin.ty + dy);
    add(origin.tx + width, origin.ty + dy);
  }
  return out;
}

/** Whether a dock may stand with its footprint at `origin`: at least NAVAL.dockMinShore open water tiles along its sides (M14). */
export function isShoreSite(map: MapData, origin: TileCoord, width: number, height: number): boolean {
  return shoreWaterTiles(map, origin, width, height).length >= NAVAL.dockMinShore;
}
