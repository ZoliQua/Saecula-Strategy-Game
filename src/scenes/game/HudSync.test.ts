import { beforeEach, describe, expect, it } from 'vitest';
import { WONDER_HOLD_MS } from '../../config/balance';
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
      { entityId: wonder.id, playerId: 1, color: players.get(1)!.color, remainingMs: WONDER_HOLD_MS - 60_000 },
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
});
