import type { BaseUnitType } from '../types';
import { AI_MEDIUM, type MediumTuning } from './aiMedium';

/** Stance switching thresholds (Hard AI, see ai/decisions/stance.ts). */
export interface StanceTuning {
  /** A stance is kept at least this long before another (except turtle) can replace it (ms). */
  readonly minDwellMs: number;
  /** Aggression that makes the AI turtle, and the lower level it must fall below to stop. */
  readonly turtleEnter: number;
  readonly turtleExit: number;
  /** No rush judgement before this game time (ms): early on nobody has an army. */
  readonly passiveAfterMs: number;
  /** Enemy army seen at or below `rushEnter` reads as passive; it must exceed `rushExit` to stop. */
  readonly rushEnter: number;
  readonly rushExit: number;
}

/** Hard AI tuning on top of the Medium family table. */
export interface HardTuning extends MediumTuning {
  /** Villagers' share of the population: 65% at first, 50% in the war phase (§10.3). */
  readonly villagerShare: { readonly peace: number; readonly war: number };
  /** Population the villager share is taken of, per age. */
  readonly populationTarget: readonly number[];
  /** Gatherers are rebalanced at most this often (ms), however fast the decision cycle. */
  readonly rebalanceMs: number;
  readonly stance: StanceTuning;
  /** Aggression (armed enemies seen at the base) decays by this factor per minute. */
  readonly aggressionDecayPerMin: number;
  /** A (decaying) unit sighting counts toward the enemy's age while at least this strong. */
  readonly enemyAgeMinSighting: number;
  readonly turtle: {
    /** Towers kept (age 2+) toward the side the attacks come from. */
    readonly towers: number;
    readonly towerDistance: number;
    /** Wall lines laid across the attack side, how far out and how long (tiles each way). */
    readonly wallLines: number;
    readonly wallDistance: number;
    /** Each further wall line goes this many tiles further out. */
    readonly wallLineSpacing: number;
    readonly wallHalfLength: number;
    readonly wallBuilders: number;
    /** While turtling, the army only marches out at this size. */
    readonly wave: number;
    /** Fortify from age 2 in any stance (the turtle personality); absent = only in the turtle stance. */
    readonly proactive?: boolean;
  };
  /** Rush: smaller waves, sent as soon as they are ready. */
  readonly rush: { readonly wave: number };
  /** Tech: bigger waves; the age-up reserve binds harder. */
  readonly tech: { readonly wave: number; readonly ageUpReserve: readonly number[] };
  readonly harass: {
    /** Villager raids per game (§10.3: 1-2). */
    readonly maxRaids: number;
    readonly notBeforeMs: number;
    readonly cooldownMs: number;
    /** Raiders per raid, in order of preference; at least `minSize` go. */
    readonly units: readonly BaseUnitType[];
    readonly size: number;
    readonly minSize: number;
    readonly clusterRadius: number;
    readonly avoidTowerRadius: number;
    /** Armed enemies per raider that make the raid fall back. */
    readonly retreatRatio: number;
  };
}

/** Hard AI (§10.3). */
export const AI_HARD: HardTuning = {
  ...AI_MEDIUM,
  decisionMs: { min: 3_000, max: 5_000 },
  // villagerTarget (Medium's table) is unused: Hard takes villagerShare of populationTarget.
  villagerShare: { peace: 0.65, war: 0.5 },
  populationTarget: [0, 26, 50, 70],
  gatherByAge: [
    { food: 0.6, wood: 0.25, gold: 0.15 },
    { food: 0.6, wood: 0.25, gold: 0.15 },
    { food: 0.4, wood: 0.25, gold: 0.35 },
    { food: 0.35, wood: 0.25, gold: 0.4 },
  ],
  ageUpGatherShift: 0.35,
  barracksAtVillagers: 5,
  rebalancePerDecision: 2,
  rebalanceMs: 12_000,
  /** Full reserve through the Middle age too (see AI_MEDIUM.ageUpReserve; Hard reached age 3 on 1 of 3 seeds otherwise). */
  ageUpReserve: [0, 1, 1, 0.2],
  minDefenders: 6,
  attackWave: 10,
  firstAttackMs: { min: 3 * 60_000, max: 5 * 60_000 },
  /**
   * §10.3 first attack at 3-5 min: the raiders are trained from 2.5 min before the rolled time
   * (more than three scouts' 30 s train time, since food is the limit), and while they are short
   * both villagers and new farms wait for them.
   */
  pressure: { unit: 'scout', minArmy: 3, leadMs: 150_000, holdsVillagers: true, beforeFarms: true },
  trainPerDecision: 3,
  scouts: 2,
  scoutRetrainMs: 45_000,
  techPriority: [
    'gold_mining_1', 'double_saw', 'crop_rotation',
    'blade_sharpening_1', 'armor_1', 'arrow_sharpening_1', 'shield_1',
    'cavalry_training', 'artisan_guilds', 'two_man_saw', 'gold_mining_2', 'heavy_plow', 'infantry_march',
    'blade_sharpening_2', 'armor_2', 'arrow_sharpening_2', 'shield_2',
    'deep_mining', 'steam_saw', 'mechanized_harvest',
  ],
  armyByAge: [
    {},
    { swordsman: 0.6, archer: 0.4 },
    { knight: 0.45, crossbowman: 0.35, pikeman: 0.2 },
    { musketeer: 0.4, cavalry: 0.25, cannon: 0.2, pikeman: 0.15 },
  ],
  militaryBuildings: [
    [],
    ['barracks'],
    ['barracks', 'stable', 'archery_range', 'blacksmith'],
    ['barracks', 'stable', 'archery_range', 'blacksmith', 'foundry'],
  ],
  counters: { threshold: 0.2, boost: 0.9 },
  stance: {
    minDwellMs: 90_000,
    turtleEnter: 4,
    turtleExit: 1.5,
    passiveAfterMs: 6 * 60_000,
    rushEnter: 1,
    rushExit: 4,
  },
  aggressionDecayPerMin: 0.5,
  enemyAgeMinSighting: 0.5,
  turtle: { towers: 3, towerDistance: 6, wallLines: 2, wallDistance: 9, wallLineSpacing: 3, wallHalfLength: 5, wallBuilders: 3, wave: 18 },
  rush: { wave: 7 },
  tech: { wave: 14, ageUpReserve: [0, 1, 1, 0.5] },
  harass: {
    maxRaids: 2,
    notBeforeMs: 6 * 60_000,
    cooldownMs: 120_000,
    units: ['knight', 'cavalry', 'scout'],
    size: 4,
    minSize: 2,
    clusterRadius: 4,
    avoidTowerRadius: 9,
    retreatRatio: 1,
  },
};
