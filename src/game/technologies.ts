import { TECH_BALANCE } from '../config/balance';
import type { AgeId, BuildingType, Resources, TechId } from '../types';

/** What a technology does once researched. */
export type TechEffect = { readonly kind: 'age'; readonly age: AgeId };

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

export const TECH_SPECS: Record<TechId, TechSpec> = {
  feudalism: {
    id: 'feudalism',
    building: 'town_center',
    requiredAge: 1,
    prerequisites: [],
    ...TECH_BALANCE.feudalism,
    effect: { kind: 'age', age: 2 },
  },
  enlightenment: {
    id: 'enlightenment',
    building: 'town_center',
    requiredAge: 2,
    prerequisites: ['feudalism'],
    ...TECH_BALANCE.enlightenment,
    effect: { kind: 'age', age: 3 },
  },
};

/** Technologies researched at the given building type, in table order. */
export function techsForBuilding(type: BuildingType): TechId[] {
  return (Object.keys(TECH_SPECS) as TechId[]).filter((id) => TECH_SPECS[id].building === type);
}

/** True for technologies that advance the player's age. */
export function isAgeUp(id: TechId): boolean {
  return TECH_SPECS[id].effect.kind === 'age';
}
