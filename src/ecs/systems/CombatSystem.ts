import type { With } from 'miniplex';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { findPathToNearest } from '../../map/pathfinding';
import { BREACH_SEARCH_RADIUS, REPATH_RETRY_MS, TOWER_PROJECTILE, UNIT_PROJECTILE } from '../../config/balance';
import { findBreachTarget } from '../../game/breach';
import { computeDamage } from '../../game/damage';
import { applyDamage } from '../../game/kill';
import { boostArmor, boostAttack, bonusesFor } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import type { ProjectileKind } from '../../types';
import { fireProjectile } from '../archetypes/projectile';
import type { Entity } from '../components';
import { faceToward } from './facing';
import { towerLaunchHeight } from './combatFx/fxMath';
import type { EcsWorld } from '../world';

type Attacker = With<Entity, 'position' | 'attacker' | 'attackIntent' | 'owner'>;
type Target = With<Entity, 'position' | 'health' | 'owner'>;

const NO_ARMOR = { melee: 0, pierce: 0 } as const;

/**
 * Resolves attackIntent each tick:
 *   - Target missing / same owner / dying → drop intent.
 *   - Out of range → walk toward it (updates movable.path).
 *   - In range → if cooldown ready, deal damage (melee) or fire a
 *     projectile (ranged); if not, idle.
 *
 * When target HP hits 0 we attach a `dying` tag (DeathSystem handles
 * the rest) and strip components that would let the corpse act.
 *
 * Walls: a unit that cannot get within reach of its target (enclosed by
 * enemy walls / buildings) attacks the nearest hostile building in the
 * way and goes back to the real target once it has fallen.
 */
export class CombatSystem {
  private readonly world: EcsWorld;
  private readonly mapData: MapData;
  /** Clock and per-unit earliest next repath, so walled-off targets are not re-planned every tick. */
  private nowMs = 0;
  private readonly repathAt = new WeakMap<object, number>();

  constructor(
    world: EcsWorld,
    mapData: MapData,
    private readonly players: PlayerManager | null = null,
  ) {
    this.world = world;
    this.mapData = mapData;
  }

  update(deltaMs: number): void {
    this.nowMs += deltaMs;
    for (const a of this.world.with('position', 'attacker', 'owner')) {
      if (a.attacker.cooldownRemaining > 0) {
        a.attacker.cooldownRemaining = Math.max(
          0,
          a.attacker.cooldownRemaining - deltaMs,
        );
      }
    }

    const attackers = this.world.with(
      'position',
      'attacker',
      'attackIntent',
      'owner',
    );
    // Snapshot: a kill also strips the victim's attackIntent, which would shift the live query mid-loop.
    for (const a of [...attackers]) {
      if (a.attackIntent) this.tick(a, deltaMs);
    }
  }

  private tick(a: Attacker, _deltaMs: number): void {
    if ((a as Entity).dying) {
      this.world.removeComponent(a as Entity, 'attackIntent');
      return;
    }
    const target = this.findEntityById(a.attackIntent.targetId) as
      | Target
      | undefined;
    if (!target || !target.owner || !target.health || (target as Entity).dying) {
      this.endTarget(a);
      return;
    }
    if (target.owner.playerId === a.owner.playerId) {
      this.world.removeComponent(a as Entity, 'attackIntent');
      return;
    }
    const dist = targetDistance(a.position, target);
    if (dist > a.attacker.range) {
      this.walkIntoRange(a, target);
      return;
    }
    // In range — halt any residual motion and swing if ready.
    if (a.movable) {
      a.movable.path = [];
      a.movable.progress = 0;
    }
    faceToward(a as Entity, target as Entity);
    if (a.attacker.cooldownRemaining > 0) return;

    a.attacker.cooldownRemaining = a.attacker.cooldownMs;

    // Technology bonuses are applied when the hit / payload is built.
    const attack = boostAttack(a.attacker, bonusesFor(this.players, a));
    const kind = projectileKindFor(a);
    if (kind) {
      // Ranged: damage lands when the projectile arrives (ProjectileSystem).
      fireProjectile(this.world, {
        kind,
        from: { x: a.position.tx, y: a.position.ty },
        target: target as Entity,
        ownerId: a.owner.playerId,
        payload: attack,
        ...((a as Entity).building?.type === 'tower'
          ? { launchHeight: towerLaunchHeight(this.players?.get(a.owner.playerId)?.age ?? 1) }
          : {}),
      });
      return;
    }

    const killed = applyDamage(
      this.world,
      target,
      computeDamage(
        attack,
        boostArmor((target as Entity).armor ?? NO_ARMOR, bonusesFor(this.players, target as Entity)),
        (target as Entity).unit?.unitType,
      ),
    );
    if (killed) this.endTarget(a);
  }

