import { describe, expect, it } from 'vitest';
import { ObjectiveTracker } from '../../campaign/ObjectiveTracker';
import { MISSIONS, missionSetup, type ScenarioId } from '../../campaign/missions';
import { createBuilding } from '../../ecs/archetypes/building';
import { hillState } from '../../game/hill';
import { VictoryChecker } from '../../game/VictoryChecker';
import { findPlacement } from '../decisions/placement';
import { createRng } from '../../map/random';
import { createHeadlessMatch, type HeadlessMatch } from '../testing/headlessMatch';
import type { AIStrategy } from '../AIPlayer';
import { HardStrategy } from './HardStrategy';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 400_000;
const SIZE = { small: 64, medium: 96, large: 128 } as const;

function missionMatch(id: ScenarioId, human: AIStrategy, ai: (id: number) => AIStrategy): HeadlessMatch {
  const s = missionSetup(id);
  return createHeadlessMatch({ mission: id, seed: s.seed, size: SIZE[s.mapSize], aiCount: s.aiCount, strategy: ai, difficulty: () => s.difficulty, humanStrategy: human });
}

function track(match: HeadlessMatch, id: ScenarioId) {
  const tracker = new ObjectiveTracker(MISSIONS[id].objectives);
  const update = () => {
    const h = match.players.human()!;
    const st = match.stats.of(h.id);
    tracker.update({ entities: match.world.entities, humanId: h.id, humanAge: h.age, humanDefeated: h.defeated, timeMs: match.timeMs(), gatheredBy: { ...st.gatheredBy }, repairsDone: st.repairsDone, builtBy: { ...st.builtBy } });
  };
  return { tracker, update };
}

/** Runs `id` until its objectives are done or the human falls; returns the minute each objective latched. */
function runObjectives(match: HeadlessMatch, id: ScenarioId, minutes: number): { tracker: ObjectiveTracker; at: Map<number, number> } {
  const { tracker, update } = track(match, id);
  const at = new Map<number, number>();
  match.run(minutes * MIN, 100, (t) => {
    if (Math.round(t) % 1000 !== 0) return;
    update();
    for (const i of tracker.done) if (!at.has(i)) at.set(i, t / MIN);
    return tracker.complete() || match.players.human()!.defeated;
  });
  return { tracker, at };
}

/*
 * M20: the chapter-2 missions and the short scenarios with an AI in the human
 * slot. Seen when written: new_shores done at 7.7 (dock), 11.7 (3 boats),
 * 12.5 (age 2) and about 18–20 min (2 galleys; the Medium navy keeps 2–3 and
 * loses some in fights); hansa_roads done at 27.8 min (market 16.3, landmark
 * 21.3, 2000 gold 20.9, 3 carts 27.8); a Hard player holds last_stand's 15
 * minutes. The Hard player loses kings_head (two Hard AIs, the king at 31 min)
 * and hill_rush to the Medium AI's hill: like mission 3, their winnability is
 * not simulated, only their start.
 */
describe('campaign chapter 2 and short scenarios (M20)', () => {
  it(
    'new shores: a Medium player builds a dock, 3 fishing boats, 2 galleys and reaches age 2',
    () => {
      const match = missionMatch('new_shores', new MediumStrategy(createRng(11)), (id) => new MediumStrategy(createRng(id * 13)));
      const { tracker } = runObjectives(match, 'new_shores', 40);
      expect(tracker.done.slice().sort()).toEqual([0, 1, 2, 3]);
      expect(new VictoryChecker(match.world, match.players, null, null, tracker).check()).toMatchObject({ kind: 'victory', winnerId: 1, cause: 'mission' });
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'hansa roads: with an ally and a 20-minute treaty, a Medium player builds the market and the Kontor, 3 carts, and gathers 2000 gold',
    () => {
      const match = missionMatch('hansa_roads', new MediumStrategy(createRng(11)), (id) => new MediumStrategy(createRng(id * 13)));
      expect(match.players.hasTeams()).toBe(true);
      expect(match.players.all().every((p) => p.age === 2)).toBe(true);
      const { tracker } = runObjectives(match, 'hansa_roads', 45);
      expect(tracker.done.slice().sort()).toEqual([0, 1, 2, 3]);
      expect(match.players.human()!.defeated).toBe(false);
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'last stand: a Hard player holds 15 minutes from age 2 against two Hard AIs',
    () => {
      const match = missionMatch('last_stand', new HardStrategy(createRng(7)), (id) => new HardStrategy(createRng(id * 13)));
      const { tracker } = runObjectives(match, 'last_stand', 15);
      expect(match.players.human()!.defeated).toBe(false);
      expect(tracker.complete()).toBe(true);
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'wonder race: everyone in the Enlightenment, the human with the bonus; a finished Wonder of the human wins the mission',
    () => {
      const match = missionMatch('wonder_race', new MediumStrategy(createRng(11)), (id) => new MediumStrategy(createRng(id * 13)));
      expect(match.players.all().map((p) => p.age)).toEqual([3, 3]);
      expect(match.players.human()!.resources).toEqual({ food: 1200, wood: 1400, gold: 900 });
      const { tracker, update } = track(match, 'wonder_race');
      match.run(10 * MIN, 100);
      update();
      expect(tracker.complete()).toBe(false);
      expect(match.players.human()!.defeated).toBe(false);
      // The Medium AI spends on its army; place the human's finished Wonder by its town centre.
      const tc = match.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 1)!;
      const spot = findPlacement(match.map, tc.position!, 4, 4, { minRadius: 4, maxRadius: 20, clearance: 1 })!;
      createBuilding(match.world, { type: 'wonder', origin: spot, playerId: 1, mapData: match.map });
      update();
      expect(tracker.complete()).toBe(true);
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'kings head: Regicide from age 2, every player with a king; the match runs',
    () => {
      const match = missionMatch('kings_head', new HardStrategy(createRng(7)), (id) => new HardStrategy(createRng(id * 13)));
      expect(match.players.all().every((p) => p.age === 2)).toBe(true);
      const kings = match.world.entities.filter((e) => e.unit?.unitType === 'king');
      expect(kings.map((k) => k.owner!.playerId).sort()).toEqual([1, 2, 3]);
      match.run(5 * MIN, 100);
      expect(match.judge()).toEqual({ kind: 'playing' });
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'hill rush: King of the Hill from age 2 with a hill on the map; the match runs',
    () => {
      const match = missionMatch('hill_rush', new HardStrategy(createRng(7)), (id) => new MediumStrategy(createRng(id * 13)));
      expect(match.players.all().every((p) => p.age === 2)).toBe(true);
      expect(hillState(match.world)).not.toBeNull();
      match.run(5 * MIN, 100);
      expect(match.judge()).toEqual({ kind: 'playing' });
    },
    SIM_TIMEOUT_MS,
  );
});
