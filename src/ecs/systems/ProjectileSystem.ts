import { PROJECTILE_HIT_RADIUS } from '../../config/balance';
import { computeDamage } from '../../game/damage';
import { applyDamage } from '../../game/kill';
import { boostArmor, bonusesFor } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import { distanceToEntity } from '../../game/targetGeometry';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

type Victim = Entity & {
  position: { tx: number; ty: number };
  health: { current: number; max: number };
  owner: { playerId: number };
};
type Shot = NonNullable<Entity['projectile']>;

const NO_ARMOR = { melee: 0, pierce: 0 } as const;

/**
 * Advances projectiles along their flight and resolves the payload on
 * arrival. Single-target shots hit only if the target is still alive,
 * hostile and within PROJECTILE_HIT_RADIUS of the impact point (moving
 * targets can be missed). Splash shots hit every hostile unit and
 * building within their radius. The projectile entity is removed on
 * impact either way.
 */
export class ProjectileSystem {
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager | null = null,
  ) {}

  update(deltaMs: number): void {
    const landed: Entity[] = [];
    for (const e of this.world.with('projectile')) {
      e.projectile.elapsedMs += deltaMs;
      if (e.projectile.elapsedMs >= e.projectile.durationMs) landed.push(e);
    }
    for (const e of landed) {
      this.resolve(e.projectile!);
      this.world.remove(e);
    }
  }

  private resolve(shot: Shot): void {
    const victims: Victim[] = [];
    if (shot.aoeRadius > 0) {
      for (const v of this.world.with('position', 'health', 'owner')) {
        if (this.isHostile(v, shot) && distanceToEntity(shot.to, v) <= shot.aoeRadius) {
          victims.push(v);
        }
      }
    } else {
      const v = this.findVictim(shot.targetId);
      if (v && this.isHostile(v, shot) && distanceToEntity(shot.to, v) <= PROJECTILE_HIT_RADIUS) {
        victims.push(v);
      }
    }
    for (const v of victims) {
      applyDamage(
        this.world,
        v,
        computeDamage(shot.payload, boostArmor(v.armor ?? NO_ARMOR, bonusesFor(this.players, v)), v.unit?.unitType),
        shot.ownerId,
      );
    }
  }

  private isHostile(v: Victim, shot: Shot): boolean {
    return !v.dying && v.owner.playerId !== shot.ownerId && v.owner.playerId !== 0;
  }

  private findVictim(id: number): Victim | undefined {
    for (const v of this.world.with('position', 'health', 'owner')) {
      if (v.id === id) return v;
    }
    return undefined;
  }
}

