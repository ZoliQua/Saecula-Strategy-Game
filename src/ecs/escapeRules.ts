import type { TileCoord } from '../iso/coordinates';
import type { EscapeRules } from '../map/escape';
import type { MapData } from '../map/MapData';
import { isPassable } from '../map/TerrainTypes';
import { insideFootprint, type FootprintSize } from './footprint';
import type { EcsWorld } from './world';

/**
 * Escape rules for a unit at `start` (see `escapeSteps`): it may cross only
 * the footprint of the building it stands on, and a pocket step may cut a
 * corner only where no wall segment stands; when its whole ring is blocked,
 * the last resort crosses neighbouring buildings of `ownerId` or Gaia
 * (buildingTiles). Lazy: the
 * world is looked at only when an escape is actually searched (the unit is
 * on blocked ground or in a pocket), which is rare.
 */
export function escapeRulesAt(world: EcsWorld, start: TileCoord, map: MapData, ownerId: number): EscapeRules {
  let home: { origin: TileCoord; size: FootprintSize } | null | undefined;
  let walls: Set<string> | undefined;
  return {
    lastResort: buildingTiles(world, map, ownerId),
    crossable(tx, ty) {
      if (home === undefined) home = buildingAt(world, start);
      return home !== null && insideFootprint({ tx, ty }, home.origin, home.size);
    },
    cuttable(tx, ty) {
      walls ??= wallTiles(world);
      return !walls.has(`${tx},${ty}`);
    },
  };
}

/**
 * Rules for leaving a footprint just laid at `origin`: only its own tiles
 * may be crossed; when its whole ring is blocked, the last resort crosses
 * neighbouring buildings of the unit's owner `ownerId` or Gaia (buildingTiles).
 */
export function footprintEscape(origin: TileCoord, size: FootprintSize, world: EcsWorld, map: MapData, ownerId: number): EscapeRules {
  return { crossable: (tx, ty) => insideFootprint({ tx, ty }, origin, size), cuttable: () => false, lastResort: buildingTiles(world, map, ownerId) };
}

/**
 * The last-resort crossing (EscapeRules.lastResort): a tile under the
 * footprint of a building of `ownerId` or Gaia (0), never another player's
 * building (a unit must not be ordered through an enemy base), a wall
 * segment or impassable terrain. A unit enclosed by anything else stays put.
 * Built lazily, on the first ask.
 */
function buildingTiles(world: EcsWorld, map: MapData, ownerId: number): (tx: number, ty: number) => boolean {
  let tiles: Set<string> | undefined;
  return (tx, ty) => {
    if (!isPassable(map.getTile(tx, ty))) return false;
    if (!tiles) {
      tiles = new Set();
      for (const b of world.with('building', 'position')) {
        const owner = b.owner?.playerId ?? 0;
        if (b.building.type === 'wall' || (owner !== ownerId && owner !== 0)) continue;
        const { width, height } = b.building.footprint;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.add(`${b.position.tx + x},${b.position.ty + y}`);
      }
    }
    return tiles.has(`${tx},${ty}`);
  };
}

function buildingAt(world: EcsWorld, tile: TileCoord): { origin: TileCoord; size: FootprintSize } | null {
  for (const b of world.with('building', 'position')) {
    if (insideFootprint(tile, b.position, b.building.footprint)) return { origin: b.position, size: b.building.footprint };
  }
  return null;
}

function wallTiles(world: EcsWorld): Set<string> {
  const out = new Set<string>();
  for (const b of world.with('building', 'position')) if (b.building.type === 'wall') out.add(`${b.position.tx},${b.position.ty}`);
  return out;
}
