import { BUILDING_DEATH_TTL_MS } from '../config/balance';
import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';
import { gameEvents } from './events';

/** Time a dying unit stays in the world (matches unitAnim DYING_MS); buildings use BUILDING_DEATH_TTL_MS. */
export const DEATH_TTL_MS = 900;

/**
 * Subtracts damage; if HP reaches 0 the target is tagged `dying` and
 * stripped of every component that would let the corpse keep acting.
 * Returns true when this call killed it. A kill is announced as
 * `entityKilled` with `killerId` (the attacker's owner) for the match
 * statistics.
 */
export function applyDamage(
  world: EcsWorld,
  target: Entity & { health: { current: number; max: number } },
  amount: number,
  killerId: number | null = null,
): boolean {
  if (target.dying) return false;
  target.health.current -= amount;
  if (target.health.current > 0) return false;
  killEntity(world, target);
  gameEvents.emit('entityKilled', {
    world,
    killerId,
    victimOwnerId: target.owner?.playerId ?? 0,
    ...(target.unit ? { unitType: target.unit.unitType } : {}),
    ...(target.building ? { buildingType: target.building.type } : {}),
  });
  return true;
}

export function killEntity(
  world: EcsWorld,
  target: Entity & { health: { current: number; max: number } },
): void {
  target.health.current = 0;
  world.addComponent(target, 'dying', { ttlMs: target.building ? BUILDING_DEATH_TTL_MS : DEATH_TTL_MS });
  if (target.attackIntent) world.removeComponent(target, 'attackIntent');
  if (target.gatherIntent) world.removeComponent(target, 'gatherIntent');
  if (target.moveIntent) world.removeComponent(target, 'moveIntent');
  if (target.buildCommand) world.removeComponent(target, 'buildCommand');
  if (target.movable) {
    target.movable.path = [];
    target.movable.progress = 0;
  }
}
