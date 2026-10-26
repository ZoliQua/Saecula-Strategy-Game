import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { createBuilding } from './building';

export interface CreateWallOptions {
  readonly tile: TileCoord;
  readonly playerId: number;
  readonly mapData: MapData;
  /** True for a construction site (a villager builds it); false for a finished wall (map presets). */
  readonly underConstruction?: boolean;
}

/**
 * One 1x1 wall segment. It blocks its tile in the MapData immediately (even
 * as a site), has no attack, and is its own construction site when
 * `underConstruction` is set.
 */
export function createWall(world: EcsWorld, options: CreateWallOptions): Entity {
  return createBuilding(world, {
    type: 'wall',
    origin: options.tile,
    playerId: options.playerId,
    mapData: options.mapData,
    underConstruction: options.underConstruction ?? false,
  });
}
