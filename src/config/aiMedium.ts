import type { BuildingType, TechId, UnitType } from '../types';
import type { CounterTuning, GatherWeights, Span } from './aiBalance';

/**
 * Tuning of the Medium strategy family (Medium, and Hard which builds on
 * it). Index = age for the per-age arrays.
 */
export interface MediumTuning {
  readonly decisionMs: Span;
  readonly villagerTarget: readonly number[];
  readonly gatherOpening: GatherWeights;
  readonly gatherByAge: readonly GatherWeights[];
  readonly ageUpGatherShift: number;
  readonly woodBuffer: number;
  readonly openingVillagers: number;
  readonly barracksAtVillagers: number;
  readonly rebalancePerDecision: number;
  readonly ageUpReserve: readonly number[];
  readonly minDefenders: number;
  readonly attackWave: number;
  readonly firstAttackMs: Span;
  readonly pressure: {
    readonly unit: UnitType;
    readonly minArmy: number;
    readonly leadMs: number;
    /** While the squad is short, villager training waits (food goes to the raiders first). */
    readonly holdsVillagers: boolean;
    /** While the squad is short, new farms wait too. */
    readonly beforeFarms: boolean;
  };
  readonly militaryQueue: number;
  readonly trainPerDecision: number;
  /** Scouts kept exploring all game. */
  readonly scouts: number;
  readonly scoutRetrainMs: number;
  readonly techPriority: readonly TechId[];
  readonly armyByAge: readonly Partial<Record<UnitType, number>>[];
  readonly militaryBuildings: readonly (readonly BuildingType[])[];
  /** Counter-unit reaction to sightings. */
  readonly counters: CounterTuning;
  /** Wonder play (only when the match can be won by a Wonder). */
  readonly wonder: {
    readonly enabled: boolean;
    /** Villagers the economy keeps before a Wonder goes up. */
    readonly minVillagers: number;
    /** Villagers sent to build it. */
    readonly builders: number;
  };
}

/** Medium AI (§10.2). */
export const AI_MEDIUM: MediumTuning = {
  decisionMs: { min: 10_000, max: 15_000 },
  /** Villagers wanted per age (index = age); about 60% of the population later on. */
  villagerTarget: [0, 14, 26, 32],
  /** Gatherer split: opening (few villagers), then per age. */
  /** §10.2 step 1: "4 villagers on wood, 2 on food". */
  gatherOpening: { food: 1 / 3, wood: 2 / 3, gold: 0 } satisfies GatherWeights,
  gatherByAge: [
    { food: 0.65, wood: 0.2, gold: 0.15 },
    { food: 0.65, wood: 0.2, gold: 0.15 },
    { food: 0.4, wood: 0.25, gold: 0.35 },
    { food: 0.35, wood: 0.25, gold: 0.4 },
  ],
  /** How strongly gatherers shift toward what the next age-up still lacks (0..1). */
  ageUpGatherShift: 0.6,
  /** Wood always kept in the savings goal (houses, camps), so wood never dries up. */
  woodBuffer: 150,
  /** Villager count until the opening split applies. */
  openingVillagers: 7,
  /** Villagers before the barracks goes up (build order step 5). */
  barracksAtVillagers: 6,
  /** Gatherers moved per decision when the split drifts. */
  rebalancePerDecision: 2,
  /**
   * While saving for the next age-up, military / tech spending keeps this
   * share of its cost in reserve (index = current age): all of it in the
   * Roman and Middle ages. With half kept in the Middle age the gold went
   * to the army and the map's gold ran out before 500 were saved (Task 19:
   * age 3 on 1 of 8 seeds within 40 min; with all of it, 18.8-20.9 min).
   */
  ageUpReserve: [0, 1, 1, 0],
  /** Army size kept at home regardless of saving. */
  minDefenders: 5,
  /** Attack when this many military units (scouts excluded) exist. */
  attackWave: 12,
  /**
   * §10.2 first attack (5-8 min): an early pressure wave at a rolled time with whatever army exists
   * then. Rolled up to 7.5 min, so a squad still a scout short at the roll leaves by 8.
   */
  firstAttackMs: { min: 5 * 60_000, max: 7.5 * 60_000 },
  /**
   * The pressure wave: a raid of fast, food-only scouts (no gold, which
   * the Roman age needs for Feudalism), sent once `minArmy` exist besides
   * the exploring scout.
   */
  pressure: {
    unit: 'scout',
    minArmy: 3,
    /** Raiders are trained ahead of villagers from this long before the first-attack time (ms). */
    leadMs: 150_000,
    holdsVillagers: true,
    beforeFarms: false,
  },
  /** Military buildings keep at most this many units queued (resources stay liquid). */
  militaryQueue: 2,
  /** Units queued per decision at most. */
  trainPerDecision: 4,
  scouts: 1,
  /** Re-train a lost scout at most this often (ms). */
  scoutRetrainMs: 60_000,
  /** Blacksmith first, then economy and barracks techs (each researched when affordable). */
  techPriority: [
    'blade_sharpening_1', 'arrow_sharpening_1', 'armor_1', 'shield_1',
    'double_saw', 'gold_mining_1', 'crop_rotation', 'artisan_guilds',
    'two_man_saw', 'gold_mining_2', 'heavy_plow', 'cavalry_training', 'infantry_march',
    'blade_sharpening_2', 'arrow_sharpening_2', 'armor_2', 'shield_2',
    'steam_saw', 'deep_mining', 'mechanized_harvest',
  ],
  /** Army mix per age (index = age); counters adjust it from what scouting saw. */
  armyByAge: [
    {},
    { swordsman: 0.6, archer: 0.4 },
    { knight: 0.4, crossbowman: 0.4, pikeman: 0.2 },
    { musketeer: 0.45, cannon: 0.2, cavalry: 0.2, pikeman: 0.15 },
  ],
  /** Military buildings per age, in build order. */
  militaryBuildings: [
    [],
    ['barracks'],
    ['barracks', 'archery_range', 'stable', 'blacksmith'],
    ['barracks', 'archery_range', 'stable', 'blacksmith', 'foundry'],
  ],
  counters: { threshold: 0.3, boost: 0.6 },
  /** In the last age, a Wonder as soon as it is affordable with a full economy (Hard inherits). */
  wonder: { enabled: true, minVillagers: 20, builders: 8 },
};