  /** The current target is gone: resume the breached-for target, or stop attacking. */
  private endTarget(a: Attacker): void {
    const resume = a.attackIntent.resumeTargetId;
    if (resume === undefined) {
      this.world.removeComponent(a as Entity, 'attackIntent');
      return;
    }
    a.attackIntent.targetId = resume;
    delete a.attackIntent.resumeTargetId;
    this.repathAt.delete(a);
  }

  /**
   * Stuck short of `target`: switch to the hostile building blocking the
   * way. Returns false when nothing hostile is in the way, or while a
   * blocking building is still collapsing (the caller retries later).
   */
  private tryBreach(a: Attacker, target: Target): boolean {
    const decision = findBreachTarget(
      this.world.with('building', 'position', 'owner', 'health'),
      a.position,
      target,
      a.owner.playerId,
      Math.max(BREACH_SEARCH_RADIUS, Math.floor(a.attacker.range)),
    );
    if (decision?.kind !== 'attack' || decision.target.id === undefined) return false;
    a.attackIntent.resumeTargetId ??= a.attackIntent.targetId;
    a.attackIntent.targetId = decision.target.id;
    return true;
  }

  private walkIntoRange(a: Attacker, target: Target): void {
    if (!a.movable) return;
    // Already moving toward something? Keep going; we'll re-check next tick.
    if (a.movable.path.length > 0) return;
    if ((this.repathAt.get(a) ?? 0) > this.nowMs) return;
    // Every tile in reach blocked (e.g. ringed by walls): head for the target itself;
    // findPathToNearest stops at the closest reachable tile.
    const goal = findAdjacentToTarget(this.mapData, target, a.position, a.attacker.range) ?? target.position;
    const path = findPathToNearest(this.mapData, a.position, goal);
    if (!path || path.length < 2) {
      // Walled off and already as close as possible: breach, or retry later (not every tick).
      if (this.tryBreach(a, target)) return;
      this.repathAt.set(a, this.nowMs + REPATH_RETRY_MS);
      return;
    }
    a.movable.path = path.slice(1);
    a.movable.progress = 0;
  }

  private findEntityById(id: number): Entity | undefined {
    for (const entity of this.world.entities) {
      if (entity.id === id) return entity;
    }
    return undefined;
  }
}

/** Projectile kind for a ranged attacker (unit or tower); undefined = melee. */
function projectileKindFor(a: Attacker): ProjectileKind | undefined {
  const e = a as Entity;
  if (e.unit) return UNIT_PROJECTILE[e.unit.unitType];
  if (e.building?.type === 'tower') return TOWER_PROJECTILE;
  return undefined;
}

function targetDistance(v: TileCoord, target: Target): number {
  const b = (target as Entity).building;
  if (!b) {
    return Math.max(Math.abs(v.tx - target.position.tx), Math.abs(v.ty - target.position.ty));
  }
  const cx = target.position.tx + (b.footprint.width - 1) / 2;
  const cy = target.position.ty + (b.footprint.height - 1) / 2;
  return Math.max(Math.abs(v.tx - cx) - (b.footprint.width - 1) / 2, Math.abs(v.ty - cy) - (b.footprint.height - 1) / 2);
}

function findAdjacentToTarget(
  map: MapData,
  target: Target,
  from: TileCoord,
  range: number,
): TileCoord | null {
  const b = (target as Entity).building;
  const candidates: TileCoord[] = [];
  const span = Math.max(1, Math.floor(range));
  if (b) {
    // Generate a ring of tiles around the footprint at `span` distance.
    for (let dy = -span; dy <= b.footprint.height - 1 + span; dy++) {
      for (let dx = -span; dx <= b.footprint.width - 1 + span; dx++) {
        const inside =
          dx >= 0 && dx < b.footprint.width && dy >= 0 && dy < b.footprint.height;
        if (inside) continue;
        candidates.push({ tx: target.position.tx + dx, ty: target.position.ty + dy });
      }
    }
  } else {
    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
        if (dx === 0 && dy === 0) continue;
        candidates.push({ tx: target.position.tx + dx, ty: target.position.ty + dy });
      }
    }
  }
  const passable = candidates.filter((t) => map.isPassable(t.tx, t.ty));
  if (passable.length === 0) return null;
  passable.sort(
    (a, b2) =>
      Math.abs(a.tx - from.tx) + Math.abs(a.ty - from.ty) -
      (Math.abs(b2.tx - from.tx) + Math.abs(b2.ty - from.ty)),
  );
  return passable[0]!;
}
