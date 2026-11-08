import type { Difficulty } from '../game/GameSetupConfig';
import type { BaseUnitType, BuildingType } from '../types';

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
  /** An AI monk converts a visible enemy unit within MONK.convertRange + this (tiles, M11). */
  monkConvertReach: 3,
  /** An AI monk further than this from its rally point (the wave, or home) walks back (tiles, M11). */
  monkFollowSlack: 4,
  /** A target whose conversion was given up (unreachable) is not picked again by that monk for this long (ms). */
  monkAvoidMs: 60_000,
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
  /** An abandoned site gets new builders only within this many tiles of the base centre (not far forward)... */
  restaffRadius: 14,
  /** ...and with no armed enemy seen this close (tiles) to it. */
  restaffThreatRadius: 6,
  /** Villagers / farms wait for a short pressure squad at most this long past the first-attack time (ms). */
  pressureHoldCapMs: 90_000,
  /** Resources this close (tiles) to a known enemy building are its base: the AI never sends villagers there. */
  enemyGroundRadius: 10,
  /** How long an enemy villager's last seen spot is remembered (ms). */
  villagerMemoryMs: 180_000,
  /** Expensive units the army saves for when the mix wants one next (cheaper units then leave its cost banked). */
  savesForUnits: ['cannon'] as readonly BaseUnitType[],
  /** A failed search for a Wonder site near the TC stops Wonder saving until this long has passed (ms). */
  wonderSiteRetryMs: 120_000,
  /** A flank unit found idle short of its target this many times (no path) is released from the flank. */
  flankReorders: 3,
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
  } as Readonly<Record<'cavalry' | 'archers' | 'infantry', readonly BaseUnitType[]>>,
} as const;

/**
 * Gather-rate handicap per difficulty (§10.3: the Hard AI gathers 20%
 * faster because it cannot use its economy as well as a human). Applied
 * to AI players only, through the gather-rate modifiers.
 */
export const AI_GATHER_HANDICAP: Readonly<Record<Difficulty, number>> = {
  easy: 1,
  medium: 1,
  hard: 1.2,
  /** Mesteri keeps Hard's rate: no extra vision or resources (M6 decision 10). */
  master: 1.2,
};

// Strategy-family tables (split out to keep each file focused).
export * from './aiMedium';
export * from './aiHard';
export * from './aiMaster';
export * from './aiPersonality';

/**
 * The AI's navy (M14). With a dock site within AI_NAVAL.dockSearchRadius of its base
 * and `minVillagers` villagers, it builds a dock and keeps `fishingBoats`
 * (while fish is known), `galleys` and `frigates` (per age: index = age)
 * and, when the enemy cannot be walked to, up to `transports` for a landing.
 */
export interface NavalTuning {
  readonly minVillagers: number;
  readonly fishingBoats: number;
  readonly galleys: readonly number[];
  readonly frigates: readonly number[];
  readonly transports: number;
}

/** The Easy AI's navy (M14): it only fishes. */
export const AI_EASY_NAVY: NavalTuning = {
  minVillagers: 8,
  fishingBoats: 2,
  galleys: [0, 0, 0, 0],
  frigates: [0, 0, 0, 0],
  transports: 0,
};

/** Naval play common to every AI (M14). */
export const AI_NAVAL = {
  /** The base-to-enemy walkability check is redone at most this often while what is known of the enemy stays the same (ms). */
  walkableRecheckMs: 60_000,
  /** How far (tiles) round its starting points the land-walk check looks for a free tile to start from (a town centre's own tiles). */
  reachSlack: 3,
  /** How far from its base anchor the AI looks for a dock site (tiles). */
  dockSearchRadius: 24,
  /** A warship engages visible enemies this close (tiles), if it can shoot them from the water. */
  engageRadius: 10,
  /** An idle warship this far from its dock sails back toward it. */
  homeRadius: 10,
  /** A landing waits at most this long for its units to board (ms), then sails with whoever is aboard. */
  boardTimeoutMs: 90_000,
} as const;
