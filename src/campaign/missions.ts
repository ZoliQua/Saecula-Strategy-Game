import type { GameSetupConfig } from '../game/GameSetupConfig';
import { MODE_DEFAULTS } from '../game/matchModes';
import type { AgeId, Resources } from '../types';
import type { Objective } from './objectives';

/** The campaign's missions, in play order: chapter 1 (M13), then chapter 2 (M20). */
export const MISSION_IDS = ['first_monastery', 'border_guards', 'age_of_wonders', 'new_shores', 'hansa_roads', 'kings_head'] as const;
export type MissionId = (typeof MISSION_IDS)[number];

/** The campaign's chapters (M20), each a run of MISSION_IDS in order. */
export const CHAPTERS: readonly (readonly MissionId[])[] = [
  ['first_monastery', 'border_guards', 'age_of_wonders'],
  ['new_shores', 'hansa_roads', 'kings_head'],
];

/** The short scenarios (M20): outside the chain, always available, never lock or unlock anything. */
export const SHORT_IDS = ['hill_rush', 'wonder_race', 'last_stand'] as const;
export type ShortId = (typeof SHORT_IDS)[number];

/** The step-by-step tutorial (M18): outside the campaign chain (never locks or unlocks a mission). */
export const TUTORIAL_ID = 'tutorial';
/** Every scenario a match can run: the tutorial and the campaign missions (saves keep it in setup.mission). */
export const SCENARIO_IDS = [TUTORIAL_ID, ...MISSION_IDS, ...SHORT_IDS] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

/** Whether `id` is one of the short scenarios (M20). */
export function isShort(id: ScenarioId): id is ShortId {
  return (SHORT_IDS as readonly ScenarioId[]).includes(id);
}

/** Whether `id` is a mission of the campaign chain. */
export function isChainMission(id: ScenarioId): id is MissionId {
  return (MISSION_IDS as readonly ScenarioId[]).includes(id);
}

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
 * The tutorial, the six chain missions (CLAUDE.md §9 M13, M20) and the short scenarios (M20). Texts (title, briefing, closing)
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
      { kind: 'built', building: 'house', count: 1 },
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
  new_shores: {
    id: 'new_shores',
    setup: { template: 'archipelago', mapSize: 'medium', aiCount: 1, difficulty: 'medium', civ: 'spanish', aiCivs: 'french', seed: 4404, victory: 'conquest', ...MODE_DEFAULTS },
    start: {},
    objectives: [
      { kind: 'ownBuildings', building: 'dock', count: 1 },
      { kind: 'ownUnits', unit: 'fishing_boat', count: 3 },
      { kind: 'ownUnits', unit: 'galley', count: 2 },
      { kind: 'reachAge', age: 2 },
    ],
  },
  hansa_roads: {
    id: 'hansa_roads',
    setup: { template: 'meadow', mapSize: 'medium', aiCount: 3, difficulty: 'medium', civ: 'german', aiCivs: 'mixed', seed: 5505, victory: 'conquest', ...MODE_DEFAULTS, allies: 1, treatyMin: 20 },
    start: { age: 2, bonus: { food: 300, wood: 500, gold: 200 } },
    objectives: [
      { kind: 'ownBuildings', building: 'market', count: 1 },
      { kind: 'ownBuildings', building: 'landmark', count: 1 },
      { kind: 'ownUnits', unit: 'trade_cart', count: 3 },
      { kind: 'gathered', resource: 'gold', amount: 2000 },
    ],
  },
  kings_head: {
    id: 'kings_head',
    setup: { template: 'wilderness', mapSize: 'medium', aiCount: 2, difficulty: 'hard', civ: 'french', aiCivs: 'mixed', seed: 6606, victory: 'regicide', ...MODE_DEFAULTS },
    start: { age: 2, bonus: { food: 600, wood: 600, gold: 400 } },
    objectives: [{ kind: 'winMatch' }],
  },
  hill_rush: {
    id: 'hill_rush',
    setup: { template: 'fortress', mapSize: 'small', aiCount: 1, difficulty: 'medium', civ: 'russian', aiCivs: 'mixed', seed: 7707, victory: 'hill', ...MODE_DEFAULTS },
    start: { age: 2, bonus: { food: 400, wood: 400, gold: 300 } },
    objectives: [{ kind: 'winMatch' }],
  },
  wonder_race: {
    id: 'wonder_race',
    setup: { template: 'meadow', mapSize: 'small', aiCount: 1, difficulty: 'medium', civ: 'finnish', aiCivs: 'mixed', seed: 8808, victory: 'conquest_wonder', ...MODE_DEFAULTS },
    start: { age: 3, bonus: { food: 1000, wood: 1200, gold: 800 } },
    objectives: [{ kind: 'ownBuildings', building: 'wonder', count: 1 }],
  },
  last_stand: {
    id: 'last_stand',
    setup: { template: 'fortress', mapSize: 'small', aiCount: 2, difficulty: 'hard', civ: 'hungarian', aiCivs: 'mixed', seed: 9909, victory: 'conquest', ...MODE_DEFAULTS },
    start: { age: 2, bonus: { food: 300, wood: 600, gold: 400 } },
    objectives: [{ kind: 'survive', ms: 15 * MIN }],
  },
};

/** The match setup of a mission or the tutorial (tagged with its id). */
export function missionSetup(id: ScenarioId): GameSetupConfig {
  return { ...MISSIONS[id].setup, mission: id };
}

/** The chain mission after `id`, or null after the last. */
export function nextMission(id: MissionId): MissionId | null {
  return MISSION_IDS[MISSION_IDS.indexOf(id) + 1] ?? null;
}
