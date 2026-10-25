import type { With } from 'miniplex';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { findPath } from '../../map/pathfinding';
import { computeDamage } from '../../game/damage';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

type Attacker = With<Entity, 'position' | 'attacker' | 'attackIntent' | 'owner'>;
type Target = With<Entity, 'position' | 'health' | 'owner'>;

const DEATH_TTL_MS = 900;
const NO_ARMOR = { melee: 0, pierce: 0 } as const;

/**
 * Resolves attackIntent each tick:
 *   - Target missing / same owner / dying → drop intent.
 *   - Out of range → walk toward it (updates movable.path).
 *   - In range → if cooldown ready, deal damage; if not, idle.
 *
 * When target HP hits 0 we attach a `dying` tag (DeathSystem handles
 * the rest) and strip components that would let the corpse act.
 */
export class CombatSystem {
  private readonly world: EcsWorld;
  private readonly mapData: MapData;

  constructor(world: EcsWorld, mapData: MapData) {
    this.world = world;
    this.mapData = mapData;
  }

  update(deltaMs: number): void {
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
    for (const a of attackers) {
      this.tick(a, deltaMs);
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
      this.world.removeComponent(a as Entity, 'attackIntent');
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
    if (a.attacker.cooldownRemaining > 0) return;

    target.health.current -= computeDamage(
      a.attacker,
      (target as Entity).armor ?? NO_ARMOR,
      (target as Entity).unit?.unitType,
    );
    a.attacker.cooldownRemaining = a.attacker.cooldownMs;

    if (target.health.current <= 0) {
      this.killTarget(target);
      this.world.removeComponent(a as Entity, 'attackIntent');
    }
  }

  private walkIntoRange(a: Attacker, target: Target): void {
    if (!a.movable) return;
    // Already moving toward something? Keep going; we'll re-check next tick.
    if (a.movable.path.length > 0) return;
    const goal = findAdjacentToTarget(this.mapData, target, a.position, a.attacker.range);
    if (!goal) return;
    const path = findPath(this.mapData, a.position, goal);
    if (!path || path.length < 2) return;
    a.movable.path = path.slice(1);
    a.movable.progress = 0;
  }

  private killTarget(target: Target): void {
    target.health.current = 0;
    this.world.addComponent(target as Entity, 'dying', { ttlMs: DEATH_TTL_MS });
    const e = target as Entity;
    // Remove components that could cause the corpse to keep acting.
    if (e.attackIntent) this.world.removeComponent(e, 'attackIntent');
    if (e.gatherIntent) this.world.removeComponent(e, 'gatherIntent');
    if (e.moveIntent) this.world.removeComponent(e, 'moveIntent');
    if (e.buildCommand) this.world.removeComponent(e, 'buildCommand');
    if (e.movable) {
      e.movable.path = [];
      e.movable.progress = 0;
    }
  }

  private findEntityById(id: number): Entity | undefined {
    for (const entity of this.world.entities) {
      if (entity.id === id) return entity;
    }
    return undefined;
  }
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
