import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createResourceNode } from '../ecs/archetypes/resource';
import { createVillager } from '../ecs/archetypes/villager';
import { GatheringSystem } from '../ecs/systems/GatheringSystem';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { PlayerManager } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { applyDifficulty, createStrategy } from './createStrategy';

describe('createStrategy', () => {
  it('honours the chosen difficulty', () => {
    expect(createStrategy('easy').name).toBe('easy');
    expect(createStrategy('medium').name).toBe('medium');
    expect(createStrategy('hard').name).toBe('hard');
    expect(createStrategy('hard')).not.toBe(createStrategy('hard'));
  });
});

describe('difficulty gather handicap', () => {
  it('only a Hard AI player gets the +20% gather rate; the human never does', () => {
    const human = createPlayer({ id: 1, isHuman: true });
    const easy = createPlayer({ id: 2 });
    const medium = createPlayer({ id: 3 });
    const hard = createPlayer({ id: 4 });
    applyDifficulty(human, 'hard');
    applyDifficulty(easy, 'easy');
    applyDifficulty(medium, 'medium');
    applyDifficulty(hard, 'hard');
    expect([human, easy, medium, hard].map((p) => p.gatherHandicap)).toEqual([1, 1, 1, 1.2]);
  });

  it('GatheringSystem applies it to every resource (berries too) and grants nothing else', () => {
    const map = new MapData(24, 24, TERRAIN.grass);
    const world = createEcsWorld();
    const human = createPlayer({ id: 1, isHuman: true });
    const hard = createPlayer({ id: 2 });
    applyDifficulty(human, 'hard');
    applyDifficulty(hard, 'hard');
    const before = { ...hard.resources };
    const players = new PlayerManager([human, hard]);
    for (const id of [1, 2]) {
      createBuilding(world, { type: 'town_center', origin: { tx: id * 10 - 10, ty: 0 }, playerId: id, mapData: map });
    }
    const pairs = [1, 2].flatMap((id) =>
      (['wood', 'food', 'gold'] as const).map((type, i) => {
        const tile = { tx: id * 10 - 6 + i * 2, ty: 10 };
        const node = createResourceNode(world, { tile, type, amount: 500 });
        const v = createVillager(world, { tile: { tx: tile.tx, ty: 11 }, playerId: id });
        v.gatherIntent = { nodeId: node.id! };
        return { id, v };
      }),
    );
    new GatheringSystem(world, map, players).update(1000);
    for (const { id, v } of pairs) expect(v.gatherer!.carrying).toBeCloseTo(0.6 * (id === 2 ? 1.2 : 1), 5);
    expect(hard.resources).toEqual(before);
  });
});
