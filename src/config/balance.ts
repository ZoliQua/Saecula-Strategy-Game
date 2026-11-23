import type { AgeId, BaseUnitType, BuildingType, ProjectileKind, Resources, TechId, UnitType } from '../types';

/**
 * Single source of truth for unit and building stats
 * (PROGRAM_TERV.md sections 7 and 8). Systems, archetypes and AI read
 * from here; no stat literals elsewhere.
 */

/** PROGRAM_TERV.md lists speeds in AoE units; the game scales them. */
export const SPEED_SCALE = 2.75;

/** Cooldowns are not in the spec table (ms). */
export const MELEE_COOLDOWN_MS = 1500;
export const RANGED_COOLDOWN_MS = 2000;
export const CANNON_COOLDOWN_MS = 5000;
export const TOWER_COOLDOWN_MS = 2000;

/** Extra melee damage an anti-cavalry unit deals to the cavalry class. */
export const ANTI_CAVALRY_BONUS = 22;
/** Units that deal the anti-cavalry bonus. */
export const ANTI_CAVALRY_UNITS: readonly UnitType[] = ['pikeman', 'landsknecht'];
export const CAVALRY_CLASS: readonly UnitType[] = [
  'scout', 'knight', 'cavalry', 'hussar', 'conquistador', 'cossack',
];
/** Units affected by the infantry speed technology. */
export const INFANTRY_CLASS: readonly UnitType[] = [
  'swordsman', 'pikeman', 'archer', 'crossbowman', 'musketeer',
  'longbowman', 'landsknecht', 'mousquetaire', 'legionary', 'sissi',
];
/** Units affected by the Arrow sharpening technologies. */
export const ARROW_UNITS: readonly UnitType[] = [
  'archer', 'crossbowman', 'musketeer', 'longbowman', 'mousquetaire', 'sissi',
];

/**
 * Civ bonus magnitudes (M8), as fractions. Which civ gets which lives in
 * the civ registry, not here.
 */
export const CIV_BONUS = {
  cavalrySpeed: 0.1,
  farmFood: 0.15,
  buildingHp: 0.15,
  stableHp: 0.15,
  goldGather: 0.25,
  buildSpeed: 0.15,
  woodGather: 0.15,
  infantrySpeed: 0.1,
} as const;

/** How far (tiles) from where a walled-off attacker is stuck it looks for an enemy wall / building to breach. */
export const BREACH_SEARCH_RADIUS = 2;

/** Building armour: melee 0, pierce 6 (towers and walls included). */
export const BUILDING_MELEE_DEF = 0;
export const BUILDING_PIERCE_DEF = 6;

/** Tower auto-attack (PROGRAM_TERV.md section 8.3). */
export const TOWER_ATTACK = { pierce: 5, range: 5, cooldownMs: TOWER_COOLDOWN_MS } as const;

export interface UnitBalance {
  readonly age: AgeId;
  readonly hp: number;
  readonly meleeAtk: number;
  readonly pierceAtk: number;
  readonly meleeDef: number;
  readonly pierceDef: number;
  /** Attack range in tiles (melee = 1). */
  readonly range: number;
  /** Table speed (AoE units); use `gameSpeed()` for tiles/s. */
  readonly speed: number;
  readonly los: number;
  readonly cost: Resources;
  /** Seconds. */
  readonly trainTime: number;
  readonly trainers: readonly BuildingType[];
  readonly popCost: number;
  readonly cooldownMs: number;
  /** Set exactly on unique units: the base unit this one replaces for its civ. */
  readonly replaces?: BaseUnitType;
}

export interface BuildingBalance {
  readonly age: AgeId;
  readonly hp: number;
  readonly width: number;
  readonly height: number;
  readonly cost: Resources;
  /** Seconds with one builder. */
  readonly buildTime: number;
  readonly los: number;
  readonly popBonus: number;
  readonly dropoff?: readonly ('food' | 'wood' | 'gold')[];
}

const c = (food: number, wood: number, gold: number): Resources => ({ food, wood, gold });

