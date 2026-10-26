import type { Entity } from './components';
import type { EcsWorld } from './world';

/**
 * Drops whatever a unit was doing (gather target, gather / attack / move
 * intents, build command) so a new order is obeyed. Used by the human's
 * right-click orders and by the AI alike.
 */
export function clearUnitOrders(world: EcsWorld, entity: Entity): void {
  if (entity.gatherer) {
    entity.gatherer.targetNodeId = undefined;
    entity.gatherer.dropoffId = undefined;
  }
  if (entity.gatherIntent) world.removeComponent(entity, 'gatherIntent');
  if (entity.attackIntent) world.removeComponent(entity, 'attackIntent');
  if (entity.buildCommand) world.removeComponent(entity, 'buildCommand');
  if (entity.moveIntent) world.removeComponent(entity, 'moveIntent');
}
