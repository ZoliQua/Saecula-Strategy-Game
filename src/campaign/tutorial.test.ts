import { beforeEach, describe, expect, it } from 'vitest';
import { EasyStrategy } from '../ai/strategies/EasyStrategy';
import { createHeadlessMatch } from '../ai/testing/headlessMatch';
import { createRng } from '../map/random';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createEcsWorld } from '../ecs/world';
import { gameEvents } from '../game/events';
import { TECH_SPECS } from '../game/technologies';
import { withSetup } from '../game/GameSetupConfig';
import { createPlayers } from '../game/PlayerManager';
import { TERRAIN } from '../map/TerrainTypes';
import { GameSetupConfigSchema } from '../save/schema';
import { tryGenerateGameMap } from '../scenes/game/GameBootstrap';
import { CampaignRunner } from '../scenes/game/CampaignRunner';
import { MatchStats } from '../stats/MatchStats';
import { resetUiStore, uiStore } from '../ui/store';
import { DAMAGED_HOUSE_HP_FRACTION, MISSION_IDS, MISSIONS, missionSetup, SCENARIO_IDS, TUTORIAL_ID } from './missions';
import { objectiveProgress, type Objective, type ObjectiveContext } from './objectives';
import { objectiveHint, objectiveText, scenarioObjectiveText } from './objectiveText';
import { ObjectiveTracker } from './ObjectiveTracker';
import { CAMPAIGN_KEY, CampaignProgress, type ProgressStorage } from './progress';

const ZERO = { food: 0, wood: 0, gold: 0 };

function memory(initial: Record<string, string> = {}): ProgressStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

function ctxOf(entities: ObjectiveContext['entities'], o: Partial<ObjectiveContext> = {}): ObjectiveContext {
  return { entities, humanId: 1, humanAge: 1, humanDefeated: false, timeMs: 0, gatheredBy: ZERO, repairsDone: 0, builtBy: {}, ...o };
}

describe('gathered and repaired objectives (M18)', () => {
  it('count the human gathered stock of one resource and finished repairs, capped at the need', () => {
    const wood: Objective = { kind: 'gathered', resource: 'wood', amount: 100 };
    const fix: Objective = { kind: 'repaired', count: 1 };
    expect(objectiveProgress(wood, ctxOf([], { gatheredBy: { food: 500, wood: 40.6, gold: 0 } }))).toEqual({ have: 40, need: 100 });
    expect(objectiveProgress(wood, ctxOf([], { gatheredBy: { food: 0, wood: 250, gold: 0 } }))).toEqual({ have: 100, need: 100 });
    expect(objectiveProgress(fix, ctxOf([]))).toEqual({ have: 0, need: 1 });
    expect(objectiveProgress(fix, ctxOf([], { repairsDone: 3 }))).toEqual({ have: 1, need: 1 });
    expect(objectiveText(wood)).toBe('Gyűjts 100 egységnyi nyersanyagot: Fa');
    expect(objectiveText(fix)).toBe('Javíts meg egy sérült épületet');
  });

  it('MatchStats counts deliveries by resource (and in the total)', () => {
    const world = createEcsWorld();
    const stats = new MatchStats(world, createPlayers('hungarian', ['english']));
    const off = stats.attach();
    gameEvents.emit('resourcesDelivered', { world, playerId: 1, resource: 'wood', amount: 10 });
    gameEvents.emit('resourcesDelivered', { world, playerId: 1, resource: 'food', amount: 7 });
    gameEvents.emit('resourcesDelivered', { world, playerId: 2, resource: 'gold', amount: 5 });
    off();
    expect(stats.of(1)).toMatchObject({ gathered: 17, gatheredBy: { food: 7, wood: 10, gold: 0 } });
    expect(stats.of(2).gatheredBy).toEqual({ food: 0, wood: 0, gold: 5 });
    const snap = stats.snapshot();
    snap.players['1']!.gatheredBy.wood = 999;
    expect(stats.of(1).gatheredBy.wood).toBe(10);
  });
});

