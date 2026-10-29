import { SCORE_BALANCE } from '../config/balance';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import type { EcsWorld } from '../ecs/world';
import type { AgeId, BuildingType, Resources, UnitType } from '../types';

/** The per-player counters the score reads (MatchStats keeps them). */
export interface ScoreStats {
  /** Resources delivered, all types summed. */
  readonly gathered: number;
  /** Cost of the enemy units and buildings this player destroyed. */
  readonly killValue: number;
}

/** A player's score by part (M7 Decision 8). */
export interface ScoreBreakdown {
  readonly economy: number;
  readonly military: number;
  readonly buildings: number;
  readonly age: number;
  readonly total: number;
}

/** A cost as one number: food + wood + gold. */
export const costValue = (cost: Resources): number => cost.food + cost.wood + cost.gold;

/**
 * What destroying this unit or building is worth: its cost, a foundation's
 * scaled by its build `progress` (floored); 0 for anything else.
 */
export function victimValue(v: { readonly unitType?: UnitType; readonly buildingType?: BuildingType; readonly progress?: number }): number {
  if (v.buildingType) {
    const cost = costValue(BUILDING_SPECS[v.buildingType].cost);
    return v.progress === undefined ? cost : Math.floor(cost * v.progress);
  }
  if (v.unitType) return costValue(UNIT_SPECS[v.unitType].cost);
  return 0;
}

/** Cost sum of `playerId`'s finished, living buildings. */
export function standingBuildingValue(world: EcsWorld, playerId: number): number {
  let sum = 0;
  for (const b of world.with('building', 'owner')) {
    if (b.owner.playerId !== playerId || b.underConstruction || b.dying) continue;
    sum += costValue(BUILDING_SPECS[b.building.type].cost);
  }
  return sum;
}

/**
 * `floor(gathered / 10) + floor(killValue / 10) +
 * floor(standingBuildingValue / 10) + AGE_SCORE[age]` (SCORE_BALANCE).
 */
export function scoreBreakdown(
  player: { readonly id: number; readonly age: AgeId },
  stats: ScoreStats,
  world: EcsWorld,
): ScoreBreakdown {
  const economy = Math.floor(stats.gathered / SCORE_BALANCE.economyDivisor);
  const military = Math.floor(stats.killValue / SCORE_BALANCE.militaryDivisor);
  const buildings = Math.floor(standingBuildingValue(world, player.id) / SCORE_BALANCE.buildingDivisor);
  const age = SCORE_BALANCE.ageScore[player.age];
  return { economy, military, buildings, age, total: economy + military + buildings + age };
}

/** The player's total score (scoreBreakdown().total). */
export function score(player: { readonly id: number; readonly age: AgeId }, stats: ScoreStats, world: EcsWorld): number {
  return scoreBreakdown(player, stats, world).total;
}
