import type { GameSetupConfig } from '../game/GameSetupConfig';
import { MODE_DEFAULTS } from '../game/matchModes';
import type { AgeId, Resources } from '../types';
import type { Objective } from './objectives';

/** The campaign's missions, in play order (M13). */
export const MISSION_IDS = ['first_monastery', 'border_guards', 'age_of_wonders'] as const;
export type MissionId = (typeof MISSION_IDS)[number];

export interface MissionDef {
  readonly id: MissionId;
  /** The match (fixed: the player does not change it). */
  readonly setup: Omit<GameSetupConfig, 'mission'>;
  /** Start state on top of a regular start: every player's age, and the human's extra stock. */
  readonly start: { readonly age?: AgeId; readonly bonus?: Resources };
  readonly objectives: readonly Objective[];
}

const MIN = 60_000;

/**
 * The three missions (CLAUDE.md §9 M13). Texts (title, briefing, closing)
 * live in hu.ts under campaign.missions.
 */
export const MISSIONS: Readonly<Record<MissionId, MissionDef>> = {
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

/** The match setup of a mission (tagged with the mission). */
export function missionSetup(id: MissionId): GameSetupConfig {
  return { ...MISSIONS[id].setup, mission: id };
}

/** The mission after `id`, or null after the last. */
export function nextMission(id: MissionId): MissionId | null {
  return MISSION_IDS[MISSION_IDS.indexOf(id) + 1] ?? null;
}
