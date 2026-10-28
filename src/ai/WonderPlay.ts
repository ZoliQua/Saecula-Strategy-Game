import { AI_COMMON, type MediumTuning } from '../config/aiBalance';
import type { Entity } from '../ecs/components';
import { isBuildingAvailable } from '../game/availability';
import { countPlayerBuildings } from '../game/buildRules';
import type { TileCoord } from '../iso/coordinates';
import type { BuildingType } from '../types';
import type { AIContext } from './AIPlayer';
import { shouldBuildWonder, wantsWonder, WonderSiteCheck } from './decisions/wonder';
import type { WorldView } from './perception';
import type { WonderSiteState } from './strategyState';
import { workableNodes } from './workforce';

/** The strategy helpers Wonder play acts through (BaseStrategy's placement and building). */
export interface WonderActions {
  placeFor(ctx: AIContext, view: WorldView, type: BuildingType, anchor: TileCoord): TileCoord | null;
  startBuilding(ctx: AIContext, view: WorldView, type: BuildingType, anchor: TileCoord): Entity | null;
  assignBuilders(ctx: AIContext, view: WorldView, site: Entity, count: number): void;
}

/**
 * Wonder play of the Medium strategy family (only in a match a Wonder can
 * win): saving for the Wonder while its cost can still be gathered and a
 * site exists, then building it at the town centre with
 * `tune.builders` builders.
 */
export class WonderPlay {
  private readonly site = new WonderSiteCheck(AI_COMMON.wonderSiteRetryMs);

  constructor(
    private readonly tune: MediumTuning['wonder'],
    private readonly act: WonderActions,
  ) {}

  /** The cached site answer (re-checked every AI_COMMON.wonderSiteRetryMs), for saved games. */
  snapshot(): WonderSiteState {
    return this.site.snapshot();
  }

  restore(state: WonderSiteState): void {
    this.site.restore(state);
  }

  /**
   * Playing for a Wonder not placed yet (wantsWonder: its cost can still be gathered) with a site for it
   * near the town centre: military and tech spending leave its cost saved.
   */
  saving(ctx: AIContext, view: WorldView): boolean {
    if (ctx.wonderVictory !== true || !isBuildingAvailable('wonder', ctx.player.age)) return false;
    const stock = (t: 'wood' | 'gold') => workableNodes(view, t).reduce((n, e) => n + (e.resourceNode?.amount ?? 0), 0);
    const owned = countPlayerBuildings(ctx.world.entities, ctx.player.id, 'wonder');
    if (!wantsWonder(ctx, view, this.tune, owned, { wood: stock('wood'), gold: stock('gold') })) return false;
    const tc = view.townCenter?.position;
    return !!tc && this.site.available(ctx.timeMs, () => this.act.placeFor(ctx, view, 'wonder', tc) !== null);
  }

  /** A Wonder at the town centre once `shouldBuildWonder` holds; its site keeps `tune.builders` builders. */
  build(ctx: AIContext, view: WorldView, attacked: boolean): void {
    const tc = view.townCenter;
    if (!tc?.position) return;
    const owned = countPlayerBuildings(ctx.world.entities, ctx.player.id, 'wonder');
    // Not while the base is under attack: the defence comes first.
    const site = !attacked && shouldBuildWonder(ctx, view, this.tune, owned)
      ? this.act.startBuilding(ctx, view, 'wonder', tc.position)
      : view.buildings.find((b) => b.building?.type === 'wonder' && b.underConstruction);
    if (!site?.underConstruction || site.id === undefined || attacked) return;
    const building = view.villagers.filter((v) => v.buildCommand?.targetId === site.id).length;
    if (building < this.tune.builders) this.act.assignBuilders(ctx, view, site, this.tune.builders - building);
  }
}
