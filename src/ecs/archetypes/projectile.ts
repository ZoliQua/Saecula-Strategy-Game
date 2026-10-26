import {
  CANNON_AOE_RADIUS,
  PROJECTILE_BALANCE,
  PROJECTILE_MIN_FLIGHT_MS,
} from '../../config/balance';
import { leadTargetPoint } from '../../game/leadTarget';
import type { Point } from '../../game/targetGeometry';
import type { ProjectileKind } from '../../types';
import type { Entity } from '../components';
import { flightDurationMs } from '../systems/projectileMotion';
import { assignEntityId, type EcsWorld } from '../world';

export interface FireProjectileOptions {
  readonly kind: ProjectileKind;
  readonly from: Point;
  /** Aimed where the target will be on arrival (leadTargetPoint). */
  readonly target: Entity;
  readonly ownerId: number;
  readonly payload: { meleeAtk: number; pierceAtk: number; bonusVsCavalry: number };
  /** Cosmetic release height in screen px (towers shoot from their top). */
  readonly launchHeight?: number;
}

/**
 * Spawns a projectile entity. Flight time follows from distance and the
 * kind's speed; cannonballs carry a splash radius. Shared by units
 * (CombatSystem) and, later, towers.
 */
export function fireProjectile(world: EcsWorld, o: FireProjectileOptions): Entity {
  const t = o.target;
  if (!t.position) throw new Error('fireProjectile: target has no position');
  const b = PROJECTILE_BALANCE[o.kind];
  const to = leadTargetPoint(o.from, { ...t, position: t.position }, b.speed, PROJECTILE_MIN_FLIGHT_MS);
  const distance = Math.hypot(to.x - o.from.x, to.y - o.from.y);
  const entity: Entity = assignEntityId({
    projectile: {
      kind: o.kind,
      from: { x: o.from.x, y: o.from.y },
      to,
      elapsedMs: 0,
      durationMs: flightDurationMs(distance, b.speed, PROJECTILE_MIN_FLIGHT_MS),
      arcHeight: b.arcHeight,
      ownerId: o.ownerId,
      payload: { ...o.payload },
      targetId: t.id ?? -1,
      aoeRadius: o.kind === 'cannonball' ? CANNON_AOE_RADIUS : 0,
      ...(o.launchHeight !== undefined ? { launchHeight: o.launchHeight } : {}),
    },
  });
  world.add(entity);
  return entity;
}
