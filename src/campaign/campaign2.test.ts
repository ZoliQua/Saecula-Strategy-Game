import { describe, expect, it } from 'vitest';
import { createEcsWorld } from '../ecs/world';
import { victoryAllowed, withSetup } from '../game/GameSetupConfig';
import { createPlayers } from '../game/PlayerManager';
import { GameSetupConfigSchema } from '../save/schema';
import { CampaignRunner } from '../scenes/game/CampaignRunner';
import { campaignSections, scenarioKicker } from '../ui/screens/campaignRows';
import { CHAPTERS, isChainMission, isShort, MISSION_IDS, MISSIONS, missionSetup, SCENARIO_IDS, SHORT_IDS, TUTORIAL_ID, type ScenarioId } from './missions';
import { objectiveText, scenarioObjectiveText } from './objectiveText';
import { CAMPAIGN_KEY, CampaignProgress, type MissionStatus, type ProgressStorage } from './progress';

function memory(initial: Record<string, string> = {}): ProgressStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

const NEW_IDS: readonly ScenarioId[] = ['new_shores', 'hansa_roads', 'kings_head', 'hill_rush', 'wonder_race', 'last_stand'];

describe('M20 scenarios', () => {
  it('two chapters cover the chain in order; the short scenarios are outside it', () => {
    expect(CHAPTERS.flat()).toEqual([...MISSION_IDS]);
    expect(CHAPTERS.map((c) => c.length)).toEqual([3, 3]);
    expect(SHORT_IDS.every((id) => isShort(id) && !isChainMission(id))).toBe(true);
    expect(MISSION_IDS.every((id) => isChainMission(id) && !isShort(id))).toBe(true);
    expect(isShort(TUTORIAL_ID) || isChainMission(TUTORIAL_ID)).toBe(false);
    expect(new Set(SCENARIO_IDS).size).toBe(SCENARIO_IDS.length);
  });

  it.each(NEW_IDS)('%s is a valid setup the save schema accepts, its victory mode allowed on its map', (id) => {
    const setup = missionSetup(id);
    expect(withSetup(setup, {})).toEqual(setup);
    expect(GameSetupConfigSchema.safeParse(setup).success).toBe(true);
    expect(victoryAllowed(setup.victory, setup.template)).toBe(true);
    expect(setup.allies).toBeLessThan(setup.aiCount);
  });

  it('the setups as designed: modes, teams, treaty, start ages and civs', () => {
    const pick = (id: ScenarioId) => {
      const s = missionSetup(id);
      return [s.civ, s.template, s.mapSize, s.aiCount, s.difficulty, s.victory, s.allies, s.treatyMin, MISSIONS[id].start.age ?? 1];
    };
    expect(pick('new_shores')).toEqual(['spanish', 'archipelago', 'medium', 1, 'medium', 'conquest', 0, 0, 1]);
    expect(pick('hansa_roads')).toEqual(['german', 'meadow', 'medium', 3, 'medium', 'conquest', 1, 20, 2]);
    expect(pick('kings_head')).toEqual(['french', 'wilderness', 'medium', 2, 'hard', 'regicide', 0, 0, 2]);
    expect(pick('hill_rush')).toEqual(['russian', 'fortress', 'small', 1, 'medium', 'hill', 0, 0, 2]);
    expect(pick('wonder_race')).toEqual(['finnish', 'meadow', 'small', 1, 'medium', 'conquest_wonder', 0, 10, 3]);
    expect(pick('last_stand')).toEqual(['hungarian', 'fortress', 'small', 2, 'hard', 'conquest', 0, 0, 2]);
  });
});

describe('M20 objective lines', () => {
  it('a winMatch line names the mission’s ways to win', () => {
    expect(objectiveText({ kind: 'winMatch' })).toBe('Nyerd meg a meccset (hódítás vagy Csoda)');
    expect(scenarioObjectiveText('age_of_wonders', 0)).toBe('Nyerd meg a meccset (hódítás vagy Csoda)');
    expect(scenarioObjectiveText('kings_head', 0)).toBe('Nyerd meg a meccset (királygyilkosság vagy hódítás)');
    expect(scenarioObjectiveText('hill_rush', 0)).toBe('Nyerd meg a meccset (a domb megtartása vagy hódítás)');
  });

  it('the landmark objective names the mission nation’s landmark', () => {
    expect(scenarioObjectiveText('hansa_roads', 1)).toBe('Építs fel: Hanza-kontor');
    expect(objectiveText({ kind: 'ownBuildings', building: 'landmark', count: 1 })).toBe('Építs fel: Egyedi épület');
    expect(scenarioObjectiveText('new_shores', 2)).toBe('Képezz 2 egységet: Gálya');
    expect(scenarioObjectiveText('last_stand', 0)).toBe('Tarts ki 15 percig (a városházád álljon)');
  });

  it('every new scenario has its texts and objective lines', () => {
    for (const id of NEW_IDS) {
      for (let i = 0; i < MISSIONS[id].objectives.length; i++) expect(scenarioObjectiveText(id, i).length, `${id} ${i}`).toBeGreaterThan(5);
    }
  });
});

