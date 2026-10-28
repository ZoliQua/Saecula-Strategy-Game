import { AI_COMMON, type FlankTuning } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import { clearUnitOrders } from '../ecs/orders';
import type { AIContext } from './AIPlayer';
import { pickEngageTarget } from './decisions/combat';
import type { KnownBuilding, WorldView } from './perception';
import { copyKnown, type FlankState } from './strategyState';
import type { ThoughtLog } from './thoughts';

const isBusy = (u: Entity) => u.attackIntent !== undefined || u.moveIntent !== undefined || (u.movable?.path.length ?? 0) > 0;

/**
 * A flank (Mesteri AI): part of a big main wave, detached from it, goes
 * for an enemy economy building far from the main target. It fights the
 * enemies it meets on the way, attacks its target once in sight, and
 * once the target is gone (destroyed, or found missing) its members are
 * released, idle, to the other controllers. One flank at a time.
 */
export class FlankControl {
  private readonly flank = new Set<number>();
  /** March orders given to a member found idle again (a failed path leaves it idle). */
  private readonly reorders = new Map<number, number>();
  private goal: KnownBuilding | null = null;
  private launched = 0;

  constructor(
    private readonly log: ThoughtLog,
    readonly tune: FlankTuning,
  ) {}

  snapshot(): FlankState {
    return {
      members: [...this.flank],
      reorders: [...this.reorders],
      target: this.goal && copyKnown(this.goal),
      count: this.launched,
    };
  }

  restore(state: FlankState): void {
    this.flank.clear();
    for (const id of state.members) this.flank.add(id);
    this.reorders.clear();
    for (const [id, n] of state.reorders) this.reorders.set(id, n);
    this.goal = state.target && copyKnown(state.target);
    this.launched = state.count;
  }

  /** True while a flank is out. */
  get active(): boolean {
    return this.flank.size > 0;
  }

  /** Flanks sent so far. */
  get flanksLaunched(): number {
    return this.launched;
  }

  /** True while the unit rides on the flank. */
  has(u: Entity): boolean {
    return u.id !== undefined && this.flank.has(u.id);
  }

  /** Sends `units` (already detached from the main wave) at `target`. */
  launch(ctx: AIContext, _view: WorldView, units: readonly Entity[], target: KnownBuilding): void {
    for (const u of units) if (u.id !== undefined) this.flank.add(u.id);
    this.goal = target;
    this.reorders.clear();
    this.launched++;
    this.log.add(ctx.timeMs, 'flank', `${target.position.tx},${target.position.ty}`);
    // New orders (the wave's march is dropped); the upkeep then fights what it meets.
    for (const u of units) {
      clearUnitOrders(ctx.world, u);
      ctx.world.addComponent(u, 'moveIntent', { target: target.position });
    }
  }

  /** Upkeep: drop the fallen, release the flank once its target is gone, else fight or march on. */
  update(ctx: AIContext, view: WorldView): void {
    if (!this.active) return;
    for (const id of [...this.flank]) if (!view.byId.get(id) || view.byId.get(id)!.dying) this.flank.delete(id);
    if (!this.active) {
      this.goal = null;
      return;
    }
    if (!this.goal || !view.knownEnemyBuildings.some((b) => b.id === this.goal!.id)) {
      this.release(ctx, view);
      return;
    }
    this.steer(ctx, view);
  }

  /** Units in reach (villagers too: the flank raids the economy) first, then the target, else the march to it. */
  private steer(ctx: AIContext, view: WorldView): void {
    const goal = this.goal;
    if (!goal) return;
    const enemyUnits = view.visibleEnemyUnits.filter((e) => ctx.enemyPlayerId === undefined || e.owner?.playerId === ctx.enemyPlayerId);
    const goalInSight = view.visibleEnemyBuildings.some((b) => b.id === goal.id);
    for (const id of this.flank) {
      const u = view.byId.get(id);
      if (!u?.position) continue;
      // A path being walked, or a fight: the march works, so only consecutive failed paths count.
      if ((u.movable?.path.length ?? 0) > 0 || u.attackIntent) this.reorders.delete(id);
      const current = u.attackIntent ? view.byId.get(u.attackIntent.targetId) : undefined;
      if (current && !current.dying && !current.building) continue;
      const engage = pickEngageTarget(u.position, enemyUnits, [], AI_COMMON.engageRadius);
      if (engage?.id !== undefined) {
        this.reorders.delete(id);
        clearUnitOrders(ctx.world, u);
        ctx.world.addComponent(u, 'attackIntent', { targetId: engage.id });
      } else if (goalInSight) {
        if (u.attackIntent?.targetId === goal.id) continue;
        clearUnitOrders(ctx.world, u);
        ctx.world.addComponent(u, 'attackIntent', { targetId: goal.id });
      } else if (!isBusy(u) || u.attackIntent) {
        // Walk to where the target was seen (an attack order on a building out of sight could be stale).
        // Idle again and again, with no path walked or fight in between: no path there, so it leaves the flank.
        if (!u.attackIntent && this.countReorder(id) > AI_COMMON.flankReorders) {
          this.flank.delete(id);
          this.reorders.delete(id);
          clearUnitOrders(ctx.world, u);
          continue;
        }
        clearUnitOrders(ctx.world, u);
        ctx.world.addComponent(u, 'moveIntent', { target: goal.position });
      }
    }
  }

  private countReorder(id: number): number {
    const n = (this.reorders.get(id) ?? 0) + 1;
    this.reorders.set(id, n);
    return n;
  }

  /** The target is gone: the members stop where they are and are free again. */
  private release(ctx: AIContext, view: WorldView): void {
    for (const id of this.flank) {
      const u = view.byId.get(id);
      if (!u) continue;
      clearUnitOrders(ctx.world, u);
      if (u.movable) u.movable.path = [];
    }
    this.flank.clear();
    this.reorders.clear();
    this.goal = null;
    this.log.add(ctx.timeMs, 'flank', 'done');
  }
}
