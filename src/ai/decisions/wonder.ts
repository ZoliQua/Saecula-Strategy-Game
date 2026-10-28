import type { MediumTuning } from '../../config/aiMedium';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { isBuildingAvailable } from '../../game/availability';
import type { Resources } from '../../types';
import type { AIContext } from '../AIPlayer';
import { canAfford } from '../economy';
import type { WorldView } from '../perception';
import { loadedTime, savedTime, type WonderSiteState } from '../strategyState';

/** Resources still left in the nodes the AI can work, per gathered-out resource (food: farms regrow). */
export interface WorkableStock {
  readonly wood: number;
  readonly gold: number;
}

/** The match can be won by a Wonder, the AI is in the last age with a full economy and owns none yet (`owned` counts sites). */
function wonderTime(ctx: AIContext, view: WorldView, tune: MediumTuning['wonder'], owned: number): boolean {
  if (!tune.enabled || ctx.wonderVictory !== true) return false;
  if (!isBuildingAvailable('wonder', ctx.player.age) || owned > 0) return false;
  return view.villagers.length >= tune.minVillagers;
}

/**
 * Whether the Wonder's cost can still be gathered: what is in hand plus
 * what the workable wood and gold nodes still hold (food comes from
 * farms, which regrow). Without this, saving would never end once the
 * map's gold runs dry, and the army and research would stop for good.
 */
export function wonderReachable(have: Resources, workable: WorkableStock): boolean {
  const cost = BUILDING_SPECS.wonder.cost;
  return have.wood + workable.wood >= cost.wood && have.gold + workable.gold >= cost.gold;
}

/**
 * Whether the AI saves for a Wonder: it is Wonder time (see above) and
 * the cost can still be gathered (`wonderReachable`). The caller also
 * drops the saving while no site for it can be found.
 */
export function wantsWonder(
  ctx: AIContext,
  view: WorldView,
  tune: MediumTuning['wonder'],
  owned: number,
  workable: WorkableStock,
): boolean {
  return wonderTime(ctx, view, tune, owned) && wonderReachable(ctx.player.resources, workable);
}

/** Whether to start a Wonder now: Wonder time, and it can be paid for outright. */
export function shouldBuildWonder(
  ctx: AIContext,
  view: WorldView,
  tune: MediumTuning['wonder'],
  owned: number,
): boolean {
  return wonderTime(ctx, view, tune, owned) && canAfford(ctx.player.resources, BUILDING_SPECS.wonder.cost);
}

/**
 * Remembers whether a Wonder site could be found near the town centre,
 * searching again (`find`) at most once per `retryMs`: while none can be
 * found, the AI does not save for a Wonder it could not place.
 */
export class WonderSiteCheck {
  private nextSearchMs = -Infinity;
  private found = true;

  constructor(private readonly retryMs: number) {}

  snapshot(): WonderSiteState {
    return { nextSearchMs: savedTime(this.nextSearchMs), found: this.found };
  }

  restore(state: WonderSiteState): void {
    this.nextSearchMs = loadedTime(state.nextSearchMs);
    this.found = state.found;
  }

  available(nowMs: number, find: () => boolean): boolean {
    if (nowMs >= this.nextSearchMs) {
      this.found = find();
      this.nextSearchMs = nowMs + this.retryMs;
    }
    return this.found;
  }
}
