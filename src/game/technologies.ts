import { TECH_BALANCE } from '../config/balance';
import type { AgeId, BuildingType, ResourceType, Resources, TechId } from '../types';

/** What a technology does once researched. */
export type TechEffect =
  | { readonly kind: 'age'; readonly age: AgeId }
  /** + attack points for every melee unit (not villagers) or every arrow unit. */
  | { readonly kind: 'attack'; readonly attack: 'melee' | 'pierce'; readonly bonus: number }
  /** + armour points for every unit. */
  | { readonly kind: 'armor'; readonly armor: 'melee' | 'pierce'; readonly bonus: number }
  /** + fraction on the gather rate (food: farms only). */
  | { readonly kind: 'gather'; readonly resource: ResourceType; readonly bonus: number }
  /** + population cap points per finished house. */
  | { readonly kind: 'houseCap'; readonly bonus: number }
  /** + fraction on the speed of the infantry class. */
  | { readonly kind: 'infantrySpeed'; readonly bonus: number }
  /** + fraction on the HP of the cavalry class. */
  | { readonly kind: 'cavalryHp'; readonly bonus: number }
  /** + fraction on the speed of the cavalry class (civ bonus). */
  | { readonly kind: 'cavalrySpeed'; readonly bonus: number }
  /** + fraction on the HP of units trained at the stable, at spawn (civ bonus). */
  | { readonly kind: 'stableHp'; readonly bonus: number }
  /** + fraction on the maximum HP of new buildings (civ bonus). */
  | { readonly kind: 'buildingHp'; readonly bonus: number }
  /** + fraction on builder speed (civ bonus). */
  | { readonly kind: 'buildSpeed'; readonly bonus: number };

export interface TechSpec {
  readonly id: TechId;
  /** Building the technology is researched at. */
  readonly building: BuildingType;
  /** Player age needed to start the research. */
  readonly requiredAge: AgeId;
  readonly prerequisites: readonly TechId[];
  readonly cost: Resources;
  /** Seconds. */
  readonly time: number;
  readonly effect: TechEffect;
}

function tech(
  id: TechId,
  building: BuildingType,
  requiredAge: AgeId,
  prerequisites: readonly TechId[],
  effect: (value: number) => TechEffect,
): TechSpec {
  const b = TECH_BALANCE[id];
  return { id, building, requiredAge, prerequisites, cost: b.cost, time: b.time, effect: effect(b.value ?? 0) };
}

const attack = (kind: 'melee' | 'pierce') => (bonus: number): TechEffect => ({ kind: 'attack', attack: kind, bonus });
const armor = (kind: 'melee' | 'pierce') => (bonus: number): TechEffect => ({ kind: 'armor', armor: kind, bonus });
const gather = (resource: ResourceType) => (bonus: number): TechEffect => ({ kind: 'gather', resource, bonus });

const SPECS: TechSpec[] = [
  tech('feudalism', 'town_center', 1, [], () => ({ kind: 'age', age: 2 })),
  tech('enlightenment', 'town_center', 2, ['feudalism'], () => ({ kind: 'age', age: 3 })),
  tech('blade_sharpening_1', 'blacksmith', 2, [], attack('melee')),
  tech('blade_sharpening_2', 'blacksmith', 3, ['blade_sharpening_1'], attack('melee')),
  tech('arrow_sharpening_1', 'blacksmith', 2, [], attack('pierce')),
  tech('arrow_sharpening_2', 'blacksmith', 3, ['arrow_sharpening_1'], attack('pierce')),
  tech('armor_1', 'blacksmith', 2, [], armor('melee')),
  tech('armor_2', 'blacksmith', 3, ['armor_1'], armor('melee')),
  tech('shield_1', 'blacksmith', 2, [], armor('pierce')),
  tech('shield_2', 'blacksmith', 3, ['shield_1'], armor('pierce')),
  tech('double_saw', 'lumber_camp', 1, [], gather('wood')),
  tech('two_man_saw', 'lumber_camp', 2, ['double_saw'], gather('wood')),
  tech('steam_saw', 'lumber_camp', 3, ['two_man_saw'], gather('wood')),
  tech('gold_mining_1', 'mining_camp', 1, [], gather('gold')),
  tech('gold_mining_2', 'mining_camp', 2, ['gold_mining_1'], gather('gold')),
  tech('deep_mining', 'mining_camp', 3, ['gold_mining_2'], gather('gold')),
  tech('crop_rotation', 'farm', 1, [], gather('food')),
  tech('heavy_plow', 'farm', 2, ['crop_rotation'], gather('food')),
  tech('mechanized_harvest', 'farm', 3, ['heavy_plow'], gather('food')),
  // Houses cannot research, so the house technology lives at the town centre.
  tech('artisan_guilds', 'town_center', 2, [], (bonus) => ({ kind: 'houseCap', bonus })),
  tech('infantry_march', 'barracks', 2, [], (bonus) => ({ kind: 'infantrySpeed', bonus })),
  tech('cavalry_training', 'barracks', 2, [], (bonus) => ({ kind: 'cavalryHp', bonus })),
];

export const TECH_SPECS = Object.fromEntries(SPECS.map((s) => [s.id, s])) as Record<TechId, TechSpec>;

/** Technologies researched at the given building type, in table order. */
export function techsForBuilding(type: BuildingType): TechId[] {
  return (Object.keys(TECH_SPECS) as TechId[]).filter((id) => TECH_SPECS[id].building === type);
}

/** True for technologies that advance the player's age. */
export function isAgeUp(id: TechId): boolean {
  return TECH_SPECS[id].effect.kind === 'age';
}
