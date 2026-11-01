import { AI_COMMON } from '../config/aiBalance';
import { MONK } from '../config/balance';
import type { MediumTuning } from '../config/aiMedium';
import type { Entity } from '../ecs/components';
import { isBuildingAvailable } from '../game/availability';
import { canConvert } from '../game/convert';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { BaseUnitType, BuildingType } from '../types';
import type { AIContext } from './AIPlayer';
import { groupCentre } from './decisions/combat';
import { baseAnchor } from './economyBuildings';
import { ownLiving, type WorldView } from './perception';


/** The strategy helpers monk play acts through (BaseStrategy's building and training). */
export interface MonkActions {
  ownCount(view: WorldView, type: BuildingType, finishedOnly?: boolean): number;
  /** The age's military buildings are all standing (monks come after the army's production). */
  militaryReady(ctx: AIContext, view: WorldView): boolean;
  startBuilding(ctx: AIContext, view: WorldView, type: BuildingType, anchor: TileCoord): Entity | null;
  train(ctx: AIContext, view: WorldView, type: BaseUnitType, maxQueued?: number): boolean;
  /** Ids of the units on the attack wave (ArmyControl). */
  waveMembers(): ReadonlySet<number>;
}

/**
 * Monk play of the Medium strategy family (CLAUDE.md M11). Read from the
 * world, apart from a short memory of given-up targets (not saved: after a
 * load a monk may try one of them once more):
 *  - build: from age 2 with `minVillagers` and the age's military buildings standing, one monastery;
 *  - train: up to `count` monks there;
 *  - control: a ready monk converts the nearest visible enemy unit within
 *    convertRange + AI_COMMON.monkConvertReach; otherwise it walks with the attack wave
 *    (or stays home), where MonkSystem heals the wounded around it.
 */
export class MonkPlay {
  /** Each monk's conversion order as last seen (to notice one given up). */
  private readonly lastOrder = new Map<number, number>();
  /** Targets each monk gave up on (unreachable), until a game time. Keyed `monkId:targetId`. */
  private readonly avoid = new Map<string, number>();

  constructor(
    private readonly tune: MediumTuning['monks'],
    private readonly act: MonkActions,
  ) {}

  /** The monks of `view` (own, alive). */
  static monksOf(ctx: AIContext): Entity[] {
    return ctx.world.entities.filter((e) => e.converter && e.owner?.playerId === ctx.player.id && !e.dying && e.position);
  }

  build(ctx: AIContext, view: WorldView): void {
    if (this.tune.count <= 0 || !isBuildingAvailable('monastery', ctx.player.age)) return;
    if (view.villagers.length < this.tune.minVillagers || this.act.ownCount(view, 'monastery') > 0) return;
    if (!this.act.militaryReady(ctx, view)) return;
    const anchor = baseAnchor(view);
    if (anchor) this.act.startBuilding(ctx, view, 'monastery', anchor);
  }

  train(ctx: AIContext, view: WorldView): void {
    if (this.tune.count <= 0 || this.act.ownCount(view, 'monastery', true) === 0) return;
    const queued = view.buildings.reduce((n, b) => n + (b.trainingQueue?.entries.filter((e) => e.unitType === 'monk').length ?? 0), 0);
    if (MonkPlay.monksOf(ctx).length + queued < this.tune.count) this.act.train(ctx, view, 'monk', 1);
  }

  control(ctx: AIContext, view: WorldView): void {
    const monks = MonkPlay.monksOf(ctx);
    if (monks.length === 0) return;
    const wave = [...this.act.waveMembers()].map((id) => ownLiving(view, id)).filter((u): u is Entity => !!u?.position);
    const rally = groupCentre(wave) ?? baseAnchor(view);
    for (const monk of monks) {
      this.noteGivenUp(ctx, monk);
      this.steer(ctx, view, monk, rally);
      // The order as it leaves this tick: next tick tells whether MonkSystem gave it up.
      if (monk.id !== undefined) {
        if (monk.convertIntent) this.lastOrder.set(monk.id, monk.convertIntent.targetId);
        else this.lastOrder.delete(monk.id);
      }
    }
  }

  private steer(ctx: AIContext, view: WorldView, monk: Entity, rally: TileCoord | null): void {
    if (monk.convertIntent) return;
    if (this.tryConvert(ctx, view, monk)) return;
    if (!rally || monk.moveIntent || (monk.movable?.path.length ?? 0) > 0) return;
    if (chebyshev(monk.position!, rally) > AI_COMMON.monkFollowSlack) ctx.world.addComponent(monk, 'moveIntent', { target: { tx: rally.tx, ty: rally.ty } });
  }

  /**
   * A conversion order that ended while its target is still a living enemy
   * unit and the monk is not recharging was given up (MonkSystem: out of
   * reach): that target is avoided for AI_COMMON.monkAvoidMs.
   */
  private noteGivenUp(ctx: AIContext, monk: Entity): void {
    const id = monk.id;
    if (id === undefined) return;
    const before = this.lastOrder.get(id);
    if (before === undefined || monk.convertIntent || (monk.converter?.rechargeMs ?? 0) > 0) return;
    const target = ctx.world.entities.find((e) => e.id === before);
    if (canConvert(target, ctx.player.id)) this.avoid.set(`${id}:${before}`, ctx.timeMs + AI_COMMON.monkAvoidMs);
  }

  private avoided(ctx: AIContext, monk: Entity, target: Entity): boolean {
    const key = `${monk.id}:${target.id}`;
    const until = this.avoid.get(key);
    if (until === undefined) return false;
    if (ctx.timeMs < until) return true;
    this.avoid.delete(key);
    return false;
  }

  private tryConvert(ctx: AIContext, view: WorldView, monk: Entity): boolean {
    if (!monk.converter || monk.converter.rechargeMs > 0) return false;
    let best: Entity | null = null;
    let bestDist = MONK.convertRange + AI_COMMON.monkConvertReach + 1;
    for (const e of view.visibleEnemyUnits) {
      if (!canConvert(e, ctx.player.id) || this.avoided(ctx, monk, e)) continue;
      const d = chebyshev(e.position, monk.position!);
      if (d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    if (!best) return false;
    if (monk.moveIntent) ctx.world.removeComponent(monk, 'moveIntent');
    ctx.world.addComponent(monk, 'convertIntent', { targetId: best.id!, elapsedMs: 0 });
    return true;
  }
}
