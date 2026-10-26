import type { TileCoord } from '../../iso/coordinates';
import { FOG_UNEXPLORED, type FogOfWarData } from '../../map/FogOfWarData';
import type { MapData } from '../../map/MapData';

const SAMPLES = 48;

/**
 * Next exploration waypoint: of `SAMPLES` random passable tiles, the
 * unexplored one nearest to `from` (so the scout sweeps outward instead
 * of zig-zagging); once nearly everything is explored, any tile not in
 * sight right now (to refresh stale knowledge). Null if no sample fits.
 */
export function nextExploreTarget(
  fog: FogOfWarData,
  map: MapData,
  from: TileCoord,
  rng: () => number,
): TileCoord | null {
  let best: TileCoord | null = null;
  let bestD = Infinity;
  let fallback: TileCoord | null = null;
  for (let i = 0; i < SAMPLES; i++) {
    const tx = Math.floor(rng() * map.width);
    const ty = Math.floor(rng() * map.height);
    if (!map.isPassable(tx, ty)) continue;
    if (fog.get(tx, ty) !== FOG_UNEXPLORED) {
      if (!fallback && !fog.isVisible(tx, ty)) fallback = { tx, ty };
      continue;
    }
    const d = Math.max(Math.abs(tx - from.tx), Math.abs(ty - from.ty));
    if (d < bestD) {
      bestD = d;
      best = { tx, ty };
    }
  }
  return best ?? fallback;
}
