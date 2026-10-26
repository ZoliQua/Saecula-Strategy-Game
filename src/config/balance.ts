import type { AgeId, BuildingType, ProjectileKind, Resources, TechId, UnitType } from '../types';

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

/** Extra melee damage a pikeman deals to the cavalry class. */
export const PIKEMAN_CAVALRY_BONUS = 22;
export const CAVALRY_CLASS: readonly UnitType[] = ['scout', 'knight', 'cavalry'];
/** Units affected by the infantry speed technology. */
export const INFANTRY_CLASS: readonly UnitType[] = [
  'swordsman', 'pikeman', 'archer', 'crossbowman', 'musketeer',
];
/** Units affected by the Arrow sharpening technologies. */
export const ARROW_UNITS: readonly UnitType[] = ['archer', 'crossbowman', 'musketeer'];

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
};

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

/** Buildings a player may own only one of (finished or under construction). */
export const UNIQUE_BUILDINGS: ReadonlySet<BuildingType> = new Set<BuildingType>(['wonder']);

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
};

/** Easy AI: chance per game that it ever researches an age-up. */
export const AI_EASY_AGE_UP_CHANCE = 0.5;
/** Easy AI: game-time window (ms) from which it first tries to age up. */
export const AI_EASY_AGE_UP_DELAY_MS = { min: 8 * 60_000, max: 12 * 60_000 } as const;
