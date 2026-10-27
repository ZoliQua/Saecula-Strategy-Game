import { describe, expect, it } from 'vitest';
import { createEcsWorld } from '../../ecs/world';
import { defaultSetupConfig, mapTiles, matchCivs, withSetup } from '../../game/GameSetupConfig';
import { createPlayers } from '../../game/PlayerManager';
import { generateGameMap, spawnPresetWalls, spawnStartingEntities } from './GameBootstrap';

describe('game bootstrap from setup config', () => {
  it('builds a 96x96 map with 4 players, each with a TC and 3 villagers', () => {
    const config = withSetup(defaultSetupConfig(7), { mapSize: 'medium', aiCount: 3 });
    const { mapData, starts } = generateGameMap(config);
    expect(mapData.width).toBe(mapTiles(config));
    expect(starts).toHaveLength(4);
    const world = createEcsWorld();
    spawnStartingEntities(world, createPlayers(config.civ, matchCivs(config).ais), mapData, starts);
    for (const id of [1, 2, 3, 4]) {
      const mine = world.entities.filter((e) => e.owner?.playerId === id);
      expect(mine.filter((e) => e.building?.type === 'town_center')).toHaveLength(1);
      expect(mine.filter((e) => e.gatherer)).toHaveLength(3);
    }
  });

  it('supports 5 AIs on every map size', () => {
    for (const mapSize of ['small', 'medium', 'large'] as const) {
      const config = withSetup(defaultSetupConfig(3), { mapSize, aiCount: 5 });
      const { starts } = generateGameMap(config);
      expect(starts).toHaveLength(6);
      const world = createEcsWorld();
      const { mapData } = generateGameMap(config);
      expect(() => spawnStartingEntities(world, createPlayers(config.civ, matchCivs(config).ais), mapData, starts)).not.toThrow();
    }
  });

  it('fortress: preset walls become finished stone wall entities of their ring owner, blocking their tiles', () => {
    const config = withSetup(defaultSetupConfig(5), { template: 'fortress', mapSize: 'small', aiCount: 2 });
    const { mapData, starts, walls } = generateGameMap(config);
    const world = createEcsWorld();
    const players = createPlayers(config.civ, matchCivs(config).ais);
    spawnStartingEntities(world, players, mapData, starts);
    spawnPresetWalls(world, players, mapData, walls);
    const spawned = world.entities.filter((e) => e.building?.type === 'wall');
    expect(spawned).toHaveLength(walls.length);
    for (const [i, w] of walls.entries()) {
      const e = spawned[i]!;
      expect(e.owner?.playerId).toBe(players.all()[w.playerIndex]!.id);
      expect(e.underConstruction).toBeUndefined();
      expect(e.building?.minStyleAge).toBe(2);
      expect(mapData.isPassable(w.tile.tx, w.tile.ty)).toBe(false);
    }
  });
});
