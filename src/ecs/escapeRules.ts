import type { TileCoord } from '../iso/coordinates';
import type { EscapeRules } from '../map/escape';
import { insideFootprint, type FootprintSize } from './footprint';
import type { EcsWorld } from './world';

/**
 * Escape rules for a unit at `start` (see `escapeSteps`): it may cross only
 * the footprint of the building it stands on, and a pocket step may cut a
 * corner only where no wall segment stands. Lazy: the world is looked at
 * only when an escape is actually searched (the unit is on blocked ground or
 * in a pocket), which is rare.
 */
export function escapeRulesAt(world: EcsWorld, start: TileCoord): EscapeRules {
  let home: { origin: TileCoord; size: FootprintSize } | null | undefined;
  let walls: Set<string> | undefined;
  return {
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

/** Rules for leaving a footprint just laid at `origin`: only its own tiles may be crossed. */
export function footprintEscape(origin: TileCoord, size: FootprintSize): EscapeRules {
  return { crossable: (tx, ty) => insideFootprint({ tx, ty }, origin, size), cuttable: () => false };
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
