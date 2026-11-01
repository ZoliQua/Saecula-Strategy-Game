import { describe, expect, it } from 'vitest';
import { ObjectiveTracker } from '../../campaign/ObjectiveTracker';
import { MISSIONS, type MissionId } from '../../campaign/missions';
import { createBuilding } from '../../ecs/archetypes/building';
import { VictoryChecker } from '../../game/VictoryChecker';
import { tryGenerateGameMap } from '../../scenes/game/GameBootstrap';
import { missionSetup } from '../../campaign/missions';
import { createRng } from '../../map/random';
import { createHeadlessMatch, type HeadlessMatch } from '../testing/headlessMatch';
import { EasyStrategy } from './EasyStrategy';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';
import type { AIStrategy } from '../AIPlayer';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 300_000;
const SIZE = { small: 64, medium: 96, large: 128 } as const;

/** A mission match with an AI in the human slot (`human`) and `ai` for the AIs. */
function missionMatch(id: MissionId, human: AIStrategy, ai: (id: number) => AIStrategy): HeadlessMatch {
  const s = MISSIONS[id].setup;
  return createHeadlessMatch({
    mission: id,
    seed: s.seed,
    size: SIZE[s.mapSize],
    aiCount: s.aiCount,
    strategy: ai,
    difficulty: () => s.difficulty,
    humanStrategy: human,
    humanEnemy: () => 2,
  });
}

function track(match: HeadlessMatch, id: MissionId) {
  const tracker = new ObjectiveTracker(MISSIONS[id].objectives);
  const update = () => {
    const h = match.players.human()!;
    tracker.update({ entities: match.world.entities, humanId: h.id, humanAge: h.age, humanDefeated: h.defeated, timeMs: match.timeMs() });
  };
  return { tracker, update };
}

/*
 * M13: each mission's setup makes a playable map, and its objectives can be
 * met (an AI plays the human slot; it builds no towers, so mission 2's towers
 * are placed by the test once the 20 minutes are held).
 */
describe('campaign missions (M13)', () => {
  it('every mission seed makes a playable map', () => {
    for (const id of Object.keys(MISSIONS) as MissionId[]) expect(tryGenerateGameMap(missionSetup(id)), id).not.toBeNull();
  });

  it(
    'mission 1: a Medium player reaches age 2, builds a monastery and trains 2 monks; the mission is won',
    () => {
      const match = missionMatch('first_monastery', new MediumStrategy(createRng(11)), () => new EasyStrategy(createRng(4)));
      const { tracker, update } = track(match, 'first_monastery');
      // The objectives alone (the Medium player also conquers the Easy AI, which wins a mission too).
      match.run(40 * MIN, 100, (t) => {
        if (Math.round(t) % 1000 !== 0) return;
        update();
        return tracker.complete();
      });
      expect(tracker.done).toEqual([0, 1, 2]);
      expect(match.timeMs()).toBeLessThan(30 * MIN);
      expect(new VictoryChecker(match.world, match.players, null, null, tracker).check()).toMatchObject({ kind: 'victory', winnerId: 1 });
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'mission 2: a Hard player holds 20 minutes from age 2 against two Medium AIs; with 4 towers the mission is won',
    () => {
      const match = missionMatch('border_guards', new HardStrategy(createRng(7)), (id) => new MediumStrategy(createRng(id * 13)));
      expect(match.players.all().every((p) => p.age === 2)).toBe(true);
      const { tracker, update } = track(match, 'border_guards');
      match.run(20 * MIN, 100, (t) => {
        if (Math.round(t) % 1000 !== 0) return;
        update();
        return match.players.human()!.defeated;
      });
      expect(match.players.human()!.defeated).toBe(false);
      expect(tracker.done).toEqual([0]);
      // The AI builds no towers: place four finished ones next to the town centre.
      const tc = match.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 1)!;
      let placed = 0;
      for (let d = 4; placed < 4 && d < 20; d++) {
        for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]] as const) {
          const tx = tc.position!.tx + dx;
          const ty = tc.position!.ty + dy;
          if (placed < 4 && match.map.isPassable(tx, ty)) {
            createBuilding(match.world, { type: 'tower', origin: { tx, ty }, playerId: 1, mapData: match.map });
            placed++;
          }
        }
      }
      update();
      expect(tracker.complete()).toBe(true);
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'mission 3: everyone starts in the Enlightenment, the human with the bonus stock, and the match runs',
    () => {
      const match = missionMatch('age_of_wonders', new HardStrategy(createRng(5)), (id) => new HardStrategy(createRng(id * 17)));
      expect(match.players.all().map((p) => p.age)).toEqual([3, 3, 3]);
      expect(match.players.human()!.resources.gold).toBeGreaterThanOrEqual(800);
      match.run(5 * MIN, 100);
      expect(match.world.entities.some((e) => e.unit && e.owner?.playerId === 2 && ['musketeer', 'cannon', 'cavalry', 'mousquetaire', 'conquistador'].includes(e.unit.unitType)) ||
        match.world.entities.some((e) => e.building?.type === 'foundry')).toBe(true);
    },
    SIM_TIMEOUT_MS,
  );
});
