import type { TileCoord } from '../../iso/coordinates';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

/**
 * Healing shared by the monk (M11) and the sauna landmark (M17): which own
 * units are wounded within reach, and whole-HP healing with the fraction
 * carried between ticks.
 */

/** A wounded, living unit of `ownerId` whose position passes `inRange` (and `accept`); `skip` excluded. */
function isWoundedOwn(u: Entity, ownerId: number, inRange: (at: TileCoord) => boolean, skip?: Entity): boolean {
  if (u === skip || u.dying || !u.owner || !u.health || !u.position || u.owner.playerId !== ownerId) return false;
  return u.health.max - u.health.current > 0 && inRange(u.position);
}

/**
 * The own unit missing the most HP within range (the first such in world
 * order on a tie), or null. The monk heals this one.
 */
export function mostWoundedOwnUnit(
  world: EcsWorld,
  ownerId: number,
  inRange: (at: TileCoord) => boolean,
  skip?: Entity,
): Entity | null {
  let best: Entity | null = null;
  let bestMissing = 0;
  for (const u of world.with('unit', 'health', 'owner', 'position')) {
    if (!isWoundedOwn(u, ownerId, inRange, skip)) continue;
    const missing = u.health.max - u.health.current;
    if (missing > bestMissing) {
      best = u;
      bestMissing = missing;
    }
  }
  return best;
}

/** Every own wounded unit within range that `accept` takes, in world order (the sauna heals them all). */
export function woundedOwnUnits(
  world: EcsWorld,
  ownerId: number,
  inRange: (at: TileCoord) => boolean,
  accept: (u: Entity) => boolean = () => true,
): Entity[] {
  const out: Entity[] = [];
  for (const u of world.with('unit', 'health', 'owner', 'position')) {
    if (isWoundedOwn(u, ownerId, inRange) && accept(u)) out.push(u);
  }
  return out;
}

/**
 * Advances a whole-unit clock (HP healed, mint gold): `carry` (the fraction so far) plus `perSec` over
 * `deltaMs`; returns the whole units to apply now and the fraction left.
 */
export function carryStep(carry: number, perSec: number, deltaMs: number): { whole: number; carry: number } {
  const total = carry + (perSec * deltaMs) / 1000;
  const whole = Math.floor(total);
  return whole > 0 ? { whole, carry: total - whole } : { whole: 0, carry: total };
}

/** Restores `amount` HP, never above the maximum. */
export function applyHeal(health: { current: number; max: number }, amount: number): void {
  health.current = Math.min(health.max, health.current + amount);
}
