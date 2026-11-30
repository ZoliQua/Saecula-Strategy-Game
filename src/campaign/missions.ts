import type { GameSetupConfig } from '../game/GameSetupConfig';
import { MODE_DEFAULTS } from '../game/matchModes';
import type { AgeId, Resources } from '../types';
import type { Objective } from './objectives';

/** The campaign's missions, in play order (M13). */
export const MISSION_IDS = ['first_monastery', 'border_guards', 'age_of_wonders'] as const;
export type MissionId = (typeof MISSION_IDS)[number];

/** The step-by-step tutorial (M18): outside the campaign chain (never locks or unlocks a mission). */
export const TUTORIAL_ID = 'tutorial';
/** Every scenario a match can run: the tutorial and the campaign missions (saves keep it in setup.mission). */
export const SCENARIO_IDS = [TUTORIAL_ID, ...MISSION_IDS] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

/** The tutorial's damaged house starts at this fraction of its HP. */
export const DAMAGED_HOUSE_HP_FRACTION = 0.5;

export interface MissionDef {
  readonly id: ScenarioId;
  /** The match (fixed: the player does not change it). */
  readonly setup: Omit<GameSetupConfig, 'mission'>;
  /**
   * Start state on top of a regular start: every player's age, the human's
   * extra stock, and (tutorial) a finished house of the human next to its
   * town centre at DAMAGED_HOUSE_HP_FRACTION of its HP.
   */
  readonly start: { readonly age?: AgeId; readonly bonus?: Resources; readonly damagedHouse?: boolean };
  readonly objectives: readonly Objective[];
  /** The objectives come one at a time, in order (M18 tutorial; ObjectiveTracker). */
  readonly sequential?: boolean;
}

const MIN = 60_000;
/** The tutorial's fixed map seed (a small meadow with forest and berries near the human's town centre). */
const TUTORIAL_SEED = 1801;

/**
 * The three missions (CLAUDE.md §9 M13). Texts (title, briefing, closing)
 * live in hu.ts under campaign.missions.
 */
export const MISSIONS: Readonly<Record<ScenarioId, MissionDef>> = {
  tutorial: {
    id: TUTORIAL_ID,
    setup: { template: 'meadow', mapSize: 'small', aiCount: 1, difficulty: 'easy', civ: 'hungarian', aiCivs: 'english', seed: TUTORIAL_SEED, victory: 'conquest', ...MODE_DEFAULTS, treatyMin: 20 },
    start: { damagedHouse: true },
    sequential: true,
    objectives: [
      { kind: 'gathered', resource: 'wood', amount: 100 },
      { kind: 'ownBuildings', building: 'house', count: 2 },
      { kind: 'gathered', resource: 'food', amount: 100 },
      { kind: 'ownUnits', unit: 'villager', count: 6 },
      { kind: 'ownBuildings', building: 'barracks', count: 1 },
      { kind: 'ownUnits', unit: 'swordsman', count: 3 },
      { kind: 'repaired', count: 1 },
      { kind: 'reachAge', age: 2 },
    ],
  },
  first_monastery: {
    id: 'first_monastery',
    setup: { template: 'meadow', mapSize: 'small', aiCount: 1, difficulty: 'easy', civ: 'hungarian', aiCivs: 'english', seed: 1101, victory: 'conquest', ...MODE_DEFAULTS },
    start: {},
    objectives: [
      { kind: 'reachAge', age: 2 },
      { kind: 'ownBuildings', building: 'monastery', count: 1 },
      { kind: 'ownUnits', unit: 'monk', count: 2 },
    ],
  },
  border_guards: {
    id: 'border_guards',
    setup: { template: 'fortress', mapSize: 'medium', aiCount: 2, difficulty: 'medium', civ: 'english', aiCivs: 'german', seed: 2202, victory: 'conquest', ...MODE_DEFAULTS },
    start: { age: 2, bonus: { food: 200, wood: 400, gold: 500 } },
    objectives: [
      { kind: 'survive', ms: 20 * MIN },
      { kind: 'ownBuildings', building: 'tower', count: 4 },
    ],
  },
  age_of_wonders: {
    id: 'age_of_wonders',
    setup: { template: 'islands', mapSize: 'medium', aiCount: 2, difficulty: 'hard', civ: 'italian', aiCivs: 'mixed', seed: 3303, victory: 'conquest_wonder', ...MODE_DEFAULTS },
    start: { age: 3, bonus: { food: 1000, wood: 1000, gold: 800 } },
    objectives: [{ kind: 'winMatch' }],
  },
};

/** The match setup of a mission or the tutorial (tagged with its id). */
export function missionSetup(id: ScenarioId): GameSetupConfig {
  return { ...MISSIONS[id].setup, mission: id };
}

/** The mission after `id`, or null after the last. */
export function nextMission(id: MissionId): MissionId | null {
  return MISSION_IDS[MISSION_IDS.indexOf(id) + 1] ?? null;
}
