import { describe, expect, it } from 'vitest';
import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createResourceNode } from '../../ecs/archetypes/resource';
import { createVillager } from '../../ecs/archetypes/villager';
import { createEcsWorld } from '../../ecs/world';
import { createPlayer } from '../../game/Player';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { AIPlayer } from '../AIPlayer';
import { EasyStrategy } from './EasyStrategy';

const MIN = 60_000;
/** rng that replays `rolls`, then returns 0 (keeps to the build order, earliest rolls). */
const scripted = (rolls: number[] = []) => {
  const queue = [...rolls];
  return () => queue.shift() ?? 0;
};

function setup(villagers = 4, rolls: number[] = []) {
  const map = new MapData(24, 24, TERRAIN.grass);
  const world = createEcsWorld();
  createBuilding(world, { type: 'town_center', origin: { tx: 4, ty: 4 }, playerId: 2, mapData: map });
  for (let i = 0; i < villagers; i++) {
    createVillager(world, { tile: { tx: 3 + (i % 6), ty: 8 + Math.floor(i / 6) }, playerId: 2 });
  }
  // Nearby trees and a berry bush so gathering targets exist.
  map.setTile(10, 6, TERRAIN.forest);
  createResourceNode(world, { tile: { tx: 10, ty: 6 }, type: 'wood' });
  map.setTile(6, 10, TERRAIN.berries);
  createResourceNode(world, { tile: { tx: 6, ty: 10 }, type: 'food' });
  const player = createPlayer({ id: 2, isHuman: false });
  player.resources = { food: 50, wood: 200, gold: 200 };
  const ai = new AIPlayer(player, new EasyStrategy(scripted(rolls)));
  return { map, world, player, ai };
}

const swordsmen = (world: ReturnType<typeof setup>['world'], n: number) => {
  for (let i = 0; i < n; i++) createUnit(world, { type: 'swordsman', tile: { tx: 10 + (i % 4), ty: 9 + Math.floor(i / 4) }, playerId: 2 });
};

describe('EasyStrategy', () => {
  it('assigns idle villagers to gather wood and food', () => {
    const { world, ai, map } = setup();
    ai.update({ world, mapData: map }, 2000);
    const villagers = world.entities.filter((e) => e.unit?.unitType === 'villager' && e.owner?.playerId === 2);
    expect(villagers.filter((v) => v.gatherIntent).length).toBeGreaterThanOrEqual(3);
  });

  it('trains villagers first, through queueUnit with its own stockpile', () => {
    const { world, ai, map, player } = setup();
    ai.update({ world, mapData: map }, 2000);
    const tc = world.entities.find((e) => e.building?.type === 'town_center')!;
    expect(tc.trainingQueue!.entries.map((e) => e.unitType)).toEqual(['villager']);
    expect(player.resources.food).toBe(0);
  });

  it('with 8 villagers it starts a house near the TC', () => {
    const { world, ai, map, player } = setup(8);
    player.resources.wood = 120;
    ai.update({ world, mapData: map }, 2000);
    const houses = world.entities.filter((e) => e.building?.type === 'house' && e.owner?.playerId === 2);
    expect(houses.length).toBe(1);
    expect(houses[0]!.underConstruction).toBeDefined();
    expect(player.resources.wood).toBe(90);
    expect(world.entities.some((e) => e.buildCommand?.targetId === houses[0]!.id)).toBe(true);
  });

  it('does not attack before its rolled first-attack time', () => {
    const { world, ai, map } = setup();
    swordsmen(world, 8);
    createBuilding(world, { type: 'town_center', origin: { tx: 14, ty: 9 }, playerId: 1, mapData: map });
    ai.update({ world, mapData: map, enemyPlayerId: 1 }, 2000);
    expect(world.entities.some((e) => e.attackIntent && e.owner?.playerId === 2)).toBe(false);
  });

  it('sends 8+ swordsmen at the human TC it has seen, never at another AI', () => {
    const { world, ai, map } = setup();
    swordsmen(world, 8);
    const rival = createBuilding(world, { type: 'town_center', origin: { tx: 10, ty: 14 }, playerId: 3, mapData: map });
    const humanTc = createBuilding(world, { type: 'town_center', origin: { tx: 15, ty: 9 }, playerId: 1, mapData: map });
    // Rolls: age-up chance, age-up delay, first attack (8 min).
    ai.update({ world, mapData: map, enemyPlayerId: 1 }, 8 * MIN + 1000);
    const targets = world.entities.filter((e) => e.attackIntent && e.owner?.playerId === 2).map((e) => e.attackIntent!.targetId);
    expect(targets.length).toBe(8);
    expect(new Set(targets)).toEqual(new Set([humanTc.id]));
    expect(targets).not.toContain(rival.id);
  });

  it('explores instead of attacking blind when it has not found the enemy', () => {
    const { world, ai, map } = setup();
    swordsmen(world, 8);
    createBuilding(world, { type: 'town_center', origin: { tx: 20, ty: 20 }, playerId: 1, mapData: map });
    ai.update({ world, mapData: map, enemyPlayerId: 1 }, 8 * MIN + 1000);
    const army = world.entities.filter((e) => e.unit?.unitType === 'swordsman');
    expect(army.some((e) => e.attackIntent)).toBe(false);
    expect(army.every((e) => e.moveIntent)).toBe(true);
  });

  it('defends its base against any intruder, even another AI', () => {
    const { world, ai, map } = setup();
    swordsmen(world, 2);
    const raider = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 5 }, playerId: 3 });
    ai.update({ world, mapData: map, enemyPlayerId: 1 }, 2000);
    const defenders = world.entities.filter((e) => e.owner?.playerId === 2 && e.unit?.unitType === 'swordsman');
    expect(defenders.every((d) => d.attackIntent?.targetId === raider.id)).toBe(true);
  });

  describe('age-up', () => {
    const rich = { food: 5000, wood: 500, gold: 5000 };
    const tcOf = (world: ReturnType<typeof setup>['world']) =>
      world.entities.find((e) => e.building?.type === 'town_center');

    it('never researches when the 50% roll fails', () => {
      const { world, map, ai, player } = setup(4, [0.9, 0]);
      player.resources = { ...rich };
      ai.update({ world, mapData: map }, 20 * MIN);
      ai.update({ world, mapData: map }, 2000);
      expect(tcOf(world)?.research).toBeUndefined();
    });

    it('waits for the delay, then researches Feudalism when affordable', () => {
      const { world, map, ai, player } = setup(4, [0.1, 0]);
      player.resources = { ...rich };
      ai.update({ world, mapData: map }, 8 * MIN - 5_000);
      expect(tcOf(world)?.research).toBeUndefined();
      tcOf(world)!.trainingQueue!.entries.length = 0;
      const before = player.resources.food;
      ai.update({ world, mapData: map }, 10_000);
      expect(tcOf(world)?.research?.techId).toBe('feudalism');
      expect(player.resources.food).toBe(before - 500);
    });

    it('does not research when it cannot afford it', () => {
      const { world, map, ai, player } = setup(4, [0.1, 0]);
      player.resources = { food: 100, wood: 0, gold: 0 };
      ai.update({ world, mapData: map }, 8 * MIN + 5_000);
      expect(tcOf(world)?.research).toBeUndefined();
    });
  });
});
