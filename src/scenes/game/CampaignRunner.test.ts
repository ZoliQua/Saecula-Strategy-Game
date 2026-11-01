import { beforeEach, describe, expect, it } from 'vitest';
import { CampaignProgress, type ProgressStorage } from '../../campaign/progress';
import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createEcsWorld } from '../../ecs/world';
import { createPlayers } from '../../game/PlayerManager';
import { applyMissionStart } from '../../campaign/missionStart';
import { MapData } from '../../map/MapData';
import { resetUiStore, uiStore } from '../../ui/store';
import { CampaignRunner } from './CampaignRunner';

function memory(): ProgressStorage {
  const data: Record<string, string> = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

describe('CampaignRunner', () => {
  beforeEach(() => resetUiStore());

  it('publishes the objectives, toasts newly met ones once, completes, and records the won mission', () => {
    const map = new MapData(30, 30);
    const world = createEcsWorld();
    const players = createPlayers('hungarian', ['english']);
    const toasts: string[] = [];
    const progress = new CampaignProgress(memory());
    const run = new CampaignRunner(world, players, 'first_monastery', [], progress, (m) => toasts.push(m));
    run.secondTick(1000);
    expect(uiStore.getState().objectives).toMatchObject({ title: 'Az első kolostor', rows: [{ done: false }, { done: false, have: 0, need: 1, counted: true }, { done: false, have: 0, need: 2 }] });
    players.human()!.age = 2;
    createBuilding(world, { type: 'monastery', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: map });
    run.secondTick(2000);
    run.secondTick(3000);
    expect(toasts).toEqual(['Cél teljesítve: Lépj be: Középkor', 'Cél teljesítve: Építs fel: Kolostor']);
    expect(run.complete()).toBe(false);
    createUnit(world, { type: 'monk', tile: { tx: 9, ty: 9 }, playerId: 1 });
    createUnit(world, { type: 'monk', tile: { tx: 10, ty: 9 }, playerId: 1 });
    run.secondTick(4000);
    expect(run.complete()).toBe(true);
    expect(run.state()).toEqual({ done: [0, 1, 2] });
    expect(run.finish(true)).toContain('harangja');
    expect(progress.status('first_monastery')).toBe('completed');
    expect(progress.status('border_guards')).toBe('available');
  });

  it('a lost mission is not recorded; a restored one keeps its done objectives', () => {
    const progress = new CampaignProgress(memory());
    const run = new CampaignRunner(createEcsWorld(), createPlayers('english', ['german', 'german']), 'border_guards', [1], progress, () => undefined);
    expect(run.state()).toEqual({ done: [1] });
    expect(run.finish(false)).toContain('próbáld újra');
    expect(progress.status('border_guards')).toBe('locked');
  });

  it('publishStart copies the mission start (stock, age, age-up techs) into the UI store', () => {
    const players = createPlayers('italian', ['german', 'french']);
    applyMissionStart(players, 'age_of_wonders');
    CampaignRunner.publishStart(players);
    const ui = uiStore.getState();
    expect(ui.currentAge).toBe(3);
    expect(ui.resources).toEqual(players.human()!.resources);
    expect([...ui.researchedTechs].sort()).toEqual(['enlightenment', 'feudalism']);
  });

  it('winning a mission that is still locked (an imported save) does not complete it nor unlock the next one', () => {
    const progress = new CampaignProgress(memory());
    const run = new CampaignRunner(createEcsWorld(), createPlayers('italian', ['german', 'french']), 'age_of_wonders', [], progress, () => undefined);
    run.finish(true);
    expect(progress.status('age_of_wonders')).toBe('locked');
    expect(progress.completed().size).toBe(0);
  });
});

