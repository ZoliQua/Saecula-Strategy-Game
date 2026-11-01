import { RESOURCE_NODE_AMOUNT } from '../../config/balance';
import type { TileCoord } from '../../iso/coordinates';
import { TERRAIN, type TerrainId } from '../../map/TerrainTypes';
import type { ResourceType } from '../../types';
import type { Entity } from '../components';
import { assignEntityId, type EcsWorld } from '../world';

export const RESOURCE_TERRAIN: Record<ResourceType, TerrainId> = {
  wood: TERRAIN.forest,
  gold: TERRAIN.gold_mine,
  food: TERRAIN.berries,
};

export const TERRAIN_RESOURCE: Partial<Record<TerrainId, ResourceType>> = {
  [TERRAIN.forest]: 'wood',
  [TERRAIN.gold_mine]: 'gold',
  [TERRAIN.berries]: 'food',
  [TERRAIN.fish]: 'food',
};

export interface CreateResourceNodeOptions {
  readonly tile: TileCoord;
  readonly type: ResourceType;
  readonly amount?: number;
  /** A fish school (M14): worked by fishing boats only. */
  readonly sea?: boolean;
}

/**
 * Resource nodes are not renderable — the terrain tile draws them.
 * They exist only so GatheringSystem can decrement `amount` until the
 * node is depleted (when it swaps the terrain back to grass).
 */
export function createResourceNode(
  world: EcsWorld,
  options: CreateResourceNodeOptions,
): Entity {
  const max = options.amount ?? RESOURCE_NODE_AMOUNT[options.type];
  const entity: Entity = assignEntityId({
    position: { tx: options.tile.tx, ty: options.tile.ty },
    resourceNode: {
      type: options.type,
      amount: max,
      maxAmount: max,
      ...(options.sea ? { sea: true } : {}),
    },
    selectable: { selected: false },
  });
  world.add(entity);
  return entity;
}