describe('M20 progress', () => {
  it('chapter 2 unlocks in order after mission 3', () => {
    const store = memory({ [CAMPAIGN_KEY]: JSON.stringify({ completed: ['first_monastery', 'border_guards'] }) });
    const p = new CampaignProgress(store);
    expect(['age_of_wonders', 'new_shores', 'hansa_roads'].map((id) => p.status(id as ScenarioId))).toEqual(['available', 'locked', 'locked']);
    p.markCompleted('age_of_wonders');
    expect(p.status('new_shores')).toBe('available');
    p.markCompleted('new_shores');
    expect([p.status('hansa_roads'), p.status('kings_head')]).toEqual(['available', 'locked']);
  });

  it('short scenarios are always available, latch completed, and never unlock the chain', () => {
    const store = memory();
    const p = new CampaignProgress(store);
    expect(SHORT_IDS.map((id) => p.status(id))).toEqual(['available', 'available', 'available']);
    p.markCompleted('last_stand');
    p.markCompleted('hill_rush');
    p.markCompleted('hill_rush');
    expect(SHORT_IDS.map((id) => p.status(id))).toEqual(['completed', 'available', 'completed']);
    expect(MISSION_IDS.map((id) => p.status(id))).toEqual(['available', 'locked', 'locked', 'locked', 'locked', 'locked']);
    expect(JSON.parse(store.data[CAMPAIGN_KEY]!)).toEqual({ completed: [], shortDone: ['hill_rush', 'last_stand'] });
    p.markCompleted('first_monastery');
    p.markCompleted(TUTORIAL_ID);
    expect(JSON.parse(store.data[CAMPAIGN_KEY]!)).toEqual({ completed: ['first_monastery'], shortDone: ['hill_rush', 'last_stand'], tutorialDone: true });
  });

  it('older stored progress reads; an unknown short id is corrupt data (no progress)', () => {
    const old = new CampaignProgress(memory({ [CAMPAIGN_KEY]: JSON.stringify({ completed: ['first_monastery', 'border_guards', 'age_of_wonders'], tutorialDone: true }) }));
    expect(old.status('new_shores')).toBe('available');
    expect(old.status('wonder_race')).toBe('available');
    const bad = new CampaignProgress(memory({ [CAMPAIGN_KEY]: JSON.stringify({ completed: ['first_monastery'], shortDone: ['nope'] }) }));
    expect(bad.completed().size).toBe(0);
    expect(bad.shortDone().size).toBe(0);
  });

  it('winning a short scenario marks it completed and shows its closing text', () => {
    const progress = new CampaignProgress(memory());
    const run = new CampaignRunner(createEcsWorld(), createPlayers('hungarian', ['english', 'german']), 'last_stand', { progress, notify: () => undefined });
    expect(run.finish(true)).toContain('bástya');
    expect(progress.status('last_stand')).toBe('completed');
    expect(progress.status('border_guards')).toBe('locked');
  });
});

describe('M20 campaign list', () => {
  it('the tutorial untitled, then the two chapters numbered 1–6, then the short scenarios', () => {
    const status = (): MissionStatus => 'available';
    const sections = campaignSections(status);
    expect(sections.map((s) => s.title)).toEqual([null, 'I. fejezet · Rómától a felvilágosodásig', 'II. fejezet · Tengerek, kereskedők, királyok', 'Rövid küldetések · bármikor játszhatók']);
    expect(sections.map((s) => s.rows.map((r) => r.badge))).toEqual([['Okt.'], ['1', '2', '3'], ['4', '5', '6'], ['R1', 'R2', 'R3']]);
    expect(sections[3]!.rows.map((r) => r.title)).toEqual(['A domb', 'Versenyfutás a Csodáért', 'Az utolsó bástya']);
  });

  it('briefing kickers', () => {
    expect(scenarioKicker('kings_head')).toBe('6. küldetés');
    expect(scenarioKicker('wonder_race')).toBe('Rövid küldetés');
    expect(scenarioKicker(TUTORIAL_ID)).toBe('Oktató küldetés');
  });
});
