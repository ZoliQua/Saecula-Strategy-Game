import { ARROW_UNITS, CAVALRY_CLASS, INFANTRY_CLASS, UNIT_BALANCE } from '../config/balance';
import { CIV_DEFS } from '../config/civs';
import type { CivId, ResourceType, TechId, UnitType } from '../types';
import { baseUnitType } from './civUnits';
import { TECH_SPECS, type TechEffect } from './technologies';

/**
 * Technology effects, computed from a player's researched set.
 *
 * Approach: stat effects are evaluated at USE time, so existing and
 * future entities benefit without touching them. CombatSystem adds the
 * attack bonus when a hit or projectile payload is built and the armour
 * bonus when damage is dealt; GatheringSystem scales the gather rate;
 * MovementSystem scales the step speed; PopulationSystem adds the house
 * bonus. The one exception is HP, which is stored state: the cavalry
 * HP bonus is applied exactly once to each unit, to existing units when
 * the tech completes (ResearchSystem) and to newly trained ones at spawn
 * (TrainingSystem), always scaling current and max proportionally.
 *
 * Multiple bonuses of one kind stack multiplicatively (fractions) or
 * additively (attack/armour points, house cap), see PROGRAM_TERV 9.8.
 */
export interface Researched {
  readonly researched: ReadonlySet<TechId>;
  /** When set, the civ's permanent bonus joins the technology effects. */
  readonly civ?: CivId;
}

export interface UnitBonuses {
  /** Added to the melee attack of a unit that already has one. */
  readonly meleeAtk: number;
  /** Added to the pierce attack of arrow units. */
  readonly pierceAtk: number;
  readonly meleeDef: number;
  readonly pierceDef: number;
  /** Multiplier on movement speed. */
  readonly speedMultiplier: number;
  /** Multiplier on maximum HP (applied once, see above). */
  readonly hpMultiplier: number;
}

export interface EffectiveUnitStats extends UnitBonuses {
  readonly hp: number;
  readonly speed: number;
}

const NO_BONUS: UnitBonuses = Object.freeze({
  meleeAtk: 0,
  pierceAtk: 0,
  meleeDef: 0,
  pierceDef: 0,
  speedMultiplier: 1,
  hpMultiplier: 1,
});

/**
 * Per-player cache of derived bonuses, keyed by the researched set itself.
 * Technologies are only ever added (each once, ResearchSystem), so a size
 * change is exactly a techResearched event; a new set (new game, load)
 * is a new key. Age changes never alter tech effects. This keeps the
 * Movement/Gathering/Combat hot loops allocation-free.
 */
interface EffectCache {
  size: number;
  civ: CivId | undefined;
  effects: readonly TechEffect[];
  units: Map<UnitType, UnitBonuses>;
  gather: Map<ResourceType, number>;
  house: number | undefined;
  buildingHp: number | undefined;
  buildSpeed: number | undefined;
}

const caches = new WeakMap<ReadonlySet<TechId>, EffectCache>();

function cacheOf(player: Researched): EffectCache {
  const set = player.researched;
  let c = caches.get(set);
  if (!c || c.size !== set.size || c.civ !== player.civ) {
    const effects: TechEffect[] = [];
    if (player.civ) effects.push(CIV_DEFS[player.civ].bonus);
    for (const id of set) effects.push(TECH_SPECS[id].effect);
    c = {
      size: set.size,
      civ: player.civ,
      effects,
      units: new Map(),
      gather: new Map(),
      house: undefined,
      buildingHp: undefined,
      buildSpeed: undefined,
    };
    caches.set(set, c);
  }
  return c;
}

function effectsOf(player: Researched): readonly TechEffect[] {
  return cacheOf(player).effects;
}

function hasMeleeAttack(type: UnitType): boolean {
  return type !== 'villager' && UNIT_BALANCE[type].meleeAtk > 0;
}

/** Bonuses of the researched techs for one unit type. */
export function unitBonuses(player: Researched, unitType: UnitType): UnitBonuses {
  const cache = cacheOf(player);
  let cached = cache.units.get(unitType);
  if (!cached) {
    // Shared by every unit of the type: frozen so no caller can change them for all.
    cached = Object.freeze(computeUnitBonuses(cache.effects, unitType));
    cache.units.set(unitType, cached);
  }
  return cached;
}

function computeUnitBonuses(effects: readonly TechEffect[], unitType: UnitType): UnitBonuses {
  let meleeAtk = 0;
  let pierceAtk = 0;
  let meleeDef = 0;
  let pierceDef = 0;
  let speedMultiplier = 1;
  let hpMultiplier = 1;
  for (const e of effects) {
    switch (e.kind) {
      case 'attack':
        if (e.attack === 'melee' && hasMeleeAttack(unitType)) meleeAtk += e.bonus;
        if (e.attack === 'pierce' && ARROW_UNITS.includes(unitType)) pierceAtk += e.bonus;
        break;
      case 'armor':
        if (e.armor === 'melee') meleeDef += e.bonus;
        else pierceDef += e.bonus;
        break;
      case 'infantrySpeed':
        if (INFANTRY_CLASS.includes(unitType)) speedMultiplier *= 1 + e.bonus;
        break;
      case 'cavalryHp':
        if (CAVALRY_CLASS.includes(unitType)) hpMultiplier *= 1 + e.bonus;
        break;
      case 'cavalrySpeed':
        if (CAVALRY_CLASS.includes(unitType)) speedMultiplier *= 1 + e.bonus;
        break;
      case 'stableHp':
        if (UNIT_BALANCE[baseUnitType(unitType)].trainers.includes('stable')) hpMultiplier *= 1 + e.bonus;
        break;
      default:
        break;
    }
  }
  return { meleeAtk, pierceAtk, meleeDef, pierceDef, speedMultiplier, hpMultiplier };
}

