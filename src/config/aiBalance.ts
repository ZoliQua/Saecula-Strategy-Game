import type { Difficulty } from '../game/GameSetupConfig';
import type { BuildingType, TechId, UnitType } from '../types';

/**
 * AI tuning (PROGRAM_TERV.md §10): every number the AI strategies and
 * their helpers decide by. Game rules / unit stats stay in balance.ts.
 */

/** A [min, max] window; the AI rolls a value inside it. */
export interface Span {
  readonly min: number;
  readonly max: number;
}

/** Shared AI tuning. */
export const AI_COMMON = {
  /** How often an AI rescans its own fog of war (ms); the human's runs every 250 ms. */
  fogScanMs: 400,
  /** Cheap per-tick upkeep (idle villagers, army orders, scout) runs this often (ms). */
  upkeepMs: 1000,
  /** Hostile units this close (tiles) to an own building count as an attack on the base. */
  defendRadius: 12,
  /** Free population slots left before another house is started. */
  houseMargin: 3,
  /** Army units on a wave pick visible enemies this close (tiles). */
  engageRadius: 9,
  /** A wave falls back home when it shrinks below this many units. */
  retreatBelow: 3,
  /** Remembered enemy unit sightings decay by this factor per minute. */
  sightingDecayPerMin: 0.6,
  /** Farther than this (tiles) from a drop-off, a resource cluster earns its own camp. */
  campDistance: 5,
  /** An exploring wave counts as arrived this close (tiles) to its waypoint. */
  exploreArrivedWithin: 3,
  /** Gatherers are only moved between resources once the split is off by this many villagers. */
  rebalanceSlack: 1,
  /** Gatherers on a resource before it earns a drop-off camp. */
  campMinGatherers: { wood: 3, gold: 2 } as Readonly<Record<'wood' | 'gold', number>>,
  /** Berry bushes this close (tiles) to the TC count as food spots. */
  berryRadius: 10,
  /** Food spots a berry bush near home counts for (low: bushes run out fast, farms should follow early). */
  berrySpots: 1,
  /** Resource tiles this close to the cluster seed belong to the cluster (camp anchor). */
  clusterRadius: 3,
  /** Builders sent to a new construction site. */
  buildersPerSite: 2,
  /** How long an enemy villager's last seen spot is remembered (ms). */
  villagerMemoryMs: 180_000,
} as const;

/** A placement ring (Chebyshev tiles around the anchor). */
export interface Ring {
  readonly minRadius: number;
  readonly maxRadius: number;
}

/**
 * Where AI buildings go around their anchor (the TC, or a resource
 * cluster for camps). Farms take the ring hugging the TC (their drop-off);
 * houses go one ring out; everything else further out.
 */
export const AI_PLACEMENT: {
  readonly byType: Partial<Record<BuildingType, Ring>>;
  readonly fallback: Ring;
  /** When the ring has no free explored spot, the search retries from this close to the anchor. */
  readonly closeInRadius: number;
} = {
  byType: {
    house: { minRadius: 5, maxRadius: 16 },
    farm: { minRadius: 2, maxRadius: 12 },
    lumber_camp: { minRadius: 1, maxRadius: 6 },
    // Towers go near their anchor (a spot between the base and the threat).
    tower: { minRadius: 0, maxRadius: 4 },
    mining_camp: { minRadius: 1, maxRadius: 6 },
  },
  fallback: { minRadius: 7, maxRadius: 18 },
  closeInRadius: 3,
};

/** Easy AI (§10.1). */
export const AI_EASY = {
  /** Simple, wood-heavy gatherer split. */
  gather: { food: 0.4, wood: 0.5, gold: 0.1 } satisfies GatherWeights,
  /** What the 20% "random" decisions may put up. */
  randomBuilds: ['house', 'farm', 'barracks', 'lumber_camp', 'mining_camp'] as readonly BuildingType[],
  decisionMs: { min: 20_000, max: 30_000 } satisfies Span,
  /** Chance per decision that it keeps to its build order (else builds something random). */
  buildOrderAdherence: 0.8,
  villagerTarget: 8,
  /** Military units to keep per villager (50% villagers). */
  militaryPerVillager: 1,
  minMilitary: 5,
  attackWave: 8,
  firstAttackMs: { min: 8 * 60_000, max: 15 * 60_000 } satisfies Span,
} as const;
/** Easy AI: chance per game that it ever researches an age-up. */
export const AI_EASY_AGE_UP_CHANCE = 0.5;
/** Easy AI: game-time window (ms) from which it first tries to age up. */
export const AI_EASY_AGE_UP_DELAY_MS = { min: 8 * 60_000, max: 12 * 60_000 } as const;

/** Share of gatherers wanted on each resource. */
export type GatherWeights = Readonly<Record<'food' | 'wood' | 'gold', number>>;

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
   * Roman age (age-up first), half later so the army keeps growing.
   */
  ageUpReserve: [0, 1, 0.5, 0],
  /** Army size kept at home regardless of saving. */
  minDefenders: 5,
  /** Attack when this many military units (scouts excluded) exist. */
  attackWave: 12,
  /** §10.2 first attack: an early pressure wave at a rolled time with whatever army exists then. */
  firstAttackMs: { min: 5 * 60_000, max: 8 * 60_000 },
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
};

/** How strongly an AI reacts to the enemy units it has seen. */
export interface CounterTuning {
  /** Share of sightings a class needs before the AI reacts. */
  readonly threshold: number;
  /** Weight added to each counter, scaled by the class share. */
  readonly boost: number;
}

/**
 * Counter units (§7.5 rock-paper-scissors): when scouting has seen many
 * of the key class, the matching counters get extra weight in the mix.
 */
export const AI_COUNTERS = {
  vs: {
    cavalry: ['pikeman'],
    archers: ['knight', 'swordsman', 'cavalry'],
    infantry: ['crossbowman', 'archer', 'musketeer', 'cannon'],
  } as Readonly<Record<'cavalry' | 'archers' | 'infantry', readonly UnitType[]>>,
} as const;

/**
 * Gather-rate handicap per difficulty (§10.3: the Hard AI gathers 20%
 * faster because it cannot use its economy as well as a human). Applied
 * to AI players only, through the gather-rate modifiers.
 */
export const AI_GATHER_HANDICAP: Readonly<Record<Difficulty, number>> = { easy: 1, medium: 1, hard: 1.2 };

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
  readonly turtle: {
    /** Towers kept (age 2+) toward the side the attacks come from. */
    readonly towers: number;
    readonly towerDistance: number;
    /** Wall lines laid across the attack side, how far out and how long (tiles each way). */
    readonly wallLines: number;
    readonly wallDistance: number;
    readonly wallHalfLength: number;
    readonly wallBuilders: number;
    /** While turtling, the army only marches out at this size. */
    readonly wave: number;
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
    readonly units: readonly UnitType[];
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
  villagerTarget: [0, 17, 32, 45],
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
  ageUpReserve: [0, 1, 0.6, 0.2],
  minDefenders: 6,
  attackWave: 10,
  firstAttackMs: { min: 3 * 60_000, max: 5 * 60_000 },
  // Villagers keep coming while the raiders are trained (65% villagers, §10.3).
  pressure: { unit: 'scout', minArmy: 3, leadMs: 75_000, holdsVillagers: true },
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
  turtle: { towers: 3, towerDistance: 6, wallLines: 2, wallDistance: 9, wallHalfLength: 5, wallBuilders: 3, wave: 18 },
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