describe('sequential ObjectiveTracker (M18)', () => {
  const steps: Objective[] = [
    { kind: 'gathered', resource: 'wood', amount: 100 },
    { kind: 'ownUnits', unit: 'villager', count: 1 },
    { kind: 'repaired', count: 1 },
  ];

  it('judges an objective only after the earlier ones; an early-met later one completes in the same tick its turn comes', () => {
    const w = createEcsWorld();
    createUnit(w, { type: 'villager', tile: { tx: 1, ty: 1 }, playerId: 1 });
    const t = new ObjectiveTracker(steps, [], true);
    // Step 2 (one villager) and step 3 (a repair) are already met, but wait for step 1.
    let tick = t.tick(ctxOf(w.entities, { repairsDone: 1 }));
    expect(tick.fresh).toEqual([]);
    expect(tick.states.map((s) => s.done)).toEqual([false, false, false]);
    expect(tick.states[1]?.progress).toEqual({ have: 0, need: 1 });
    expect(t.current()).toBe(0);
    tick = t.tick(ctxOf(w.entities, { repairsDone: 1, gatheredBy: { food: 0, wood: 100, gold: 0 } }));
    expect(tick.fresh).toEqual([0, 1, 2]);
    expect(t.complete()).toBe(true);
    expect(t.current()).toBeNull();
  });

  it('stops at the first unmet objective, and a non-sequential tracker judges all at once', () => {
    const w = createEcsWorld();
    const seq = new ObjectiveTracker(steps, [], true);
    expect(seq.tick(ctxOf(w.entities, { repairsDone: 1, gatheredBy: { food: 0, wood: 100, gold: 0 } })).fresh).toEqual([0]);
    expect(seq.current()).toBe(1);
    expect(seq.states(ctxOf(w.entities, { repairsDone: 1 }))[2]).toMatchObject({ done: false, progress: { have: 0, need: 1 } });
    const all = new ObjectiveTracker(steps);
    expect(all.tick(ctxOf(w.entities, { repairsDone: 1 })).fresh).toEqual([2]);
    expect(all.current()).toBeNull();
  });
});

