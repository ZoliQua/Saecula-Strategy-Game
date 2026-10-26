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
export const AI_PLACEMENT: { readonly byType: Partial<Record<BuildingType, Ring>>; readonly fallback: Ring } = {
  byType: {
    house: { minRadius: 5, maxRadius: 16 },
    farm: { minRadius: 2, maxRadius: 12 },
    lumber_camp: { minRadius: 1, maxRadius: 6 },
    mining_camp: { minRadius: 1, maxRadius: 6 },
  },
  fallback: { minRadius: 7, maxRadius: 18 },
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

/** Medium AI (§10.2). */
export const AI_MEDIUM = {
  decisionMs: { min: 10_000, max: 15_000 } satisfies Span,
  /** Villagers wanted per age (index = age); about 60% of the population later on. */
  villagerTarget: [0, 14, 26, 32] as readonly number[],
  /** Gatherer split: opening (few villagers), then per age. */
  /** §10.2 step 1: "4 villagers on wood, 2 on food". */
  gatherOpening: { food: 1 / 3, wood: 2 / 3, gold: 0 } satisfies GatherWeights,
  gatherByAge: [
    { food: 0.65, wood: 0.2, gold: 0.15 },
    { food: 0.65, wood: 0.2, gold: 0.15 },
    { food: 0.4, wood: 0.25, gold: 0.35 },
    { food: 0.35, wood: 0.25, gold: 0.4 },
  ] as readonly GatherWeights[],
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
  ageUpReserve: [0, 1, 0.5, 0] as readonly number[],
  /** Army size kept at home regardless of saving. */
  minDefenders: 5,
  /** Attack when this many military units (scouts excluded) exist. */
  attackWave: 12,
  /** §10.2 first attack: an early pressure wave at a rolled time with whatever army exists then. */
  firstAttackMs: { min: 5 * 60_000, max: 8 * 60_000 } satisfies Span,
  /**
   * The pressure wave: a raid of fast, food-only scouts (no gold, which
   * the Roman age needs for Feudalism), sent once `minArmy` exist besides
   * the exploring scout.
   */
  pressure: {
    unit: 'scout' as UnitType,
    minArmy: 3,
    /** Raiders are trained ahead of villagers from this long before the first-attack time (ms). */
    leadMs: 150_000,
  },
  /** Military buildings keep at most this many units queued (resources stay liquid). */
  militaryQueue: 2,
  /** Units queued per decision at most. */
  trainPerDecision: 4,
  /** Re-train a lost scout at most this often (ms). */
  scoutRetrainMs: 60_000,
  /** Blacksmith first, then economy and barracks techs (each researched when affordable). */
  techPriority: [
    'blade_sharpening_1', 'arrow_sharpening_1', 'armor_1', 'shield_1',
    'double_saw', 'gold_mining_1', 'crop_rotation', 'artisan_guilds',
    'two_man_saw', 'gold_mining_2', 'heavy_plow', 'cavalry_training', 'infantry_march',
    'blade_sharpening_2', 'arrow_sharpening_2', 'armor_2', 'shield_2',
    'steam_saw', 'deep_mining', 'mechanized_harvest',
  ] as readonly TechId[],
  /** Army mix per age (index = age); counters adjust it from what scouting saw. */
  armyByAge: [
    {},
    { swordsman: 0.6, archer: 0.4 },
    { knight: 0.4, crossbowman: 0.4, pikeman: 0.2 },
    { musketeer: 0.45, cannon: 0.2, cavalry: 0.2, pikeman: 0.15 },
  ] as readonly Partial<Record<UnitType, number>>[],
  /** Military buildings per age, in build order. */
  militaryBuildings: [
    [],
    ['barracks'],
    ['barracks', 'archery_range', 'stable', 'blacksmith'],
    ['barracks', 'archery_range', 'stable', 'blacksmith', 'foundry'],
  ] as readonly (readonly BuildingType[])[],
} as const;

/**
 * Counter units (§7.5 rock-paper-scissors): when scouting has seen many
 * of the key class, the matching counters get extra weight in the mix.
 */
export const AI_COUNTERS = {
  /** Share of sightings a class needs before the AI reacts. */
  threshold: 0.3,
  /** Weight added to each counter, scaled by the class share. */
  boost: 0.6,
  vs: {
    cavalry: ['pikeman'],
    archers: ['knight', 'swordsman', 'cavalry'],
    infantry: ['crossbowman', 'archer', 'musketeer', 'cannon'],
  } as Readonly<Record<'cavalry' | 'archers' | 'infantry', readonly UnitType[]>>,
} as const;
