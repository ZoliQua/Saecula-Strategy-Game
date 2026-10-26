import type { Entity } from '../components';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { EcsWorld } from '../world';

const RETARGET_INTERVAL_MS = 250;

/**
 * Gives every finished tower an `attackIntent` on the nearest enemy unit in
 * range; CombatSystem then fires the arrow when the cooldown allows.
 *
 * Visibility: a tower only shoots units its owner can currently see in that
 * player's own fog of war (the human's and every AI's). A player without fog
 * data (headless tests) falls back to a plain range check.
 */
export class TowerCombatSystem {
  private elapsedMs = RETARGET_INTERVAL_MS;

  constructor(
    private readonly world: EcsWorld,
    /** Fog of war of a player, or null when that player has none. */
    private readonly fogFor: (playerId: number) => FogOfWarData | null = () => null,
  ) {}

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < RETARGET_INTERVAL_MS) return;
    this.elapsedMs = 0;

    for (const tower of this.world.with('position', 'building', 'attacker', 'owner')) {
      if (tower.building.type !== 'tower') continue;
      const t = tower as Entity;
      if (t.underConstruction || t.dying) continue;
      this.retarget(tower as TowerEntity);
    }
  }

  private retarget(tower: TowerEntity): void {
    const range = tower.attacker.range;
    const current = tower.attackIntent ? this.findById(tower.attackIntent.targetId) : undefined;
    if (current && this.isValidTarget(tower, current, range)) return;
    if (tower.attackIntent) this.world.removeComponent(tower as Entity, 'attackIntent');

    let best: Entity | null = null;
    let bestD = Infinity;
    for (const u of this.world.with('position', 'unit', 'owner', 'health')) {
      if (!this.isValidTarget(tower, u, range)) continue;
      const d = (u.position.tx - tower.position.tx) ** 2 + (u.position.ty - tower.position.ty) ** 2;
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    if (best?.id !== undefined) {
      this.world.addComponent(tower as Entity, 'attackIntent', { targetId: best.id });
    }
  }

  private isValidTarget(tower: TowerEntity, target: Entity, range: number): boolean {
    if (!target.position || !target.owner || !target.health || !target.unit) return false;
    if (target.dying || target.health.current <= 0) return false;
    // Gaia (0) is neutral wildlife/resources, never a tower target.
    if (target.owner.playerId === tower.owner.playerId || target.owner.playerId === 0) return false;
    // Same Chebyshev metric as CombatSystem, so an accepted target always fires.
    const dist = Math.max(
      Math.abs(target.position.tx - tower.position.tx),
      Math.abs(target.position.ty - tower.position.ty),
    );
    if (dist > range) return false;
    return this.isVisibleTo(tower.owner.playerId, target.position.tx, target.position.ty);
  }

  private isVisibleTo(playerId: number, tx: number, ty: number): boolean {
    const fog = this.fogFor(playerId);
    return fog ? fog.isVisible(tx, ty) : true;
  }

  private findById(id: number): Entity | undefined {
    for (const e of this.world.entities) if (e.id === id) return e;
    return undefined;
  }
}

type TowerEntity = Required<Pick<Entity, 'position' | 'attacker' | 'owner' | 'building'>> & Entity;