describe('tutorial mission (M18)', () => {
  beforeEach(() => resetUiStore());

  it('is the first scenario but outside the campaign chain; a valid setup (Hungarian, small meadow, 1 Easy AI, 20 min treaty) the save schema accepts', () => {
    expect(SCENARIO_IDS).toEqual([TUTORIAL_ID, ...MISSION_IDS]);
    expect(MISSION_IDS as readonly string[]).not.toContain(TUTORIAL_ID);
    const setup = missionSetup(TUTORIAL_ID);
    expect(setup).toMatchObject({ mission: 'tutorial', civ: 'hungarian', template: 'meadow', mapSize: 'small', aiCount: 1, difficulty: 'easy', treatyMin: 20, allies: 0 });
    expect(withSetup(setup, {})).toEqual(setup);
    expect(GameSetupConfigSchema.safeParse(setup).success).toBe(true);
    expect(MISSIONS.tutorial.sequential).toBe(true);
    expect(MISSIONS.tutorial.objectives.map((o) => o.kind)).toEqual(['gathered', 'built', 'gathered', 'ownUnits', 'ownBuildings', 'ownUnits', 'repaired', 'reachAge']);
    expect(tryGenerateGameMap(setup)).not.toBeNull();
  });

  it('starts with a finished house of the human by its town centre at half HP, with forest and berries near', () => {
    const s = MISSIONS.tutorial.setup;
    const match = createHeadlessMatch({ mission: TUTORIAL_ID, seed: s.seed, size: 64, aiCount: 1, strategy: () => new EasyStrategy(createRng(1)) });
    const houses = match.world.entities.filter((e) => e.building?.type === 'house');
    expect(houses).toHaveLength(1);
    const house = houses[0]!;
    expect(house.owner?.playerId).toBe(1);
    expect(house.underConstruction).toBeUndefined();
    expect(house.health!.current).toBe(Math.round(house.health!.max * DAMAGED_HOUSE_HP_FRACTION));
    const tc = match.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 1)!;
    const d = Math.max(Math.abs(house.position!.tx - tc.position!.tx), Math.abs(house.position!.ty - tc.position!.ty));
    expect(d).toBeLessThanOrEqual(10);
    const near = (terrain: number) => {
      for (let dy = -14; dy <= 14; dy++) {
        for (let dx = -14; dx <= 14; dx++) {
          const tx = tc.position!.tx + dx;
          const ty = tc.position!.ty + dy;
          if (tx >= 0 && ty >= 0 && tx < match.map.width && ty < match.map.height && match.map.getTile(tx, ty) === terrain) return true;
        }
      }
      return false;
    };
    expect(near(TERRAIN.forest)).toBe(true);
    expect(near(TERRAIN.berries)).toBe(true);
    // A skirmish has no such house.
    expect(createHeadlessMatch({ seed: s.seed, size: 64, aiCount: 1, strategy: () => new EasyStrategy(createRng(1)) }).world.entities.some((e) => e.building?.type === 'house')).toBe(false);
  });

  it('hints name the command click as set in the controls; the age-up hint names its cost and the gold mine', () => {
    expect(objectiveHint(TUTORIAL_ID, 0, 'ctrl')).toContain('majd kattints jobb gombbal (vagy Ctrl+klikkel) egy fára');
    expect(objectiveHint(TUTORIAL_ID, 6, 'meta')).toContain('Cmd+klikkel');
    expect(objectiveHint(TUTORIAL_ID, 0, 'none')).toContain('majd kattints jobb gombbal egy fára');
    const age = TECH_SPECS.feudalism.cost;
    const last = objectiveHint(TUTORIAL_ID, 7, 'alt')!;
    expect(last).toContain(`${age.food} ételbe és ${age.gold} aranyba`);
    expect(last).toContain('aranyérhez (kattints jobb gombbal (vagy Alt+klikkel) az aranyra)');
    for (let i = 0; i < MISSIONS.tutorial.objectives.length; i++) expect(objectiveHint(TUTORIAL_ID, i, 'ctrl')?.length, String(i)).toBeGreaterThan(20);
    expect(objectiveHint('first_monastery', 0, 'ctrl')).toBeNull();
  });

  it('the HUD shows the done objectives and the current one with its hint', () => {
    const world = createEcsWorld();
    const players = createPlayers('hungarian', ['english']);
    const stats = { of: () => ({ ...new MatchStats(world, players).of(1), gatheredBy: { food: 0, wood: 120, gold: 0 } }) };
    const toasts: string[] = [];
    const run = new CampaignRunner(world, players, TUTORIAL_ID, { progress: new CampaignProgress(memory()), notify: (m) => toasts.push(m), stats });
    run.secondTick(1000);
    const o = uiStore.getState().objectives!;
    expect(o.title).toBe('Első lépések');
    expect(o.rows.map((r) => r.done)).toEqual([true, false]);
    expect(o.rows.map((r) => r.text)).toEqual(['Gyűjts 100 fát', 'Építs egy házat']);
    // The house step counts new houses: 0 / 1 (the damaged house at start does not count).
    expect(o.rows[1]).toMatchObject({ have: 0, need: 1, counted: true });
    expect(o.rows[0]?.hint).toBeUndefined();
    expect(o.rows[1]?.hint).toContain('Házat');
    expect(toasts).toEqual(['Cél teljesítve: Gyűjts 100 fát']);
  });

  it('completing it sets the tutorial flag, which never locks or unlocks a mission; older stored progress still reads', () => {
    const store = memory({ [CAMPAIGN_KEY]: JSON.stringify({ completed: ['first_monastery'] }) });
    const progress = new CampaignProgress(store);
    expect(progress.status(TUTORIAL_ID)).toBe('available');
    expect(MISSION_IDS.map((id) => progress.status(id))).toEqual(['completed', 'available', 'locked']);
    const run = new CampaignRunner(createEcsWorld(), createPlayers('hungarian', ['english']), TUTORIAL_ID, { progress, notify: () => undefined });
    expect(run.finish(true)).toContain('alapokat');
    expect(progress.tutorialDone()).toBe(true);
    expect(progress.status(TUTORIAL_ID)).toBe('completed');
    expect(MISSION_IDS.map((id) => progress.status(id))).toEqual(['completed', 'available', 'locked']);
    progress.markCompleted('border_guards');
    expect(new CampaignProgress(store).tutorialDone()).toBe(true);
    const fresh = new CampaignProgress(memory());
    fresh.markCompleted(TUTORIAL_ID);
    expect(MISSION_IDS.map((id) => fresh.status(id))).toEqual(['available', 'locked', 'locked']);
  });

  it('every tutorial step has its own title, built from the step', () => {
    expect(MISSIONS.tutorial.objectives.map((_, i) => scenarioObjectiveText(TUTORIAL_ID, i))).toEqual([
      'Gyűjts 100 fát',
      'Építs egy házat',
      'Gyűjts 100 ételt',
      'Legyen 6 falusid',
      'Építs laktanyát',
      'Képezz 3 kardforgatót',
      'Javítsd meg a sérült házat',
      'Lépj a középkorba',
    ]);
    for (const o of MISSIONS.tutorial.objectives) expect(objectiveText(o).length).toBeGreaterThan(5);
    expect(scenarioObjectiveText('first_monastery', 2)).toBe('Képezz 2 egységet: Szerzetes');
  });
});

