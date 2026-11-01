import { MONK, MONK_AI } from '../config/balance';
import type { MediumTuning } from '../config/aiMedium';
import type { Entity } from '../ecs/components';
import { isBuildingAvailable } from '../game/availability';
import { canConvert } from '../game/convert';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { BaseUnitType, BuildingType } from '../types';
import type { AIContext } from './AIPlayer';
import { groupCentre } from './decisions/combat';
import { baseAnchor } from './economyBuildings';
import type { WorldView } from './perception';


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
 * Monk play of the Medium strategy family (CLAUDE.md M11). Stateless (all
 * from the world), so nothing extra is saved:
 *  - build: from age 2 with `minVillagers` and the age's military buildings standing, one monastery;
 *  - train: up to `count` monks there;
 *  - control: a ready monk converts the nearest visible enemy unit within
 *    convertRange + MONK_AI.convertReach; otherwise it walks with the attack wave
 *    (or stays home), where MonkSystem heals the wounded around it.
 */
export class MonkPlay {
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
    const wave = [...this.act.waveMembers()].map((id) => view.byId.get(id)).filter((u): u is Entity => !!u?.position && !u.dying);
    const rally = groupCentre(wave) ?? baseAnchor(view);
    for (const monk of monks) {
      if (monk.convertIntent) continue;
      if (this.tryConvert(ctx, view, monk)) continue;
      if (!rally || monk.moveIntent || (monk.movable?.path.length ?? 0) > 0) continue;
      if (chebyshev(monk.position!, rally) > MONK_AI.followSlack) ctx.world.addComponent(monk, 'moveIntent', { target: { tx: rally.tx, ty: rally.ty } });
    }
  }

  private tryConvert(ctx: AIContext, view: WorldView, monk: Entity): boolean {
    if (!monk.converter || monk.converter.rechargeMs > 0) return false;
    let best: Entity | null = null;
    let bestDist = MONK.convertRange + MONK_AI.convertReach + 1;
    for (const e of view.visibleEnemyUnits) {
      if (!canConvert(e, ctx.player.id)) continue;
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
