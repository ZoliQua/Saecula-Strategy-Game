import { AI_COMMON } from '../config/aiBalance';
import { MONK } from '../config/balance';
import type { MediumTuning } from '../config/aiMedium';
import type { Entity } from '../ecs/components';
import { isBuildingAvailable } from '../game/availability';
import { canConvert, takeConvertGivenUp } from '../game/convert';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { BaseUnitType, BuildingType } from '../types';
import type { AIContext } from './AIPlayer';
import { groupCentre } from './decisions/combat';
import { baseAnchor } from './economyBuildings';
import { ownLiving, type WorldView } from './perception';
import type { MonkAvoidState } from './strategyState';


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
 * world, apart from a short memory of given-up targets (saved with the
 * strategy: snapshot / restore):
 *  - build: from age 2 with `minVillagers` and the age's military buildings standing, one monastery;
 *  - train: up to `count` monks there;
 *  - control: a ready monk converts the nearest visible enemy unit within
 *    convertRange + AI_COMMON.monkConvertReach; otherwise it walks with the attack wave
 *    (or stays home), where MonkSystem heals the wounded around it.
 */
export class MonkPlay {
  /** Per monk id: the targets it gave up on (unreachable), each avoided until a game time. */
  private readonly avoid = new Map<number, Map<number, number>>();

  constructor(
    private readonly tune: MediumTuning['monks'],
    private readonly act: MonkActions,
  ) {}

  /** The avoided targets as `[monkId, targetId, untilMs]` rows (saved with the strategy). */
  snapshot(): MonkAvoidState {
    const rows: [number, number, number][] = [];
    for (const [monkId, targets] of this.avoid) for (const [targetId, until] of targets) rows.push([monkId, targetId, until]);
    return rows;
  }

  restore(rows: MonkAvoidState): void {
    this.avoid.clear();
    for (const [monkId, targetId, until] of rows) {
      let targets = this.avoid.get(monkId);
      if (!targets) this.avoid.set(monkId, (targets = new Map()));
      targets.set(targetId, until);
    }
  }

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
    this.forgetStale(ctx, view);
    const monks = MonkPlay.monksOf(ctx);
    if (monks.length === 0) return;
    const wave = [...this.act.waveMembers()].map((id) => ownLiving(view, id)).filter((u): u is Entity => !!u?.position);
    const rally = groupCentre(wave) ?? baseAnchor(view);
    for (const monk of monks) {
      this.noteGivenUp(ctx, monk);
      this.steer(ctx, view, monk, rally);
    }
  }

  /** Drops the avoidances of monks no longer the AI's own living units, and those that ran out. */
  private forgetStale(ctx: AIContext, view: WorldView): void {
    for (const [monkId, targets] of [...this.avoid]) {
      if (!ownLiving(view, monkId)) {
        this.avoid.delete(monkId);
        continue;
      }
      for (const [targetId, until] of [...targets]) if (ctx.timeMs >= until) targets.delete(targetId);
      if (targets.size === 0) this.avoid.delete(monkId);
    }
  }

  private steer(ctx: AIContext, view: WorldView, monk: Entity, rally: TileCoord | null): void {
    if (monk.convertIntent) return;
    if (this.tryConvert(ctx, view, monk)) return;
    if (!rally || monk.moveIntent || (monk.movable?.path.length ?? 0) > 0) return;
    if (chebyshev(monk.position!, rally) > AI_COMMON.monkFollowSlack) ctx.world.addComponent(monk, 'moveIntent', { target: { tx: rally.tx, ty: rally.ty } });
  }

  /** A target MonkSystem gave up on (out of reach) is avoided by that monk for AI_COMMON.monkAvoidMs. */
  private noteGivenUp(ctx: AIContext, monk: Entity): void {
    const targetId = takeConvertGivenUp(monk);
    if (targetId === undefined || monk.id === undefined) return;
    let targets = this.avoid.get(monk.id);
    if (!targets) this.avoid.set(monk.id, (targets = new Map()));
    targets.set(targetId, ctx.timeMs + AI_COMMON.monkAvoidMs);
  }

  private avoided(ctx: AIContext, monk: Entity, target: Entity): boolean {
    const until = monk.id === undefined || target.id === undefined ? undefined : this.avoid.get(monk.id)?.get(target.id);
    return until !== undefined && ctx.timeMs < until;
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
