import { beforeEach, describe, expect, it } from 'vitest';
import { EasyStrategy } from '../ai/strategies/EasyStrategy';
import { createHeadlessMatch } from '../ai/testing/headlessMatch';
import { createEcsWorld } from '../ecs/world';
import { gameEvents } from '../game/events';
import { createPlayers } from '../game/PlayerManager';
import { createRng } from '../map/random';
import { uiWallet } from '../ecs/research';
import { deleteBuilding } from '../scenes/game/BuildingDeletion';
import { CampaignRunner } from '../scenes/game/CampaignRunner';
import { MatchStats, zeroStats } from '../stats/MatchStats';
import { campaignRows } from '../ui/screens/campaignRows';
import { resetUiStore, uiStore } from '../ui/store';
import { MISSION_IDS, MISSIONS, TUTORIAL_ID, type ScenarioId } from './missions';
import { objectiveProgress, type ObjectiveContext } from './objectives';
import { objectiveText } from './objectiveText';
import { ObjectiveTracker } from './ObjectiveTracker';
import { CampaignProgress, type MissionStatus, type ProgressStorage } from './progress';

const REPAIR_STEP = MISSIONS.tutorial.objectives.findIndex((o) => o.kind === 'repaired');

function memory(): ProgressStorage {
  const data: Record<string, string> = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

function tutorialMatch() {
  const s = MISSIONS.tutorial.setup;
  return createHeadlessMatch({ mission: TUTORIAL_ID, seed: s.seed, size: 64, aiCount: 1, strategy: () => new EasyStrategy(createRng(1)) });
}

function ctxOf(match: ReturnType<typeof tutorialMatch>): ObjectiveContext {
  const st = match.stats.of(1);
  return { entities: match.world.entities, humanId: 1, humanAge: 1, humanDefeated: false, timeMs: 0, gatheredBy: { ...st.gatheredBy }, repairsDone: st.repairsDone, builtBy: { ...st.builtBy } };
}

describe('built objective (M18)', () => {
  it('counts buildings finished through construction this match, by type, in MatchStats', () => {
    const world = createEcsWorld();
    const stats = new MatchStats(world, createPlayers('hungarian', ['english']));
    const off = stats.attach();
    gameEvents.emit('buildingCompleted', { world, playerId: 1, entityId: 7, buildingType: 'house' });
    gameEvents.emit('buildingCompleted', { world, playerId: 1, entityId: 8, buildingType: 'farm' });
    off();
    expect(stats.of(1)).toMatchObject({ buildingsBuilt: 2, builtBy: { house: 1, farm: 1 } });
    const house = { kind: 'built', building: 'house', count: 1 } as const;
    const ctx = { entities: [], humanId: 1, humanAge: 1, humanDefeated: false, timeMs: 0, gatheredBy: { food: 0, wood: 0, gold: 0 }, repairsDone: 0 } as const;
    expect(objectiveProgress(house, { ...ctx, builtBy: {} })).toEqual({ have: 0, need: 1 });
    expect(objectiveProgress(house, { ...ctx, builtBy: stats.of(1).builtBy })).toEqual({ have: 1, need: 1 });
    expect(objectiveText(house)).toBe('Építs egy új épületet: Ház');
  });
});

describe('tutorial steps that cannot get stuck (M18)', () => {
  beforeEach(() => resetUiStore());

  it('with the damaged house deleted, one new house still completes the house step and the repair step counts as met on its turn', () => {
    const match = tutorialMatch();
    const house = match.world.entities.find((e) => e.building?.type === 'house' && e.owner?.playerId === 1)!;
    expect(deleteBuilding(match.world, house, 1, uiWallet()).ok).toBe(true);
    const tracker = new ObjectiveTracker(MISSIONS.tutorial.objectives, [0], true);
    // No new house yet: step 2 waits (the start house never counted).
    expect(tracker.tick(ctxOf(match)).fresh).toEqual([]);
    // One house built (MatchStats builtBy) completes it.
    expect(tracker.tick({ ...ctxOf(match), builtBy: { house: 1 } }).fresh).toEqual([1]);
    // Steps 3–6 done (as from a save): the repair step is current with nothing to repair, so it is met.
    const later = new ObjectiveTracker(MISSIONS.tutorial.objectives, [0, 1, 2, 3, 4, 5], true);
    expect(later.current()).toBe(REPAIR_STEP);
    expect(later.tick(ctxOf(match)).fresh).toEqual([REPAIR_STEP]);
    expect(later.current()).toBe(REPAIR_STEP + 1);
  });

  it('with the damaged house standing, the repair step waits for a repair', () => {
    const match = tutorialMatch();
    const tracker = new ObjectiveTracker(MISSIONS.tutorial.objectives, [0, 1, 2, 3, 4, 5], true);
    expect(tracker.tick(ctxOf(match)).fresh).toEqual([]);
    expect(tracker.current()).toBe(REPAIR_STEP);
    // Not sequential: a mission's repaired objective never counts without a repair.
    expect(new ObjectiveTracker([{ kind: 'repaired', count: 1 }]).tick({ ...ctxOf(match), entities: [] }).fresh).toEqual([]);
  });

  it('a runner restored mid-tutorial shows the done steps and the current one with its hint', () => {
    const world = createEcsWorld();
    const players = createPlayers('hungarian', ['english']);
    const run = new CampaignRunner(world, players, TUTORIAL_ID, { done: [0, 1], progress: new CampaignProgress(memory()), notify: () => undefined, stats: { of: () => zeroStats() } });
    expect(run.tracker.current()).toBe(2);
    run.secondTick(60_000);
    const rows = uiStore.getState().objectives!.rows;
    expect(rows.map((r) => [r.text, r.done])).toEqual([
      ['Gyűjts 100 fát', true],
      ['Építs egy házat', true],
      ['Gyűjts 100 ételt', false],
    ]);
    expect(rows[2]).toMatchObject({ have: 0, need: 100 });
    expect(rows[2]?.hint).toContain('bogyós bokrokhoz');
    expect(rows.slice(0, 2).every((r) => r.hint === undefined)).toBe(true);
  });
});

describe('campaign list (M18)', () => {
  it('lists the tutorial first with its badge and status, then the missions numbered 1–3', () => {
    const status = (done: boolean) => (id: ScenarioId): MissionStatus => (id === TUTORIAL_ID ? (done ? 'completed' : 'available') : id === 'first_monastery' ? 'available' : 'locked');
    const rows = campaignRows(status(true));
    expect(rows.map((r) => [r.id, r.badge, r.status])).toEqual([
      [TUTORIAL_ID, 'Okt.', 'completed'],
      ['first_monastery', '1', 'available'],
      ['border_guards', '2', 'locked'],
      ['age_of_wonders', '3', 'locked'],
    ]);
    expect(rows[0]).toMatchObject({ title: 'Első lépések', statusText: 'Teljesítve' });
    expect(campaignRows(status(false))[0]?.statusText).toBe('Elérhető');
    expect(rows.slice(1).map((r) => r.id)).toEqual([...MISSION_IDS]);
  });
});
