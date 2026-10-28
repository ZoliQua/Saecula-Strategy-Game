import type { MediumTuning } from '../../config/aiMedium';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { isBuildingAvailable } from '../../game/availability';
import type { AIContext } from '../AIPlayer';
import { canAfford } from '../economy';
import type { WorldView } from '../perception';

/**
 * Whether the AI plays for a Wonder: the match can be won by one, the AI
 * is in the last age with a full economy (`minVillagers`) and owns none
 * yet (`owned` counts sites too). While it does, it saves for the cost.
 */
export function wantsWonder(ctx: AIContext, view: WorldView, tune: MediumTuning['wonder'], owned: number): boolean {
  if (!tune.enabled || ctx.wonderVictory !== true) return false;
  if (!isBuildingAvailable('wonder', ctx.player.age) || owned > 0) return false;
  return view.villagers.length >= tune.minVillagers;
}

/** Whether to start a Wonder now: `wantsWonder`, and it can be paid for outright. */
export function shouldBuildWonder(
  ctx: AIContext,
  view: WorldView,
  tune: MediumTuning['wonder'],
  owned: number,
): boolean {
  return wantsWonder(ctx, view, tune, owned) && canAfford(ctx.player.resources, BUILDING_SPECS.wonder.cost);
}
