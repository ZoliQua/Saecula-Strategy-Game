import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { buildingRequiredAge, techRequiredAge, unitRequiredAge } from '../../game/availability';
import { isAgeUp, TECH_SPECS } from '../../game/technologies';
import { AGES, type AgeId, type BuildingType, type CivId, type Resources, type TechId, type UnitType } from '../../types';

/** Where an age stands for the player: reached before, the age now, or not yet reached. */
export type AgeState = 'past' | 'current' | 'locked';

export interface TreeBuilding {
  readonly type: BuildingType;
  readonly cost: Resources;
  /** Seconds with one builder. */
  readonly buildTime: number;
}

export interface TreeUnit {
  readonly type: UnitType;
  readonly cost: Resources;
  readonly trainTime: number;
  /** The earliest-unlocked building that trains it (the diagram's connector). */
  readonly trainedAt: BuildingType;
  /** Its other trainers, in unlock order. */
  readonly alsoAt: readonly BuildingType[];
}

/** One trainer in a column and the units of that column it trains. */
export interface TreeTrainer {
  readonly building: BuildingType;
  /** The age the building itself unlocks in (it may be an earlier column's). */
  readonly unlockedIn: AgeId;
  readonly units: readonly TreeUnit[];
}

export interface TreeTech {
  readonly id: TechId;
  readonly building: BuildingType;
  readonly cost: Resources;
  readonly time: number;
  readonly researched: boolean;
}

/** The step into an age: the town centre's age-up technology. */
export interface AgeEntry {
  readonly tech: TechId;
  readonly cost: Resources;
  readonly time: number;
}

export interface TreeColumn {
  readonly age: AgeId;
  readonly state: AgeState;
  /** Null for the first age (the match starts in it). */
  readonly entry: AgeEntry | null;
  /** Buildings first available in this age. */
  readonly buildings: readonly TreeBuilding[];
  /** Units first available in this age. */
  readonly units: readonly TreeUnit[];
  /** The same units, grouped under their trainer, in unlock order. */
  readonly trainers: readonly TreeTrainer[];
  /** Technologies (not the age-ups) first researchable in this age. */
  readonly techs: readonly TreeTech[];
}

export interface TechTreeModel {
  /** The human's civ: it sets the pictures only, the stats are the same for every civ. */
  readonly civ: CivId;
  readonly currentAge: AgeId;
  readonly columns: readonly TreeColumn[];
}

const BUILDINGS = Object.keys(BUILDING_SPECS) as BuildingType[];
const UNITS = Object.keys(UNIT_SPECS) as UnitType[];
const TECHS = Object.keys(TECH_SPECS) as TechId[];

/** Table order, made stable by unlock age (a sort is stable). */
const byUnlock = (a: BuildingType, b: BuildingType): number => buildingRequiredAge(a) - buildingRequiredAge(b);

function treeUnit(type: UnitType): TreeUnit {
  const spec = UNIT_SPECS[type];
  const [trainedAt, ...alsoAt] = [...spec.trainers].sort(byUnlock);
  if (!trainedAt) throw new Error(`techTreeModel: ${type} has no trainer`);
  return { type, cost: spec.cost, trainTime: spec.trainTime, trainedAt, alsoAt };
}

function entryInto(age: AgeId): AgeEntry | null {
  const tech = TECHS.find((id) => {
    const effect = TECH_SPECS[id].effect;
    return effect.kind === 'age' && effect.age === age;
  });
  if (!tech) return null;
  return { tech, cost: TECH_SPECS[tech].cost, time: TECH_SPECS[tech].time };
}

function trainersOf(units: readonly TreeUnit[]): TreeTrainer[] {
  const order = [...new Set(units.map((u) => u.trainedAt))].sort(byUnlock);
  return order.map((building) => ({
    building,
    unlockedIn: buildingRequiredAge(building),
    units: units.filter((u) => u.trainedAt === building),
  }));
}

/**
 * The tech tree card's content (M7 Decision 7): one column per age with
 * the buildings, units (under the building that trains each) and
 * technologies it unlocks, and the cost of the age-up into it. Built
 * from the balance tables (BUILDING_SPECS, UNIT_SPECS, TECH_SPECS and
 * availability), so it never disagrees with the game.
 */
export function techTreeModel(civ: CivId, age: AgeId, researched: ReadonlySet<TechId> = new Set()): TechTreeModel {
  const columns = AGES.map(({ id }): TreeColumn => {
    const units = UNITS.filter((t) => unitRequiredAge(t) === id).map(treeUnit);
    return {
      age: id,
      state: id === age ? 'current' : id < age ? 'past' : 'locked',
      entry: entryInto(id),
      buildings: BUILDINGS.filter((t) => buildingRequiredAge(t) === id).map((type) => ({
        type,
        cost: BUILDING_SPECS[type].cost,
        buildTime: BUILDING_SPECS[type].buildTime,
      })),
      units,
      trainers: trainersOf(units),
      techs: TECHS.filter((t) => !isAgeUp(t) && techRequiredAge(t) === id).map((t) => ({
        id: t,
        building: TECH_SPECS[t].building,
        cost: TECH_SPECS[t].cost,
        time: TECH_SPECS[t].time,
        researched: researched.has(t),
      })),
    };
  });
  return { civ, currentAge: age, columns };
}
