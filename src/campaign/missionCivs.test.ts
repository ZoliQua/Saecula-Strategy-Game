import { describe, expect, it } from 'vitest';
import { matchCivs } from '../game/GameSetupConfig';
import { SCENARIO_IDS, missionSetup } from './missions';

/**
 * M21: the mixed civ draw of every campaign scenario, recorded on `main`
 * before the Polish and Ottoman civs joined (missions draw from CLASSIC_CIVS),
 * so every mission plays bit-for-bit as before.
 */
const RECORDED = {
  tutorial: { human: 'hungarian', ais: ['english'] },
  first_monastery: { human: 'hungarian', ais: ['english'] },
  border_guards: { human: 'english', ais: ['german', 'german'] },
  age_of_wonders: { human: 'italian', ais: ['spanish', 'english'] },
  new_shores: { human: 'spanish', ais: ['french'] },
  hansa_roads: { human: 'german', ais: ['french', 'italian', 'russian'] },
  kings_head: { human: 'french', ais: ['german', 'finnish'] },
  hill_rush: { human: 'russian', ais: ['finnish'] },
  wonder_race: { human: 'finnish', ais: ['hungarian'] },
  last_stand: { human: 'hungarian', ais: ['finnish', 'russian'] },
} as const;

describe('campaign civ line-ups (M21)', () => {
  it('records every scenario', () => {
    expect(Object.keys(RECORDED).sort()).toEqual([...SCENARIO_IDS].sort());
  });

  it.each(SCENARIO_IDS)('%s draws the same civs as before M21', (id) => {
    expect(matchCivs(missionSetup(id))).toEqual(RECORDED[id]);
  });
});
