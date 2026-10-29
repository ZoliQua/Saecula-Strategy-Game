import type { TileCoord } from '../../iso/coordinates';
import { MapData } from '../../map/MapData';
import { TERRAIN, type TerrainId } from '../../map/TerrainTypes';
import { createResourceNode, TERRAIN_RESOURCE } from '../archetypes/resource';
import { ConstructionSystem } from '../systems/ConstructionSystem';
import { GatheringSystem } from '../systems/GatheringSystem';
import { MovementSystem } from '../systems/MovementSystem';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { createEcsWorld, type EcsWorld } from '../world';

/** A tiny headless world (grass map, the movement-related systems in SystemRunner order) for unit tests. */
export interface MiniSim {
  readonly world: EcsWorld;
  readonly map: MapData;
  /** Puts a resource terrain tile and its node at `tile`. */
  resource(tile: TileCoord, terrain: TerrainId): void;
  /** Advances the systems `ms` in `stepMs` ticks, calling `onStep` after each. */
  run(ms: number, stepMs?: number, onStep?: () => void): void;
}

export function createMiniSim(size = 32): MiniSim {
  const world = createEcsWorld();
  const map = new MapData(size, size, TERRAIN.grass);
  const pathfinding = new PathfindingSystem(world, map);
  const gathering = new GatheringSystem(world, map);
  const construction = new ConstructionSystem(world, map);
  const movement = new MovementSystem(world, null, map);
  return {
    world,
    map,
    resource(tile, terrain) {
      map.setTile(tile.tx, tile.ty, terrain);
      const type = TERRAIN_RESOURCE[terrain];
      if (type) createResourceNode(world, { tile, type });
    },
    run(ms, stepMs = 50, onStep) {
      for (let t = 0; t < ms; t += stepMs) {
        pathfinding.update();
        gathering.update(stepMs);
        construction.update(stepMs);
        movement.update(stepMs);
        onStep?.();
      }
    },
  };
}
