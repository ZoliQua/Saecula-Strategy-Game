import { BUILDING_BALANCE, REPAIR } from '../config/balance';
import type { Entity } from '../ecs/components';
import { insideFootprint } from '../ecs/footprint';
import { clearUnitOrders } from '../ecs/orders';
import { isBuilder } from '../ecs/workers';
import type { EcsWorld } from '../ecs/world';
import type { TileCoord } from '../iso/coordinates';
import type { Resources } from '../types';
import { isFriendly, NO_TEAMS, type TeamLookup } from './diplomacy';
import { buildSpeedMultiplier } from './modifiers';
import type { Player } from './Player';

/** A building a repair can work on: the fields the rules read. */
export type RepairTarget = Entity & Required<Pick<Entity, 'building' | 'health' | 'owner' | 'position'>>;

/**
 * Whether a villager of `playerId` may repair `target` (M18): a finished,
 * living, damaged building of `playerId` or an ally (never Gaia's, an
 * enemy's or a foundation: that is building, not repair). Units (ships
 * included) are never repaired.
 */
export function isRepairableBy(target: Entity | undefined, playerId: number, teams: TeamLookup = NO_TEAMS): target is RepairTarget {
  return (
    !!target &&
    !!target.building &&
    !!target.health &&
    !!target.position &&
    !target.dying &&
    !target.underConstruction &&
    target.owner !== undefined &&
    target.owner.playerId !== 0 &&
    isFriendly(teams, target.owner.playerId, playerId) &&
    target.health.current > 0 &&
    target.health.current < target.health.max
  );
}

/**
 * Whether a right-click by `playerId`'s villager on `target` means repair:
 * isRepairableBy, except a farm (a right-click on a farm keeps meaning
 * "farm it", damaged or not).
 */
export function isOrderRepairable(target: Entity | undefined, playerId: number, teams: TeamLookup = NO_TEAMS): target is RepairTarget {
  return target?.building?.type !== 'farm' && isRepairableBy(target, playerId, teams);
}

/** Whether `villager` may be sent to repair `target` now (a living villager, a repairable building still in the world). */
export function canRepair(world: EcsWorld, villager: Entity, target: Entity, teams: TeamLookup = NO_TEAMS): boolean {
  const playerId = villager.owner?.playerId;
  if (playerId === undefined || villager.dying || !isBuilder(villager) || !world.has(target)) return false;
  return isRepairableBy(target, playerId, teams);
}

/** Sends `villager` to repair `target` (the caller checked canRepair): its other orders are dropped. */
export function startRepair(world: EcsWorld, villager: Entity, target: Entity): void {
  if (target.id === undefined) return;
  clearUnitOrders(world, villager);
  world.addComponent(villager, 'repairIntent', { targetId: target.id, costCarry: { food: 0, wood: 0, gold: 0 }, hpCarry: 0 });
}

/** The building on `tile` that `actor`'s side may repair by a right-click (own or allied, finished, damaged, not a farm), or null. */
export function findRepairTargetAt(world: EcsWorld, tile: TileCoord, actor: Entity, teams: TeamLookup = NO_TEAMS): Entity | null {
  const playerId = actor.owner?.playerId;
  if (playerId === undefined) return null;
  for (const b of world.with('position', 'owner', 'building', 'health')) {
    if (insideFootprint(tile, b.position, b.building.footprint) && isOrderRepairable(b, playerId, teams)) return b;
  }
  return null;
}

/** Whether `target` took damage less than REPAIR.underFireDelayMs ago at game time `nowMs` (it gains no repair HP yet). */
export function isUnderFire(target: RepairTarget, nowMs: number): boolean {
  const at = target.building.damagedAtMs;
  return at !== undefined && nowMs - at < REPAIR.underFireDelayMs;
}

/** HP one villager of `owner` restores on `target` per second: maxHp / buildTime × REPAIR.speed × build-speed bonuses. */
export function repairHpPerSec(target: RepairTarget, owner: Player | undefined): number {
  const base = (target.health.max / BUILDING_BALANCE[target.building.type].buildTime) * REPAIR.speed;
  return owner ? base * buildSpeedMultiplier(owner) : base;
}

/** What one HP of repair costs on `target`, per resource: the base cost × REPAIR.costFraction / maxHp. */
export function repairCostPerHp(target: RepairTarget): Resources {
  const cost = BUILDING_BALANCE[target.building.type].cost;
  const k = REPAIR.costFraction / target.health.max;
  return { food: cost.food * k, wood: cost.wood * k, gold: cost.gold * k };
}