/** Base balance stats of a unit type with the player's technologies applied. */
export function effectiveUnitStats(player: Researched, unitType: UnitType): EffectiveUnitStats {
  const base = UNIT_BALANCE[unitType];
  const b = unitBonuses(player, unitType);
  return {
    ...b,
    meleeAtk: base.meleeAtk + b.meleeAtk,
    pierceAtk: base.pierceAtk + b.pierceAtk,
    meleeDef: base.meleeDef + b.meleeDef,
    pierceDef: base.pierceDef + b.pierceDef,
    hp: Math.round(base.hp * b.hpMultiplier),
    speed: base.speed * b.speedMultiplier,
  };
}

/** Multiplier on the gather rate of `resource` (stacks multiplicatively). */
export function gatherMultiplier(player: Researched, resource: ResourceType): number {
  const cache = cacheOf(player);
  let m = cache.gather.get(resource);
  if (m === undefined) {
    m = 1;
    for (const e of cache.effects) {
      if (e.kind === 'gather' && e.resource === resource) m *= 1 + e.bonus;
    }
    cache.gather.set(resource, m);
  }
  return m;
}

/** A player's difficulty gather handicap (only the Hard AI has one, §10.3). */
export interface Handicapped {
  readonly gatherHandicap: number;
}

/**
 * Full gather-rate multiplier for one villager: the owner's technology
 * bonus (food bonuses only on farms) times its difficulty handicap, which
 * applies to every resource. The handicap speeds up gathering only; it
 * never grants resources or vision.
 */
export function gatherRateMultiplier(
  player: Researched & Handicapped,
  resource: ResourceType,
  techApplies: boolean,
): number {
  return (techApplies ? gatherMultiplier(player, resource) : 1) * player.gatherHandicap;
}

/** Extra population cap provided by every finished house. */
export function houseBonus(player: Researched): number {
  const cache = cacheOf(player);
  if (cache.house === undefined) {
    let bonus = 0;
    for (const e of effectsOf(player)) if (e.kind === 'houseCap') bonus += e.bonus;
    cache.house = bonus;
  }
  return cache.house;
}

/** Multiplier on the maximum HP of newly placed buildings. */
export function buildingHpMultiplier(player: Researched): number {
  const cache = cacheOf(player);
  if (cache.buildingHp === undefined) {
    let m = 1;
    for (const e of cache.effects) if (e.kind === 'buildingHp') m *= 1 + e.bonus;
    cache.buildingHp = m;
  }
  return cache.buildingHp;
}

/** Multiplier on the build time contributed by each builder. */
export function buildSpeedMultiplier(player: Researched): number {
  const cache = cacheOf(player);
  if (cache.buildSpeed === undefined) {
    let m = 1;
    for (const e of cache.effects) if (e.kind === 'buildSpeed') m *= 1 + e.bonus;
    cache.buildSpeed = m;
  }
  return cache.buildSpeed;
}

/** Scales current and max HP by `factor`, keeping the health ratio. */
export function scaleHealth(health: { current: number; max: number }, factor: number): void {
  if (factor === 1 || health.max <= 0) return;
  const max = Math.round(health.max * factor);
  if (health.current > 0) health.current = Math.max(1, Math.round((health.current * max) / health.max));
  health.max = max;
}

/** Minimal view of an entity for bonus lookup (avoids a dependency on the ECS types). */
interface BonusSubject {
  readonly unit?: { readonly unitType: UnitType };
  readonly owner?: { readonly playerId: number };
}

/** Bonuses of a unit entity's owner; no bonuses for buildings, Gaia or unknown players. */
export function bonusesFor(
  players: { get(id: number): Researched | undefined } | null,
  entity: BonusSubject,
): UnitBonuses {
  if (!players || !entity.unit || !entity.owner) return NO_BONUS;
  const player = players.get(entity.owner.playerId);
  return player ? unitBonuses(player, entity.unit.unitType) : NO_BONUS;
}

/** Attack payload with the attack bonuses added. */
export function boostAttack<T extends { meleeAtk: number; pierceAtk: number }>(attack: T, b: UnitBonuses): T {
  if (b.meleeAtk === 0 && b.pierceAtk === 0) return attack;
  return { ...attack, meleeAtk: attack.meleeAtk + b.meleeAtk, pierceAtk: attack.pierceAtk + b.pierceAtk };
}

/** Armour with the defence bonuses added. */
export function boostArmor(armor: { melee: number; pierce: number }, b: UnitBonuses): { melee: number; pierce: number } {
  if (b.meleeDef === 0 && b.pierceDef === 0) return armor;
  return { melee: armor.melee + b.meleeDef, pierce: armor.pierce + b.pierceDef };
}