export const UNIT_BALANCE: Record<UnitType, UnitBalance> = {
  villager: {
    age: 1, hp: 25, meleeAtk: 3, pierceAtk: 0, meleeDef: 0, pierceDef: 0,
    range: 1, speed: 0.9, los: 4, cost: c(50, 0, 0), trainTime: 25,
    trainers: ['town_center'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  scout: {
    age: 1, hp: 45, meleeAtk: 4, pierceAtk: 0, meleeDef: 0, pierceDef: 2,
    range: 1, speed: 1.5, los: 8, cost: c(80, 0, 0), trainTime: 30,
    trainers: ['barracks'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  swordsman: {
    age: 1, hp: 40, meleeAtk: 6, pierceAtk: 0, meleeDef: 0, pierceDef: 1,
    range: 1, speed: 0.9, los: 4, cost: c(60, 0, 20), trainTime: 21,
    trainers: ['barracks'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  archer: {
    age: 1, hp: 30, meleeAtk: 0, pierceAtk: 4, meleeDef: 0, pierceDef: 0,
    range: 4, speed: 0.96, los: 6, cost: c(0, 25, 45), trainTime: 35,
    trainers: ['archery_range', 'barracks'], popCost: 1, cooldownMs: RANGED_COOLDOWN_MS,
  },
  knight: {
    age: 2, hp: 100, meleeAtk: 10, pierceAtk: 0, meleeDef: 2, pierceDef: 2,
    range: 1, speed: 1.35, los: 4, cost: c(60, 0, 75), trainTime: 30,
    trainers: ['stable'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  pikeman: {
    age: 2, hp: 55, meleeAtk: 4, pierceAtk: 0, meleeDef: 0, pierceDef: 0,
    range: 1, speed: 1.0, los: 3, cost: c(35, 25, 0), trainTime: 22,
    trainers: ['barracks'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  crossbowman: {
    age: 2, hp: 35, meleeAtk: 0, pierceAtk: 5, meleeDef: 0, pierceDef: 0,
    range: 5, speed: 0.96, los: 7, cost: c(0, 25, 45), trainTime: 27,
    trainers: ['archery_range'], popCost: 1, cooldownMs: RANGED_COOLDOWN_MS,
  },
  musketeer: {
    age: 3, hp: 60, meleeAtk: 0, pierceAtk: 7, meleeDef: 0, pierceDef: 1,
    range: 6, speed: 1.0, los: 7, cost: c(60, 0, 20), trainTime: 21,
    trainers: ['barracks'], popCost: 1, cooldownMs: RANGED_COOLDOWN_MS,
  },
  cannon: {
    age: 3, hp: 50, meleeAtk: 0, pierceAtk: 40, meleeDef: 0, pierceDef: 0,
    range: 8, speed: 0.6, los: 7, cost: c(0, 65, 275), trainTime: 46,
    trainers: ['foundry'], popCost: 2, cooldownMs: CANNON_COOLDOWN_MS,
  },
  cavalry: {
    age: 3, hp: 120, meleeAtk: 12, pierceAtk: 0, meleeDef: 2, pierceDef: 2,
    range: 1, speed: 1.5, los: 5, cost: c(70, 0, 75), trainTime: 30,
    trainers: ['stable'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  hussar: {
    age: 2, hp: 85, meleeAtk: 9, pierceAtk: 0, meleeDef: 1, pierceDef: 2,
    range: 1, speed: 1.55, los: 6, cost: c(70, 0, 40), trainTime: 25,
    trainers: ['stable'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS, replaces: 'knight',
  },
  longbowman: {
    age: 2, hp: 35, meleeAtk: 0, pierceAtk: 5, meleeDef: 0, pierceDef: 0,
    range: 7, speed: 0.96, los: 8, cost: c(0, 35, 40), trainTime: 32,
    trainers: ['archery_range'], popCost: 1, cooldownMs: RANGED_COOLDOWN_MS, replaces: 'crossbowman',
  },
  landsknecht: {
    age: 2, hp: 70, meleeAtk: 7, pierceAtk: 0, meleeDef: 1, pierceDef: 0,
    range: 1, speed: 1.0, los: 4, cost: c(50, 20, 25), trainTime: 24,
    trainers: ['barracks'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS, replaces: 'pikeman',
  },
  mousquetaire: {
    age: 3, hp: 65, meleeAtk: 0, pierceAtk: 9, meleeDef: 0, pierceDef: 1,
    range: 6, speed: 1.1, los: 7, cost: c(60, 0, 35), trainTime: 22,
    trainers: ['barracks'], popCost: 1, cooldownMs: RANGED_COOLDOWN_MS, replaces: 'musketeer',
  },
  conquistador: {
    age: 3, hp: 130, meleeAtk: 12, pierceAtk: 0, meleeDef: 4, pierceDef: 4,
    range: 1, speed: 1.4, los: 5, cost: c(80, 0, 90), trainTime: 32,
    trainers: ['stable'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS, replaces: 'cavalry',
  },
  legionary: {
    age: 1, hp: 45, meleeAtk: 7, pierceAtk: 0, meleeDef: 1, pierceDef: 3,
    range: 1, speed: 0.9, los: 4, cost: c(60, 0, 30), trainTime: 23,
    trainers: ['barracks'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS, replaces: 'swordsman',
  },
  cossack: {
    age: 1, hp: 50, meleeAtk: 5, pierceAtk: 0, meleeDef: 0, pierceDef: 2,
    range: 1, speed: 1.55, los: 8, cost: c(85, 0, 15), trainTime: 30,
    trainers: ['barracks'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS, replaces: 'scout',
  },
  sissi: {
    age: 1, hp: 32, meleeAtk: 0, pierceAtk: 4, meleeDef: 0, pierceDef: 0,
    range: 3, speed: 1.15, los: 8, cost: c(0, 30, 40), trainTime: 32,
    trainers: ['archery_range', 'barracks'], popCost: 1, cooldownMs: RANGED_COOLDOWN_MS, replaces: 'archer',
  },
  // M11: no attack (no attacker component); heals and converts instead (MONK).
  monk: {
    age: 2, hp: 30, meleeAtk: 0, pierceAtk: 0, meleeDef: 0, pierceDef: 0,
    range: 0, speed: 0.7, los: 9, cost: c(0, 0, 100), trainTime: 50,
    trainers: ['monastery'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  // M14 ships: trained at the dock, moving on water (NAVAL_CLASS).
  fishing_boat: {
    age: 1, hp: 60, meleeAtk: 0, pierceAtk: 0, meleeDef: 0, pierceDef: 4,
    range: 0, speed: 1.26, los: 5, cost: c(0, 75, 0), trainTime: 40,
    trainers: ['dock'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  transport: {
    age: 1, hp: 100, meleeAtk: 0, pierceAtk: 0, meleeDef: 0, pierceDef: 8,
    range: 0, speed: 1.3, los: 5, cost: c(0, 125, 0), trainTime: 45,
    trainers: ['dock'], popCost: 1, cooldownMs: MELEE_COOLDOWN_MS,
  },
  galley: {
    age: 1, hp: 120, meleeAtk: 0, pierceAtk: 6, meleeDef: 0, pierceDef: 6,
    range: 5, speed: 1.43, los: 7, cost: c(0, 90, 30), trainTime: 60,
    trainers: ['dock'], popCost: 1, cooldownMs: RANGED_COOLDOWN_MS,
  },
  frigate: {
    age: 3, hp: 180, meleeAtk: 0, pierceAtk: 35, meleeDef: 0, pierceDef: 6,
    range: 7, speed: 1.0, los: 8, cost: c(0, 150, 175), trainTime: 60,
    trainers: ['dock'], popCost: 2, cooldownMs: CANNON_COOLDOWN_MS,
  },
};

/** Ships (M14): they move on water only; melee units and monks cannot touch them. */
export const NAVAL_CLASS: readonly UnitType[] = ['fishing_boat', 'transport', 'galley', 'frigate'];

/** Whether `type` is a ship (M14). */
export function isNavalType(type: UnitType): boolean {
  return NAVAL_CLASS.includes(type);
}

/** Naval rules (M14). */
export const NAVAL = {
  /** Land units a transport carries at most (population counted as usual). */
  transportCapacity: 5,
  /** Food a fishing boat carries per trip. */
  fishCapacity: 15,
  /** Food per second a fishing boat takes from a fish school beside it. */
  fishRate: 0.6,
  /** Food in one fish school. */
  fishAmount: 225,
  /** A boarding order with no progress (neither the unit nor its transport moving) for this long is dropped, ms. */
  boardTimeoutMs: 30_000,
  /** A transport that moved this far (tiles) from where a boarding unit last headed makes it re-plan. */
  boardRetargetTiles: 2,
  /** A transport within this many tiles of its unload target (and beside land) puts its cargo ashore there. */
  unloadReach: 3,
  /** How far (tiles) from an unload target a transport looks for an open shore. */
  shoreSearch: 14,
  /** How far (tiles, Chebyshev) from the transport its cargo is put ashore at most. */
  unloadSpread: 4,
  /** Open water tiles a dock site needs alongside, so its ships can launch and come in. */
  dockMinShore: 2,
  /** A ship gives an attack up once its target has stayed out of reach from its water this long, ms (a target only briefly inland keeps the order). */
  shipUnreachableGiveUpMs: 8_000,
} as const;

/** The monk's healing and conversion (M11). Ranges in tiles (Chebyshev), as unit ranges. */
export const MONK = {
  /** Friendly units within this range are healed by an idle monk. */
  healRange: 4,
  /** HP restored per second to one wounded unit. */
  healPerSec: 1.5,
  /** A conversion channels within this range. */
  convertRange: 6,
  /** Channel time of one conversion (it restarts when the target escapes out of range). */
  convertTimeMs: 6000,
  /** After a conversion the monk cannot convert again for this long. */
  rechargeMs: 20000,
  /** A target may move this many tiles from where its monk last headed before the monk re-paths. */
  retargetTiles: 2,
} as const;

export const BUILDING_BALANCE: Record<BuildingType, BuildingBalance> = {
  town_center: {
    age: 1, hp: 2400, width: 3, height: 3, cost: c(0, 275, 100), buildTime: 150,
    los: 4, popBonus: 5, dropoff: ['food', 'wood', 'gold'],
  },
  house: { age: 1, hp: 500, width: 2, height: 2, cost: c(0, 30, 0), buildTime: 25, los: 4, popBonus: 5 },
  farm: { age: 1, hp: 400, width: 2, height: 2, cost: c(60, 0, 0), buildTime: 15, los: 4, popBonus: 0 },
  lumber_camp: {
    age: 1, hp: 800, width: 2, height: 2, cost: c(0, 100, 0), buildTime: 35,
    los: 4, popBonus: 0, dropoff: ['wood'],
  },
  mining_camp: {
    age: 1, hp: 800, width: 2, height: 2, cost: c(0, 100, 0), buildTime: 35,
    los: 4, popBonus: 0, dropoff: ['gold'],
  },
  barracks: { age: 1, hp: 1200, width: 3, height: 3, cost: c(0, 175, 0), buildTime: 50, los: 4, popBonus: 0 },
  archery_range: { age: 2, hp: 1200, width: 3, height: 3, cost: c(0, 175, 0), buildTime: 50, los: 4, popBonus: 0 },
  stable: { age: 2, hp: 1200, width: 3, height: 3, cost: c(0, 175, 0), buildTime: 50, los: 4, popBonus: 0 },
  blacksmith: { age: 2, hp: 1200, width: 2, height: 2, cost: c(0, 150, 0), buildTime: 40, los: 4, popBonus: 0 },
  foundry: { age: 3, hp: 1500, width: 3, height: 3, cost: c(0, 175, 100), buildTime: 60, los: 4, popBonus: 0 },
  monastery: { age: 2, hp: 1500, width: 3, height: 3, cost: c(0, 175, 0), buildTime: 50, los: 6, popBonus: 0 },
  // M14: on the shore (one side touching water); trains ships, takes fishing boats' food.
  dock: {
    age: 1, hp: 1800, width: 3, height: 3, cost: c(0, 150, 0), buildTime: 35,
    los: 6, popBonus: 0, dropoff: ['food'],
  },
  // M17: exchanges food and wood for gold (MARKET); trade carts follow in Task 2.
  market: { age: 2, hp: 1500, width: 3, height: 3, cost: c(0, 175, 0), buildTime: 50, los: 6, popBonus: 0 },
  tower: { age: 2, hp: 850, width: 1, height: 1, cost: c(0, 50, 125), buildTime: 80, los: 9, popBonus: 0 },
  wall: { age: 1, hp: 300, width: 1, height: 1, cost: c(0, 5, 0), buildTime: 6, los: 4, popBonus: 0 },
  wonder: { age: 3, hp: 4800, width: 4, height: 4, cost: c(2000, 2000, 1000), buildTime: 600, los: 4, popBonus: 0 },
};

/**
 * Time a destroyed building stays in the world while it collapses (its
 * footprint stays blocked until the entity is removed). Units use
 * kill.ts DEATH_TTL_MS.
 */
export const BUILDING_DEATH_TTL_MS = 2400;

/**
 * Deleting an own building (M7): a site up to `untilProgress` built
 * refunds `(1 - progress) * maxPercent` % of its cost, anything else
 * nothing (src/game/refund.ts).
 */
export const DELETE_REFUND = { maxPercent: 80, untilProgress: 0.5 } as const;

/**
 * Match score (M7 Decision 8, src/stats/score.ts): a tenth of the
 * resources gathered, of the cost of enemy units and buildings destroyed
 * and of the cost of the player's standing finished buildings, plus a
 * flat bonus per age; the timeline is sampled every `sampleMs` of game time.
 */
export const SCORE_BALANCE = {
  economyDivisor: 10,
  militaryDivisor: 10,
  buildingDivisor: 10,
  ageScore: { 1: 0, 2: 300, 3: 800 },
  sampleMs: 60_000,
} as const;

/**
 * Market exchange (M17, src/game/market.ts). Prices are per player and in
 * gold per `lot`: a buy pays the price, a sale receives price × (1 −
 * sellFee). Each buy raises that resource's price by `step` × price, each
 * sale lowers it by the same share; prices stay within [minPrice, maxPrice].
 */
export const MARKET = {
  lot: 100,
  startPrice: { food: 100, wood: 100 },
  step: 0.03,
  minPrice: 20,
  maxPrice: 300,
  sellFee: 0.3,
} as const;

/** Buildings a player may own only one of (finished or under construction). */
export const UNIQUE_BUILDINGS: ReadonlySet<BuildingType> = new Set<BuildingType>(['wonder']);

/** How long a finished Wonder must stand for its owner to win (Wonder victory, CLAUDE.md §4.8). */
export const WONDER_HOLD_MS = 600_000;

/** Time victory (CLAUDE.md §4.8 #3, M9): the highest score among the standing players wins at `limitMs`. */
export const TIME_VICTORY = {
  /** Game time at which the match is decided on score. */
  limitMs: 3_600_000,
  /** Final window in which the leading AI launches no new attack wave; the HUD clock is highlighted. */
  holdLeadMs: 300_000,
} as const;

/** Starting-resource presets (M16 setup "Kezdő nyersanyag"); every player starts with the chosen one. */
export type StartResourcesId = 'normal' | 'high' | 'deathmatch';
export const START_RESOURCES: Readonly<Record<StartResourcesId, Readonly<Resources>>> = {
  normal: { food: 200, wood: 200, gold: 100 },
  high: { food: 2000, wood: 2000, gold: 1500 },
  deathmatch: { food: 20000, wood: 20000, gold: 20000 },
};

/** Treaty lengths (M16 setup "Fegyverszünet"), in game minutes; 0 = no treaty. */
export const TREATY = { minutes: [0, 10, 20] as const };

/** Game-speed choices (M16 setup "Sebesség"): game time runs this many times faster than real time. */
export const GAME_SPEEDS = [1, 1.5, 2] as const;

/** Tiles per second used by the game. */
export function gameSpeed(tableSpeed: number): number {
  return tableSpeed * SPEED_SCALE;
}

/** Buildings that train at least one unit type. */
export const TRAINER_BUILDINGS: ReadonlySet<BuildingType> = new Set(
  Object.values(UNIT_BALANCE).flatMap((u) => u.trainers),
);

/** Projectile kind fired by each ranged unit. Melee units are absent. */
export const UNIT_PROJECTILE: Partial<Record<UnitType, ProjectileKind>> = {
  archer: 'arrow',
  crossbowman: 'bolt',
  musketeer: 'bullet',
  cannon: 'cannonball',
  longbowman: 'arrow',
  sissi: 'arrow',
  mousquetaire: 'bullet',
  galley: 'arrow',
  frigate: 'cannonball',
};

/** Towers fire arrows (Task 11 wires the tower attacker to this). */
export const TOWER_PROJECTILE: ProjectileKind = 'arrow';

export interface ProjectileBalance {
  /** Flight speed in tiles per second. */
  readonly speed: number;
  /** Peak height of the arc, in tiles (0 = flat). */
  readonly arcHeight: number;
}

export const PROJECTILE_BALANCE: Record<ProjectileKind, ProjectileBalance> = {
  arrow: { speed: 10, arcHeight: 1.0 },
  bolt: { speed: 13, arcHeight: 0.5 },
  bullet: { speed: 30, arcHeight: 0.05 },
  cannonball: { speed: 9, arcHeight: 1.8 },
};

/** Flights never resolve faster than this, so point-blank shots stay visible. */
export const PROJECTILE_MIN_FLIGHT_MS = 120;
/** A single-target projectile only hits if the target is this close to the impact point. */
export const PROJECTILE_HIT_RADIUS = 0.75;
/** Cannonball splash radius: full damage to every enemy within it, no friendly fire. */
export const CANNON_AOE_RADIUS = 1;

export interface TechBalance {
  readonly cost: Resources;
  /** Research time in seconds. */
  readonly time: number;
  /**
   * Effect magnitude: attack/defence points, a gather/speed/HP fraction
   * (0.1 = +10%) or population cap points. Age-ups have none.
   */
  readonly value?: number;
}

/** Research costs, durations and effect sizes (PROGRAM_TERV.md section 9). */
export const TECH_BALANCE: Record<TechId, TechBalance> = {
  feudalism: { cost: c(500, 0, 300), time: 120 },
  enlightenment: { cost: c(800, 0, 500), time: 180 },
  // 9.1 Blacksmith
  blade_sharpening_1: { cost: c(100, 50, 0), time: 40, value: 1 },
  blade_sharpening_2: { cost: c(200, 100, 0), time: 60, value: 1 },
  arrow_sharpening_1: { cost: c(100, 50, 0), time: 40, value: 1 },
  arrow_sharpening_2: { cost: c(200, 100, 0), time: 60, value: 1 },
  armor_1: { cost: c(100, 0, 0), time: 40, value: 1 },
  armor_2: { cost: c(150, 0, 50), time: 60, value: 1 },
  shield_1: { cost: c(0, 100, 0), time: 40, value: 1 },
  shield_2: { cost: c(0, 150, 50), time: 60, value: 1 },
  // 9.2 Lumber camp
  double_saw: { cost: c(100, 50, 0), time: 30, value: 0.1 },
  two_man_saw: { cost: c(200, 150, 0), time: 50, value: 0.15 },
  steam_saw: { cost: c(300, 200, 100), time: 60, value: 0.2 },
  // 9.3 Mining camp
  gold_mining_1: { cost: c(100, 0, 0), time: 30, value: 0.15 },
  gold_mining_2: { cost: c(200, 0, 50), time: 50, value: 0.15 },
  deep_mining: { cost: c(300, 100, 100), time: 60, value: 0.2 },
  // 9.4 Farm
  crop_rotation: { cost: c(75, 0, 0), time: 30, value: 0.15 },
  heavy_plow: { cost: c(125, 75, 0), time: 50, value: 0.15 },
  mechanized_harvest: { cost: c(200, 150, 100), time: 60, value: 0.2 },
  // 9.5 House (researched at the town centre)
  artisan_guilds: { cost: c(100, 100, 0), time: 45, value: 2 },
  // 9.7 Barracks
  infantry_march: { cost: c(150, 0, 50), time: 45, value: 0.1 },
  cavalry_training: { cost: c(150, 0, 50), time: 45, value: 0.1 },
  // M12: town centre
  wheelbarrow: { cost: c(175, 50, 0), time: 60, value: 0.1 },
  treadmill_crane: { cost: c(0, 200, 50), time: 45, value: 0.2 },
  // M12: stable and barracks
  husbandry: { cost: c(150, 0, 0), time: 50, value: 0.1 },
  cavalry_armor: { cost: c(250, 0, 100), time: 60, value: 0.15 },
  forced_march: { cost: c(200, 0, 100), time: 50, value: 0.1 },
  conscription: { cost: c(300, 0, 200), time: 60, value: 0.25 },
  // M12: blacksmith (gunpowder units' pierce attack)
  chemistry: { cost: c(300, 0, 200), time: 70, value: 1 },
  // M12: monastery
  sanctity: { cost: c(0, 0, 120), time: 45, value: 0.5 },
  fervor: { cost: c(0, 0, 140), time: 45, value: 0.15 },
  illumination: { cost: c(0, 0, 250), time: 60, value: 0.5 },
};

/** Trainers whose queues `conscription` speeds up (M12). */
export const CONSCRIPTION_BUILDINGS: readonly BuildingType[] = ['barracks', 'archery_range', 'stable'];

/** A unit that found no path (walled-off target or site) waits this long before planning again (ms). */
export const REPATH_RETRY_MS = 1500;

/**
 * Farms (PROGRAM_TERV.md §8.2 "175 food regenerable", §8.3): a finished
 * farm holds up to `capacity` food and regrows `regenPerSec` food every
 * second up to that cap, harvested or not. It never runs out for good: a
 * farmer on an empty farm waits for it to regrow, so a worked farm yields
 * the gather rate until drained and the regrowth rate after.
 */
export const FARM_BALANCE = { capacity: 175, regenPerSec: 0.4 } as const;

/**
 * A gatherer whose node runs out moves on by itself only to a node of the
 * same type this close (Chebyshev tiles); beyond that it drops off and
 * waits for orders, instead of trekking across the map (or into another
 * player's base) for the globally nearest one.
 */
export const GATHER_RETARGET_RADIUS = 8;

/** What one resource tile holds when the map is spawned (a forest tile is one tree, a gold tile one lode piece). */
export const RESOURCE_NODE_AMOUNT: Readonly<Record<'food' | 'wood' | 'gold', number>> = {
  wood: 100,
  // Sized for three ages (age-ups 800, foundry, cannons 275 each, the Wonder 1000) with START_ECONOMY's two lodes.
  gold: 300,
  food: 125,
};

/**
 * Every player's start (all map templates): a gold lode of several
 * adjacent tiles, a berry patch and a forest next to the town centre
 * (AoE convention), sized so Feudalism (500 food, 300 gold) and the first
 * army are paid for from home, plus a second, outer gold lode a short walk
 * out (`outerGold`) for the later ages: both lodes hold about 3000-3600
 * gold, enough for both age-ups, a foundry, a few cannons and a Wonder.
 * Validation (src/map/validation.ts) requires at least the `min*` amounts
 * reachable within `radius` tiles, and `minTotalGold` of the start's own
 * gold (nearer to it than to any other start) within `outerGold.radius`.
 */
export const START_ECONOMY = {
  /** Gold tiles in the start lode ([min, max], inclusive). */
  goldTiles: { min: 5, max: 6 },
  /** Ring (tiles from the start) the lode sits in. */
  goldRing: { min: 4, max: 6 },
  berryBushes: { min: 4, max: 6 },
  berryRing: { min: 4, max: 5 },
  trees: { min: 12, max: 16 },
  treeRing: { min: 5, max: 7 },
  /** Validation radius (Chebyshev tiles from the start) for the minimums below. */
  radius: 8,
  minGold: 1200,
  minFood: 500,
  minWood: 800,
  outerGold: {
    tiles: { min: 5, max: 6 },
    /**
     * Euclidean distance (tiles) from the start; the generator tries the side facing the map centre first.
     * The lode also keeps out of every start's `radius` (and so outside a fortress ring).
     */
    ring: { min: 10, max: 14 },
    /** Fallback when the ring has no room (crowded maps): closer in, on open grass only. */
    crowdedRing: { min: 7, max: 14 },
    /** Every outer lode tile is at least this many tiles nearer its own start than any other start. */
    ownMargin: 3,
    /** Validation radius (Chebyshev tiles) for `minTotalGold`. */
    radius: 16,
  },
  /** Two full lodes of the minimum size. */
  minTotalGold: 3000,
} as const;
