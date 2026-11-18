import { describe, expect, it } from 'vitest';
import { createHeadlessMatch } from '../../ai/testing/headlessMatch';
import { EasyStrategy } from '../../ai/strategies/EasyStrategy';
import { missionSetup } from '../../campaign/missions';
import { START_RESOURCES } from '../../config/balance';
import { createRng } from '../../map/random';
import { uiStore } from '../../ui/store';
import { prepareMatch } from './MatchStart';

/* M16 starting resources: every player of a new skirmish starts with the setup's preset. */
describe('starting resources from the setup', () => {
  it('a new skirmish gives every player the chosen preset (own copies)', () => {
    const prepared = prepareMatch({ seed: 7, mapSize: 'small', aiCount: 2, startResources: 'high' });
    if (!prepared.ok) throw new Error('did not prepare');
    const { players, setup } = prepared.match;
    expect(setup.startResources).toBe('high');
    for (const p of players.all()) expect(p.resources).toEqual(START_RESOURCES.high);
    const [a, b] = players.all();
    a!.resources.food = 1;
    expect(b!.resources.food).toBe(2000);
    expect(START_RESOURCES.high.food).toBe(2000);
  });

  it('the default setup keeps today\'s 200 / 200 / 100', () => {
    const prepared = prepareMatch({ seed: 7, mapSize: 'small', aiCount: 1 });
    if (!prepared.ok) throw new Error('did not prepare');
    for (const p of prepared.match.players.all()) expect(p.resources).toEqual({ food: 200, wood: 200, gold: 100 });
  });

  it('a campaign mission keeps the normal preset plus its bonus', () => {
    const setup = missionSetup('age_of_wonders');
    expect(setup).toMatchObject({ allies: 0, treatyMin: 0, startResources: 'normal', speed: 1 });
    const prepared = prepareMatch(setup);
    if (!prepared.ok) throw new Error('did not prepare');
    const human = prepared.match.players.human()!;
    expect(human.resources.food).toBeGreaterThanOrEqual(START_RESOURCES.normal.food);
    for (const ai of prepared.match.players.ais()) expect(ai.resources).toEqual(START_RESOURCES.normal);
  });

  it('a headless match takes the mode options into its setup, its players and the UI store', () => {
    const match = createHeadlessMatch({
      seed: 3,
      size: 64,
      aiCount: 2,
      strategy: () => new EasyStrategy(createRng(1)),
      allies: 5,
      treatyMin: 10,
      startResources: 'deathmatch',
      speed: 2,
    });
    expect(match.setup).toMatchObject({ allies: 1, treatyMin: 10, startResources: 'deathmatch', speed: 2 });
    for (const p of match.players.all()) expect(p.resources).toEqual(START_RESOURCES.deathmatch);
    expect(uiStore.getState().resources).toEqual(START_RESOURCES.deathmatch);
    const plain = createHeadlessMatch({ seed: 3, size: 64, aiCount: 2, strategy: () => new EasyStrategy(createRng(1)) });
    expect(plain.setup).toMatchObject({ allies: 0, treatyMin: 0, startResources: 'normal', speed: 1 });
    expect(uiStore.getState().resources).toEqual(START_RESOURCES.normal);
  });
});
