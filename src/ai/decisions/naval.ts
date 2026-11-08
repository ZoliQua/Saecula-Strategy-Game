import { AI_NAVAL } from '../../config/aiBalance';
import { isShoreSite } from '../../game/shore';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { reachMask } from '../../map/gridSteps';
import type { NavGrid } from '../../map/navGrid';
import { isPassable } from '../../map/TerrainTypes';

/**
 * The nearest dock site (M14) to `anchor` within `maxRadius` (Chebyshev):
 * a 3×3 footprint of free grass, every tile `allowed` (explored), with open
 * water along a side; null when there is none.
 */
export function findDockSite(
  map: MapData,
  anchor: TileCoord,
  maxRadius: number,
  allowed: (tx: number, ty: number) => boolean,
): TileCoord | null {
  for (let r = 2; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const o = { tx: anchor.tx + dx, ty: anchor.ty + dy };
        let ok = true;
        for (let y = 0; y < 3 && ok; y++) {
          for (let x = 0; x < 3 && ok; x++) ok = map.isBuildable(o.tx + x, o.ty + y) && allowed(o.tx + x, o.ty + y);
        }
        if (ok && isShoreSite(map, o, 3, 3)) return o;
      }
    }
  }
  return null;
}

/**
 * Whether `to` (or a tile beside it, for a building) can be walked to over
 * the terrain (walls and buildings ignored: they can be breached) from `from` or a tile within AI_NAVAL.reachSlack of it (a
 * town centre's own tiles are blocked; its villagers stand round it).
 */
export function landReachable(map: MapData, from: TileCoord, to: TileCoord): boolean {
  return landReachableFromAny(map, [from], to);
}

/** landReachable for several starting points at the cost of one flood: true when any of them can walk to `to`. */
export function landReachableFromAny(map: MapData, froms: readonly TileCoord[], to: TileCoord): boolean {
  if (froms.length === 0) return false;
  const mask = landReachMask(map, to);
  for (const from of froms) {
    for (let dy = -AI_NAVAL.reachSlack; dy <= AI_NAVAL.reachSlack; dy++) {
      for (let dx = -AI_NAVAL.reachSlack; dx <= AI_NAVAL.reachSlack; dx++) {
        const tx = from.tx + dx;
        const ty = from.ty + dy;
        if (tx >= 0 && ty >= 0 && tx < map.width && ty < map.height && mask[ty * map.width + tx] === 1) return true;
      }
    }
  }
  return false;
}

/** The tiles `to` can be walked to from over the terrain (walls and buildings ignored, water not), as a map mask. */
export function landReachMask(map: MapData, to: TileCoord): Uint8Array {
  // Terrain only: walls and buildings can be breached, water cannot.
  const terrain: NavGrid = {
    width: map.width,
    height: map.height,
    isPassable: (tx, ty) => tx >= 0 && ty >= 0 && tx < map.width && ty < map.height && isPassable(map.getTile(tx, ty)),
  };
  return reachMask(terrain, to);
}
