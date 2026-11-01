import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createEcsWorld } from '../ecs/world';
import { withSetup } from '../game/GameSetupConfig';
import { createPlayers } from '../game/PlayerManager';
import { VictoryChecker } from '../game/VictoryChecker';
import { MapData } from '../map/MapData';
import { applyMissionStart } from './missionStart';
import { MISSION_IDS, MISSIONS, missionSetup, nextMission } from './missions';
import { objectiveProgress, type ObjectiveContext } from './objectives';
import { objectiveText } from './objectiveText';
import { ObjectiveTracker } from './ObjectiveTracker';
import { CAMPAIGN_KEY, CampaignProgress, type ProgressStorage } from './progress';

const MIN = 60_000;

function world() {
  const map = new MapData(30, 30);
  const w = createEcsWorld();
  const ctx = (o: Partial<ObjectiveContext> = {}): ObjectiveContext => ({ entities: w.entities, humanId: 1, humanAge: 1, humanDefeated: false, timeMs: 0, ...o });
  return { map, w, ctx };
}

function memory(initial: Record<string, string> = {}): ProgressStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

describe('objectives', () => {
  it('count finished own buildings and living own units only', () => {
    const { map, w, ctx } = world();
    const mon = { kind: 'ownBuildings', building: 'monastery', count: 1 } as const;
    const monks = { kind: 'ownUnits', unit: 'monk', count: 2 } as const;
    createBuilding(w, { type: 'monastery', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: map, underConstruction: true });
    createBuilding(w, { type: 'monastery', origin: { tx: 10, ty: 2 }, playerId: 2, mapData: map });
    expect(objectiveProgress(mon, ctx())).toEqual({ have: 0, need: 1 });
    createBuilding(w, { type: 'monastery', origin: { tx: 20, ty: 2 }, playerId: 1, mapData: map });
    expect(objectiveProgress(mon, ctx())).toEqual({ have: 1, need: 1 });
    createUnit(w, { type: 'monk', tile: { tx: 5, ty: 9 }, playerId: 1 });
    const dying = createUnit(w, { type: 'monk', tile: { tx: 6, ty: 9 }, playerId: 1 });
    w.addComponent(dying, 'dying', { ttlMs: 500 });
    expect(objectiveProgress(monks, ctx())).toEqual({ have: 1, need: 2 });
  });

  it('age and survive: survive counts whole minutes, full only at the limit, none once defeated', () => {
    const { ctx } = world();
    expect(objectiveProgress({ kind: 'reachAge', age: 2 }, ctx({ humanAge: 3 }))).toEqual({ have: 2, need: 2 });
    const hold = { kind: 'survive', ms: 20 * MIN } as const;
    expect(objectiveProgress(hold, ctx({ timeMs: 19.99 * MIN }))).toEqual({ have: 19, need: 20 });
    expect(objectiveProgress(hold, ctx({ timeMs: 20 * MIN }))).toEqual({ have: 20, need: 20 });
    expect(objectiveProgress(hold, ctx({ timeMs: 25 * MIN, humanDefeated: true }))).toEqual({ have: 0, need: 20 });
  });

  it('every mission objective has a Hungarian line', () => {
    for (const id of MISSION_IDS) for (const o of MISSIONS[id].objectives) expect(objectiveText(o).length, `${id} ${o.kind}`).toBeGreaterThan(5);
    expect(objectiveText({ kind: 'ownUnits', unit: 'monk', count: 2 })).toBe('Képezz 2 egységet: Szerzetes');
  });
});

describe('ObjectiveTracker', () => {
  it('latches: a met objective stays done after the world changes; complete when all are done', () => {
    const { map, w, ctx } = world();
    const t = new ObjectiveTracker(MISSIONS.first_monastery.objectives);
    expect(t.update(ctx({ humanAge: 2 }))).toEqual([0]);
    createBuilding(w, { type: 'monastery', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: map });
    const a = createUnit(w, { type: 'monk', tile: { tx: 9, ty: 9 }, playerId: 1 });
    createUnit(w, { type: 'monk', tile: { tx: 10, ty: 9 }, playerId: 1 });
    expect(t.update(ctx({ humanAge: 2 }))).toEqual([1, 2]);
    expect(t.complete()).toBe(true);
    w.remove(a);
    expect(t.states(ctx({ humanAge: 2 })).map((s) => s.done)).toEqual([true, true, true]);
    expect(t.done).toEqual([0, 1, 2]);
  });

  it('restores done indices (out-of-range ones dropped); a winMatch mission never completes by objectives', () => {
    expect(new ObjectiveTracker(MISSIONS.border_guards.objectives, [1, 7, -1]).done).toEqual([1]);
    const win = new ObjectiveTracker(MISSIONS.age_of_wonders.objectives, [0]);
    expect(win.complete()).toBe(false);
  });
});

