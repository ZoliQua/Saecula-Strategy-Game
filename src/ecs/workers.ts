import type { Entity } from './components';
import { moveLayerOf } from './navLayer';

/** A fish school (M14): food for fishing boats, out of a land gatherer's reach. */
export function isFishNode(n: Entity): boolean {
  return n.resourceNode?.sea === true;
}

/** Whether `worker` may work `node`: a fishing boat fish schools only, a land gatherer anything but them (M14). */
export function canWorkNode(worker: Entity, node: Entity): boolean {
  return !!worker.gatherer && !!node.resourceNode && isFishNode(node) === (moveLayerOf(worker) === 'water');
}

/** Whether a unit builds (and helps build): villagers only; a fishing boat gathers but never builds (M14). */
export function isBuilder(e: Entity): boolean {
  return e.unit?.unitType === 'villager';
}
