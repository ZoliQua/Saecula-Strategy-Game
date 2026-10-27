import { GATHER_RETARGET_RADIUS } from '../../../config/balance';
import type { ResourceType } from '../../../types';
import type { Entity } from '../../components';
import type { EcsWorld } from '../../world';
import { footprintDistance, manhattan } from './gatherGeometry';
import type { Dropoff, ResourceNode, Villager } from './gatherTypes';

/* World look-ups of the gather cycle: drop-offs, the next node, free farms. */

export function findEntityById(world: EcsWorld, id: number): Entity | undefined {
  for (const entity of world.entities) {
    if (entity.id === id) return entity;
  }
  return undefined;
}

/** The owner's nearest standing drop-off that accepts `type`. */
export function findNearestDropoff(world: EcsWorld, v: Villager, type: ResourceType): Dropoff | undefined {
  let best: Dropoff | undefined;
  let bestDist = Infinity;
  for (const d of world.with('position', 'resourceDropoff', 'building')) {
    if (!d.resourceDropoff.accepts.includes(type)) continue;
    if (d.owner?.playerId !== v.owner.playerId || (d as Entity).dying) continue;
    const dist = footprintDistance(v.position, d);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

/**
 * Nearest node of `type` within GATHER_RETARGET_RADIUS of `v`; a farm
 * only if it is its owner's and nobody else works it.
 */
export function findNearestNodeOfType(world: EcsWorld, v: Villager, type: ResourceType): ResourceNode | undefined {
  let best: ResourceNode | undefined;
  let bestDist = Infinity;
  for (const n of world.with('position', 'resourceNode')) {
    if (n.resourceNode.type !== type) continue;
    if (n.resourceNode.amount <= 0) continue;
    if (Math.max(Math.abs(n.position.tx - v.position.tx), Math.abs(n.position.ty - v.position.ty)) > GATHER_RETARGET_RADIUS) continue;
    const dist = manhattan(v.position, n.position);
    if (dist >= bestDist) continue;
    if ((n as Entity).building && !isFreeFarmFor(world, n as Entity, v)) continue;
    bestDist = dist;
    best = n;
  }
  return best;
}

function isFreeFarmFor(world: EcsWorld, farm: Entity, v: Villager): boolean {
  if (farm.owner?.playerId !== v.owner.playerId || farm.dying) return false;
  for (const o of world.with('gatherer')) {
    if (o !== v && o.gatherer.targetNodeId === farm.id) return false;
  }
  return true;
}