describe('ObjectiveTracker cost', () => {
  it('a done objective is not judged again (no world scan once a second for it)', () => {
    const { map, w } = world();
    createBuilding(w, { type: 'monastery', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: map });
    let scans = 0;
    const entities = { [Symbol.iterator]: () => (scans++, w.entities[Symbol.iterator]()) };
    const ctx: ObjectiveContext = { entities, humanId: 1, humanAge: 2, humanDefeated: false, timeMs: 0 };
    const t = new ObjectiveTracker([{ kind: 'ownBuildings', building: 'monastery', count: 1 }]);
    expect(t.tick(ctx).fresh).toEqual([0]);
    scans = 0;
    const again = t.tick(ctx);
    expect(scans).toBe(0);
    expect(again.states[0]).toMatchObject({ done: true, progress: { have: 1, need: 1 } });
  });
});

describe('missions', () => {
  it('are valid setups (withSetup keeps them as they are), tagged with their id, in order', () => {
    for (const id of MISSION_IDS) expect(withSetup(missionSetup(id), {})).toEqual(missionSetup(id));
    expect(missionSetup('border_guards').mission).toBe('border_guards');
    expect(MISSION_IDS.map(nextMission)).toEqual(['border_guards', 'age_of_wonders', null]);
  });

  it('start: every player in the mission age with the age-up techs, the human with the bonus', () => {
    const players = createPlayers('italian', ['german', 'french']);
    const before = { ...players.human()!.resources };
    applyMissionStart(players, 'age_of_wonders');
    for (const p of players.all()) {
      expect(p.age).toBe(3);
      expect([...p.researched].sort()).toEqual(['enlightenment', 'feudalism']);
    }
    expect(players.human()!.resources).toEqual({ food: before.food + 1000, wood: before.wood + 1000, gold: before.gold + 800 });
    expect(players.ais()[0]!.resources).toEqual(before);
    const plain = createPlayers('hungarian', ['english']);
    applyMissionStart(plain, 'first_monastery');
    expect(plain.human()!.age).toBe(1);
  });

  it('VictoryChecker: all objectives done is a mission victory, after conquest', () => {
    const { map, w } = world();
    const players = createPlayers('hungarian', ['english']);
    createBuilding(w, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: map });
    const aiTc = createBuilding(w, { type: 'town_center', origin: { tx: 20, ty: 20 }, playerId: 2, mapData: map });
    let done = false;
    const vc = new VictoryChecker(w, players, null, null, { complete: () => done });
    expect(vc.check()).toEqual({ kind: 'playing' });
    done = true;
    expect(vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'mission' });
    w.addComponent(aiTc, 'dying', { ttlMs: 0 });
    expect(vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
  });
});

describe('CampaignProgress', () => {
  it('unlocks in order, keeps completed missions replayable, and persists', () => {
    const store = memory();
    const p = new CampaignProgress(store);
    expect(MISSION_IDS.map((id) => p.status(id))).toEqual(['available', 'locked', 'locked']);
    p.markCompleted('first_monastery');
    expect(MISSION_IDS.map((id) => p.status(id))).toEqual(['completed', 'available', 'locked']);
    expect(JSON.parse(store.data[CAMPAIGN_KEY]!)).toEqual({ completed: ['first_monastery'] });
    expect(new CampaignProgress(store).status('border_guards')).toBe('available');
  });

  it('corrupt or unknown data reads as no progress; no storage or a failing write never throws', () => {
    for (const bad of ['{', '{"completed":["nope"]}', '[]', '{"completed":[],"x":1}']) {
      expect(new CampaignProgress(memory({ [CAMPAIGN_KEY]: bad })).completed().size, bad).toBe(0);
    }
    const none = new CampaignProgress(null);
    expect(none.status('first_monastery')).toBe('available');
    none.markCompleted('first_monastery');
    const failing = new CampaignProgress({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    expect(() => failing.markCompleted('first_monastery')).not.toThrow();
  });

  it('a mission setup sent back to the skirmish setup card loses its mission tag (no hidden mission)', async () => {
    const { skirmishConfig } = await import('../game/GameSetupConfig');
    const back = skirmishConfig(missionSetup('border_guards'));
    expect(back.mission).toBeUndefined();
    expect('mission' in back).toBe(false);
    expect(back.civ).toBe('english');
  });
});

