import { describe, expect, it } from 'vitest';
import { missionSetup } from '../../campaign/missions';
import { createHeadlessMatch } from '../../ai/testing/headlessMatch';
import { EasyStrategy } from '../../ai/strategies/EasyStrategy';
import { createRng } from '../../map/random';
import { prepareMatch } from './MatchStart';
import { restoredBuildingArt, type RestoredBuildingArt } from './restoredArt';

/*
 * A mission that starts past age 1 (M13, mission 3 starts in age 3) loads
 * the art of the age its players are in, like a loaded save (an age span
 * per civ), not the age-1 art a new skirmish paints.
 */
describe('mission start art', () => {
  it('a mission started in age 3 paints each civ for age 3 and its town centres in their owners age style', () => {
    const prepared = prepareMatch(missionSetup('age_of_wonders'));
    if (!prepared.ok) throw new Error('mission 3 did not prepare');
    const { art, players } = prepared.match;
    expect(art).toBeDefined();
    for (const p of players.all()) expect(art!.spans.get(p.civ), p.civ).toEqual({ min: 3, max: 3 });
    const tcs = art!.buildings.filter((b) => b.kind === 'building' && b.type === 'town_center');
    expect(tcs.map((b) => (b.kind === 'building' ? [b.owner, b.age] : null))).toEqual(players.all().map((p) => [p.id, 3]));
  });

  it('a mission started in age 1 (and a skirmish) keeps the regular new-match plan', () => {
    const m1 = prepareMatch(missionSetup('first_monastery'));
    expect(m1.ok && m1.match.art).toBeUndefined();
  });

  it('the planned start art covers every building the match actually spawns (as a loaded save would list them)', () => {
    const prepared = prepareMatch(missionSetup('age_of_wonders'));
    if (!prepared.ok) throw new Error('mission 3 did not prepare');
    const match = createHeadlessMatch({ mission: 'age_of_wonders', seed: 3303, size: 96, aiCount: 2, strategy: () => new EasyStrategy(createRng(1)) });
    const spawned = restoredBuildingArt(match.world.entities, (id) => match.players.get(id)?.age ?? 1, (id) => match.players.get(id)?.civ ?? 'hungarian');
    const key = (b: RestoredBuildingArt) => (b.kind === 'building' ? `${b.type}@${b.age}:${b.owner}` : `stage${b.stage}`);
    expect(new Set(prepared.match.art!.buildings.map(key))).toEqual(new Set(spawned.map(key)));
  });
});

