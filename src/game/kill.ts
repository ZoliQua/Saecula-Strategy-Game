import type { Entity } from '../ecs/components';
import type { EcsWorld } from '../ecs/world';

/** Time a dying entity stays in the world (matches unitAnim DYING_MS). */
export const DEATH_TTL_MS = 900;

/**
 * Subtracts damage; if HP reaches 0 the target is tagged `dying` and
 * stripped of every component that would let the corpse keep acting.
 * Returns true when this call killed it.
 */
export function applyDamage(
  world: EcsWorld,
  target: Entity & { health: { current: number; max: number } },
  amount: number,
): boolean {
  if (target.dying) return false;
  target.health.current -= amount;
  if (target.health.current > 0) return false;
  killEntity(world, target);
  return true;
}

export function killEntity(
  world: EcsWorld,
  target: Entity & { health: { current: number; max: number } },
): void {
  target.health.current = 0;
  world.addComponent(target, 'dying', { ttlMs: DEATH_TTL_MS });
  if (target.attackIntent) world.removeComponent(target, 'attackIntent');
  if (target.gatherIntent) world.removeComponent(target, 'gatherIntent');
  if (target.moveIntent) world.removeComponent(target, 'moveIntent');
  if (target.buildCommand) world.removeComponent(target, 'buildCommand');
  if (target.movable) {
    target.movable.path = [];
    target.movable.progress = 0;
  }
}
