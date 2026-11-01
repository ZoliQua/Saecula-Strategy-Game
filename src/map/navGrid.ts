import type { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';

/**
 * What the path searches need of a map (M14): its size and which tiles a
 * mover may enter. MapData itself is the land layer; `waterGrid` is the
 * water layer ships move on.
 */
export interface NavGrid {
  readonly width: number;
  readonly height: number;
  isPassable(tx: number, ty: number): boolean;
}

/** Which layer a mover uses: land units walk, ships sail. */
export type MoveLayer = 'land' | 'water';

const waterViews = new WeakMap<MapData, NavGrid>();

/**
 * The water layer of `map` (M14): open water a ship may enter, i.e. a
 * water tile that nothing blocks (a fish school blocks its tile). A live
 * view, one per map.
 */
export function waterGrid(map: MapData): NavGrid {
  const hit = waterViews.get(map);
  if (hit) return hit;
  const view: NavGrid = {
    width: map.width,
    height: map.height,
    isPassable: (tx, ty) =>
      tx >= 0 && ty >= 0 && tx < map.width && ty < map.height && !map.isBlocked(tx, ty) && map.getTile(tx, ty) === TERRAIN.water,
  };
  waterViews.set(map, view);
  return view;
}

/** The grid of `layer` on `map`. */
export function gridOf(map: MapData, layer: MoveLayer): NavGrid {
  return layer === 'water' ? waterGrid(map) : map;
}
