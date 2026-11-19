import type { Entity } from '../ecs/components';
import { clearUnitOrders } from '../ecs/orders';
import type { EcsWorld } from '../ecs/world';
import type { CivId } from '../types';
import { isNavalType } from '../config/balance';
import { gameEvents } from './events';
import { areEnemies, NO_TEAMS, type TeamLookup } from './diplomacy';

/** A monk that may start a conversion now (not recharging): the order and the cursor share this rule. */
export function readyToConvert(monk: Entity): boolean {
  return !!monk.converter && monk.converter.rechargeMs <= 0;
}

/**
 * The target each monk last gave up converting (MonkSystem: out of reach).
 * Transient, not saved (keyed by the entity, so it goes with it): the AI
 * takes it to avoid that target for a while.
 */
const givenUp = new WeakMap<Entity, number>();

/** MonkSystem gave up converting `targetId` with `monk`. */
export function markConvertGivenUp(monk: Entity, targetId: number): void {
  givenUp.set(monk, targetId);
}

/** The target `monk` last gave up on, once (the mark is taken), or undefined. */
export function takeConvertGivenUp(monk: Entity): number | undefined {
  const id = givenUp.get(monk);
  givenUp.delete(monk);
  return id;
}

/**
 * Whether a monk of `playerId` may convert `target` (M11): a living enemy unit (M16: another
 * team's, never an ally's or Gaia's) that is not a monk or a ship (M14).
 */
export function canConvert(target: Entity | undefined, playerId: number, teams: TeamLookup = NO_TEAMS): target is Entity & Required<Pick<Entity, 'unit' | 'owner' | 'position'>> {
  return (
    !!target &&
    !!target.unit &&
    !!target.owner &&
    !!target.position &&
    !target.dying &&
    !target.building &&
    target.unit.unitType !== 'monk' &&
    // Ships (M14) cannot be converted.
    !isNavalType(target.unit.unitType) &&
    areEnemies(teams, target.owner.playerId, playerId)
  );
}

/**
 * Hands `target` to `toPlayerId` (a monk's conversion, M11): its orders
 * are dropped, it is deselected, it keeps its original civ's look
 * (`originCiv`) and `unitConverted` is emitted (scores, toasts).
 */
export function convertUnit(world: EcsWorld, target: Entity, toPlayerId: number, civOf: (playerId: number) => CivId): void {
  if (!target.owner || !target.unit) return;
  const fromPlayerId = target.owner.playerId;
  clearUnitOrders(world, target);
  if (target.movable) {
    target.movable.path = [];
    target.movable.progress = 0;
  }
  if (!target.originCiv) world.addComponent(target, 'originCiv', { civ: civOf(fromPlayerId) });
  target.owner.playerId = toPlayerId;
  if (target.selectable) target.selectable.selected = false;
  gameEvents.emit('unitConverted', { world, entityId: target.id ?? -1, fromPlayerId, toPlayerId, unitType: target.unit.unitType });
}
