import { AI_HARD, type HardTuning } from './aiHard';

/** Flanking waves of the Mesteri AI (ai/FlankControl.ts). */
export interface FlankTuning {
  /** A main wave this big (members) splits off a flank. */
  readonly minWave: number;
  /** Share of the wave's members detached into the flank (rounded). */
  readonly share: number;
  /** The flank's target lies at least this far (tiles) from the main wave's target. */
  readonly minSeparation: number;
}

/** Mesteri AI tuning: the Hard table plus flanking. */
export interface MasterTuning extends HardTuning {
  readonly flank: FlankTuning;
}

/**
 * Mesteri AI: Hard's play on a faster 2-4 s cycle with a leaner Roman
 * age and a larger, more villager-heavy population later, a sharper
 * counter-unit reaction, a bigger Wonder crew, bigger rush waves and
 * flanking waves. Its only economic
 * edge is Hard's +20% gather-rate handicap (no vision, no resources).
 */
export const AI_MASTER: MasterTuning = {
  ...AI_HARD,
  decisionMs: { min: 2_000, max: 4_000 },
  /**
   * Age 1 at 22 (villagers: 15), below Hard's 26: fewer mouths before Feudalism (Task 2 ruling 1, with
   * the gather split and the raid recall below: age 2 at 10.82 / 10.44 / 11.44 / 11.25 min on seeds 1-4,
   * against Hard's 12.65 / 11.89 / 12.64 / 12.62).
   */
  populationTarget: [0, 22, 55, 80],
  villagerShare: { peace: 0.68, war: 0.52 },
  barracksAtVillagers: 5,
  ageUpReserve: [0, 1, 1, 0.3],
  rebalanceMs: 9_000,
  /**
   * Hard's split left Mesteri short of food and hoarding wood in the Roman age: a food-heavy Roman age
   * and a gold-heavy Middle age (age 3 at 17.59 / 17.62 / 19.05 / 18.44 min on seeds 1-4).
   */
  gatherByAge: [
    { food: 0.75, wood: 0.1, gold: 0.15 },
    { food: 0.75, wood: 0.1, gold: 0.15 },
    { food: 0.5, wood: 0.1, gold: 0.4 },
    AI_HARD.gatherByAge[3] ?? { food: 0.35, wood: 0.25, gold: 0.4 },
  ],
  armyByAge: [
    {},
    AI_HARD.armyByAge[1] ?? {},
    { knight: 0.35, crossbowman: 0.35, pikeman: 0.3 },
    { musketeer: 0.35, cavalry: 0.25, cannon: 0.2, pikeman: 0.2 },
  ],
  counters: { threshold: 0.15, boost: 1.1 },
  /**
   * The scout raid is called home after 2 min: otherwise a surviving raid keeps the wave "out" all game
   * and no main wave (nor flank) ever leaves.
   */
  pressure: { ...AI_HARD.pressure, recallMs: 120_000 },
  /** Rush waves big enough to split a flank off (flank.minWave). */
  rush: { wave: 10 },
  wonder: { enabled: true, minVillagers: 24, builders: 10 },
  /** Controller ruling (Task 2): 64×64 bases are compact, economy buildings lie 2-8 tiles from the TC. */
  flank: { minWave: 10, share: 0.35, minSeparation: 6 },
};
