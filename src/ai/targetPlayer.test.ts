import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { killEntity } from '../game/kill';
import { createEcsWorld, type EcsWorld } from '../ecs/world';
import type { Entity } from '../ecs/components';
import { createPlayers, type PlayerManager } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { chooseEnemyPlayer } from './targetPlayer';

/** Five players; town centres along a line: 1 at 0, 2 at 10, 3 at 40, 4 at 20, 5 at 60. */
function setup(allies: number): { world: EcsWorld; players: PlayerManager; tcs: Map<number, Entity> } {
  const world = createEcsWorld();
  const map = new MapData(80, 80);
  const players = createPlayers('hungarian', ['english', 'german', 'french', 'spanish'], undefined, allies);
  const tcs = new Map<number, Entity>();
  const at: Record<number, number> = { 1: 0, 2: 10, 3: 40, 4: 20, 5: 60 };
  for (const [id, x] of Object.entries(at)) {
    tcs.set(Number(id), createBuilding(world, { type: 'town_center', origin: { tx: x, ty: 5 }, playerId: Number(id), mapData: map }));
  }
  return { world, players, tcs };
}

function fell(world: EcsWorld, tc: Entity): void {
  killEntity(world, tc as Entity & { health: { current: number; max: number } });
}

describe('chooseEnemyPlayer (M16 AI target choice)', () => {
  it('with allies 0 every AI targets the human, as before', () => {
    const { world, players, tcs } = setup(0);
    for (const id of [2, 3, 4, 5]) expect(chooseEnemyPlayer(players, id, world)).toBe(1);
    fell(world, tcs.get(1)!);
    expect(chooseEnemyPlayer(players, 2, world)).toBe(1);
  });

  it("an allied AI picks the enemy-team player whose town centre is nearest its own", () => {
    // allies 1: team 1 = {1, 2}, team 2 = {3, 4, 5}.
    const { world, players } = setup(1);
    expect(chooseEnemyPlayer(players, 2, world)).toBe(4); // 10 → 20 beats 40 and 60
    // The (AI-driven) human picks the same way.
    expect(chooseEnemyPlayer(players, 1, world)).toBe(4);
  });

  it('replaces a fallen target with the next nearest standing enemy', () => {
    const { world, players, tcs } = setup(1);
    fell(world, tcs.get(4)!);
    expect(chooseEnemyPlayer(players, 2, world)).toBe(3);
    players.markDefeated(3);
    expect(chooseEnemyPlayer(players, 2, world)).toBe(5);
    fell(world, tcs.get(5)!);
    expect(chooseEnemyPlayer(players, 2, world)).toBeUndefined();
  });

  it('an enemy-team AI targets the human while standing, then the nearest standing human-team player', () => {
    // allies 2: team 1 = {1, 2, 3}, team 2 = {4, 5}.
    const { world, players, tcs } = setup(2);
    expect(chooseEnemyPlayer(players, 4, world)).toBe(1);
    expect(chooseEnemyPlayer(players, 5, world)).toBe(1);
    fell(world, tcs.get(1)!);
    expect(chooseEnemyPlayer(players, 4, world)).toBe(2); // 20 → 10 (10 tiles) beats 20 → 40 (20 tiles)
    expect(chooseEnemyPlayer(players, 5, world)).toBe(3); // 60 → 40
  });

  it('breaks distance ties by the smaller player id', () => {
    const world = createEcsWorld();
    const map = new MapData(80, 80);
    const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, 1);
    createBuilding(world, { type: 'town_center', origin: { tx: 30, ty: 30 }, playerId: 2, mapData: map });
    createBuilding(world, { type: 'town_center', origin: { tx: 40, ty: 30 }, playerId: 3, mapData: map });
    createBuilding(world, { type: 'town_center', origin: { tx: 20, ty: 30 }, playerId: 4, mapData: map });
    expect(chooseEnemyPlayer(players, 2, world)).toBe(3);
  });
});
