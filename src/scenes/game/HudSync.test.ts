import { beforeEach, describe, expect, it } from 'vitest';
import { TIME_VICTORY, WONDER_HOLD_MS } from '../../config/balance';
import { createBuilding } from '../../ecs/archetypes/building';
import { createEcsWorld } from '../../ecs/world';
import { createPlayer } from '../../game/Player';
import { PlayerManager } from '../../game/PlayerManager';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { resetUiStore, uiStore } from '../../ui/store';
import { createVillager } from '../../ecs/archetypes/villager';
import { MatchStats } from '../../stats/MatchStats';
import { HudSync } from './HudSync';

function setup() {
  const map = new MapData(20, 20, TERRAIN.grass);
  const world = createEcsWorld();
  const players = new PlayerManager([createPlayer({ id: 1, isHuman: true }), createPlayer({ id: 2 })]);
  const wonder = createBuilding(world, { type: 'wonder', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: map });
  world.addComponent(wonder, 'wonder', { heldMs: 60_000 });
  return { world, players, wonder };
}

describe('HudSync', () => {
  beforeEach(() => resetUiStore());

  it('conquest-only (null hold): no countdown reaches the store, the unique-building list still does', () => {
    const { world, players } = setup();
    new HudSync(world, players, null).secondTick();
    expect(uiStore.getState().wonders).toEqual([]);
    expect(uiStore.getState().uniqueBuilt).toEqual(['wonder']);
  });

  it('with the Wonder victory, publishes the running clocks', () => {
    const { world, players, wonder } = setup();
    new HudSync(world, players, WONDER_HOLD_MS).secondTick();
    expect(uiStore.getState().wonders).toEqual([
      { entityId: wonder.id, playerId: 1, color: players.get(1)!.color, friendly: true, remainingMs: WONDER_HOLD_MS - 60_000 },
    ]);
  });

  it("publishes every player's score, highest first, and the human's villager counts", () => {
    const { world, players } = setup();
    const stats = new MatchStats(world, players);
    createVillager(world, { tile: { tx: 15, ty: 15 } });
    createVillager(world, { tile: { tx: 16, ty: 15 }, playerId: 2 });
    players.get(2)!.age = 3;
    players.get(2)!.defeated = true;
    new HudSync(world, players, null, stats).secondTick();
    const s = uiStore.getState();
    // The human's finished Wonder: 5000 / 10 = 500; player 2 in age 3: 800.
    expect(s.scores.map((r) => [r.playerId, r.score, r.defeated, r.isHuman])).toEqual([
      [2, 800, true, false],
      [1, 500, false, true],
    ]);
    expect(s.villagerCounts).toEqual({ food: 0, wood: 0, gold: 0, build: 0, idle: 1, other: 0 });
  });

  it("marks the human's allies on the score rows (M16); the human and enemies carry no mark", () => {
    const world = createEcsWorld();
    const players = new PlayerManager([1, 2, 3].map((id) => createPlayer({ id, isHuman: id === 1 })));
    players.assignTeams(1);
    new HudSync(world, players, null, new MatchStats(world, players)).secondTick();
    const rows = [...uiStore.getState().scores].sort((a, b) => a.playerId - b.playerId);
    expect(rows.map((r) => [r.playerId, r.ally])).toEqual([[1, false], [2, true], [3, false]]);
  });

  it('a team match marks the time clock as teamed (M16); a free-for-all clock carries no mark', () => {
    const world = createEcsWorld();
    const players = new PlayerManager([1, 2, 3].map((id) => createPlayer({ id, isHuman: id === 1 })));
    const time = { limitMs: TIME_VICTORY.limitMs, nowMs: () => 0, standing: () => ({ score: 0, killValue: 0 }) };
    new HudSync(world, players, null, null, time).secondTick();
    expect(uiStore.getState().timeLimit && 'teams' in uiStore.getState().timeLimit!).toBe(false);
    players.assignTeams(1);
    new HudSync(world, players, null, null, time).secondTick();
    expect(uiStore.getState().timeLimit?.teams).toBe(true);
  });

  it('with a time limit, publishes the time left, the leader and the final-window flag', () => {
    const { world, players } = setup();
    let now = 0;
    const scores: Record<number, number> = { 1: 10, 2: 30 };
    const time = { limitMs: TIME_VICTORY.limitMs, nowMs: () => now, standing: (id: number) => ({ score: scores[id] ?? 0, killValue: 0 }) };
    const sync = new HudSync(world, players, null, null, time);
    sync.secondTick();
    expect(uiStore.getState().timeLimit).toEqual({ remainingMs: TIME_VICTORY.limitMs, leaderId: 2, leaderColor: players.get(2)!.color, final: false });
    now = TIME_VICTORY.limitMs - TIME_VICTORY.holdLeadMs;
    scores[1] = 99;
    sync.secondTick();
    expect(uiStore.getState().timeLimit).toMatchObject({ remainingMs: TIME_VICTORY.holdLeadMs, leaderId: 1, final: true });
  });

  it('with a treaty, publishes the treaty time left (M16), 0 once over; without one it stays null', () => {
    const { world, players } = setup();
    let left = 600_000;
    const sync = new HudSync(world, players, null, null, null, () => left);
    // Shown at once, before the first second ticks.
    expect(uiStore.getState().treatyLeftMs).toBe(600_000);
    left = 599_000;
    sync.secondTick();
    expect(uiStore.getState().treatyLeftMs).toBe(599_000);
    left = 0;
    sync.secondTick();
    expect(uiStore.getState().treatyLeftMs).toBe(0);
    resetUiStore();
    new HudSync(world, players, null).secondTick();
    expect(uiStore.getState().treatyLeftMs).toBeNull();
  });

  it('without a time limit the clock stays null', () => {
    const { world, players } = setup();
    new HudSync(world, players, null).secondTick();
    expect(uiStore.getState().timeLimit).toBeNull();
  });
});

