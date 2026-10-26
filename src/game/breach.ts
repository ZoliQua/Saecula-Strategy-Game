import type { Entity } from '../ecs/components';
import type { TileCoord } from '../iso/coordinates';

/** Chebyshev distance from a tile to the nearest tile of an entity (footprint-aware). */
export function tileDistanceToEntity(from: TileCoord, e: Entity & { position: TileCoord }): number {
  const w = e.building?.footprint.width ?? 1;
  const h = e.building?.footprint.height ?? 1;
  const dx = Math.max(e.position.tx - from.tx, 0, from.tx - (e.position.tx + w - 1));
  const dy = Math.max(e.position.ty - from.ty, 0, from.ty - (e.position.ty + h - 1));
  return Math.max(dx, dy);
}

export type BreachDecision =
  | { readonly kind: 'attack'; readonly target: Entity }
  /** A hostile building next to the unit is collapsing: the gap opens once it is gone. */
  | { readonly kind: 'wait' };

/**
 * When a unit cannot get within reach of its target (walled off), the
 * hostile building to knock down instead: a standing building (walls
 * included) of another player — never its own, never Gaia — within
 * `searchRadius` tiles of where the unit is stuck, preferring the one
 * closest to the real target (itself excluded). If such a building is
 * already collapsing, the unit should wait for the opening instead. Null
 * when nothing hostile is in the way.
 */
export function findBreachTarget(
  buildings: Iterable<Entity>,
  stuckAt: TileCoord,
  target: Entity & { position: TileCoord },
  attackerOwner: number,
  searchRadius: number,
): BreachDecision | null {
  let best: Entity | null = null;
  let bestScore = Infinity;
  for (const b of buildings) {
    if (b === target || !b.building || !b.position || !b.owner || !b.health) continue;
    if (b.owner.playerId === attackerOwner || b.owner.playerId === 0) continue;
    const near = tileDistanceToEntity(stuckAt, b as Entity & { position: TileCoord });
    if (near > searchRadius) continue;
    if (b.dying) return { kind: 'wait' };
    const toGoal = tileDistanceToEntity(target.position, b as Entity & { position: TileCoord });
    const score = toGoal * 4 + near;
    if (score < bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best ? { kind: 'attack', target: best } : null;
}
