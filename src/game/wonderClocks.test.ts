import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { createPlayer } from './Player';
import { PlayerManager } from './PlayerManager';
import { wonderClocks } from './wonderClocks';

describe('wonderClocks', () => {
  it('remainingMs = hold - heldMs, soonest first, defeated owner dropped, colour = owner colour', () => {
    const map = new MapData(40, 40, TERRAIN.grass);
    const world = createEcsWorld();
    const players = new PlayerManager([
      createPlayer({ id: 1, isHuman: true }),
      createPlayer({ id: 2 }),
      createPlayer({ id: 3 }),
      createPlayer({ id: 4 }),
    ]);
    const add = (playerId: number, tx: number, heldMs: number | null, extra: { site?: boolean; dying?: boolean } = {}) => {
      const e = createBuilding(world, {
        type: 'wonder', origin: { tx, ty: 4 }, playerId, mapData: map, underConstruction: extra.site ?? false,
      });
      if (heldMs !== null) world.addComponent(e, 'wonder', { heldMs });
      if (extra.dying) world.addComponent(e, 'dying', { ttlMs: 1000 });
      return e;
    };
    const human = add(1, 2, 1000);
    const ai = add(2, 8, 400_000);
    add(3, 14, 500_000);
    players.markDefeated(3);
    add(4, 20, null, { site: true });
    add(4, 26, 590_000, { dying: true });
    expect(wonderClocks(world, players, 600_000)).toEqual([
      { entityId: ai.id, playerId: 2, color: players.get(2)!.color, remainingMs: 200_000 },
      { entityId: human.id, playerId: 1, color: players.get(1)!.color, remainingMs: 599_000 },
    ]);
  });

  it('never reports a negative time left', () => {
    const map = new MapData(20, 20, TERRAIN.grass);
    const world = createEcsWorld();
    const players = new PlayerManager([createPlayer({ id: 1, isHuman: true })]);
    const e = createBuilding(world, { type: 'wonder', origin: { tx: 2, ty: 2 }, playerId: 1, mapData: map });
    world.addComponent(e, 'wonder', { heldMs: 700_000 });
    expect(wonderClocks(world, players, 600_000)[0]?.remainingMs).toBe(0);
  });
});
