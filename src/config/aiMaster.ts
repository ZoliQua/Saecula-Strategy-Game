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
 * Mesteri AI: Hard's play on a faster 2-4 s cycle with a larger, more
 * villager-heavy population, an earlier barracks, a sharper counter-unit
 * reaction, a bigger Wonder crew and flanking waves. Its only economic
 * edge is Hard's +20% gather-rate handicap (no vision, no resources).
 */
export const AI_MASTER: MasterTuning = {
  ...AI_HARD,
  decisionMs: { min: 2_000, max: 4_000 },
  populationTarget: [0, 28, 55, 80],
  villagerShare: { peace: 0.68, war: 0.52 },
  barracksAtVillagers: 5,
  ageUpReserve: [0, 1, 1, 0.3],
  rebalanceMs: 9_000,
  /**
   * Tuned (Task 2 Step 5, the only knobs allowed): Hard's split left Mesteri's larger age-1 economy
   * short of food and hoarding wood (age 2 at 12.39-13.37 min on seeds 1-4). A food-heavy Roman age and a
   * gold-heavier Middle age (Hard's ageUpGatherShift kept).
   */
  gatherByAge: [
    { food: 0.75, wood: 0.1, gold: 0.15 },
    { food: 0.75, wood: 0.1, gold: 0.15 },
    { food: 0.45, wood: 0.15, gold: 0.4 },
    AI_HARD.gatherByAge[3] ?? { food: 0.35, wood: 0.25, gold: 0.4 },
  ],
  armyByAge: [
    {},
    AI_HARD.armyByAge[1] ?? {},
    { knight: 0.35, crossbowman: 0.35, pikeman: 0.3 },
    { musketeer: 0.35, cavalry: 0.25, cannon: 0.2, pikeman: 0.2 },
  ],
  counters: { threshold: 0.15, boost: 1.1 },
  wonder: { enabled: true, minVillagers: 24, builders: 10 },
  flank: { minWave: 12, share: 0.35, minSeparation: 10 },
};
