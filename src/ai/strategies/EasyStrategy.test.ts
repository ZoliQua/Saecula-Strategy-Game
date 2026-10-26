import { describe, expect, it } from 'vitest';
import { createBuilding } from '../../ecs/archetypes/building';
import { createResourceNode } from '../../ecs/archetypes/resource';
import { createVillager } from '../../ecs/archetypes/villager';
import { createEcsWorld } from '../../ecs/world';
import { createPlayer } from '../../game/Player';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { AIPlayer } from '../AIPlayer';
import { EasyStrategy } from './EasyStrategy';

function setup() {
  const map = new MapData(20, 20, TERRAIN.grass);
  const world = createEcsWorld();
  // AI town center + 4 villagers near it.
  createBuilding(world, {
    type: 'town_center',
    origin: { tx: 4, ty: 4 },
    playerId: 2,
    mapData: map,
  });
  for (let i = 0; i < 4; i++) {
    createVillager(world, { tile: { tx: 3 + i, ty: 8 }, playerId: 2 });
  }
  // Nearby trees and a berry bush so gathering targets exist.
  map.setTile(10, 6, TERRAIN.forest);
  createResourceNode(world, { tile: { tx: 10, ty: 6 }, type: 'wood' });
  map.setTile(6, 10, TERRAIN.berries);
  createResourceNode(world, { tile: { tx: 6, ty: 10 }, type: 'food' });
  const player = createPlayer({ id: 2, isHuman: false });
  player.resources = { food: 50, wood: 200, gold: 200 };
  const ai = new AIPlayer(player, new EasyStrategy());
  return { map, world, player, ai };
}

describe('EasyStrategy', () => {
  it('assigns idle villagers to gather wood and food', () => {
    const { world, ai, map } = setup();
    ai.update({ world, mapData: map }, 2000); // past first REPLAN

    const villagers = world.entities.filter(
      (e) => e.unit?.unitType === 'villager' && e.owner?.playerId === 2,
    );
    const withGatherIntent = villagers.filter((v) => v.gatherIntent);
    expect(withGatherIntent.length).toBeGreaterThanOrEqual(3);
  });

  it('kicks off a house build when wood >= 100', () => {
    const { world, ai, map, player } = setup();
    player.resources.wood = 120;
    ai.update({ world, mapData: map }, 2000);
    const houses = world.entities.filter(
      (e) => e.building?.type === 'house' && e.owner?.playerId === 2,
    );
    expect(houses.length).toBe(1);
    expect(houses[0]!.underConstruction).toBeDefined();
  });

  it('targets the enemy TC once enough swordsmen exist', () => {
    const { world, ai, map } = setup();
    // Seed 4 AI swordsmen + a human TC.
    const human = createPlayer({ id: 1, isHuman: true });
    void human;
    createBuilding(world, {
      type: 'town_center',
      origin: { tx: 15, ty: 15 },
      playerId: 1,
      mapData: map,
    });
    for (let i = 0; i < 4; i++) {
      const s = createVillager(world, { tile: { tx: 5, ty: 7 + i }, playerId: 2 });
      // Simulate a swordsman by swapping the unit tag + sufficient attacker.
      s.unit = { unitType: 'swordsman' };
    }
    ai.update({ world, mapData: map }, 2000);
    const attacking = world.entities.filter(
      (e) => e.attackIntent && e.owner?.playerId === 2,
    );
    expect(attacking.length).toBeGreaterThan(0);
  });

  it('attacks the human TC rather than another AI when several AIs exist', () => {
    const { world, ai, map } = setup();
    const rival = createBuilding(world, { type: 'town_center', origin: { tx: 5, ty: 12 }, playerId: 3, mapData: map });
    const humanTc = createBuilding(world, { type: 'town_center', origin: { tx: 15, ty: 15 }, playerId: 1, mapData: map });
    for (let i = 0; i < 4; i++) {
      const s = createVillager(world, { tile: { tx: 5, ty: 7 + i }, playerId: 2 });
      s.unit = { unitType: 'swordsman' };
    }
    ai.update({ world, mapData: map, enemyPlayerId: 1 }, 2000);
    const targets = world.entities
      .filter((e) => e.attackIntent && e.owner?.playerId === 2)
      .map((e) => e.attackIntent!.targetId);
    expect(targets.length).toBeGreaterThan(0);
    expect(new Set(targets)).toEqual(new Set([humanTc.id]));
    expect(targets).not.toContain(rival.id);
  });

  describe('age-up', () => {
    const MIN = 8 * 60_000;
    const rich = { food: 5000, wood: 500, gold: 5000 };

    function aiWith(rolls: number[]) {
      const base = setup();
      const queue = [...rolls];
      const ai = new AIPlayer(base.player, new EasyStrategy(() => queue.shift() ?? 0));
      base.player.resources = { ...rich };
      return { ...base, ai };
    }
    const tcOf = (world: ReturnType<typeof setup>['world']) =>
      world.entities.find((e) => e.building?.type === 'town_center');

    it('never researches when the 50% roll fails', () => {
      const { world, map, ai, player } = aiWith([0.9, 0]);
      ai.update({ world, mapData: map }, 20 * 60_000);
      expect(tcOf(world)?.research).toBeUndefined();
      expect(player.resources.food).toBe(5000);
    });

    it('waits for the delay, then researches Feudalism when affordable', () => {
      const { world, map, ai, player } = aiWith([0.1, 0]);
      ai.update({ world, mapData: map }, MIN - 5_000);
      expect(tcOf(world)?.research).toBeUndefined();
      ai.update({ world, mapData: map }, 10_000);
      expect(tcOf(world)?.research?.techId).toBe('feudalism');
      expect(player.resources.food).toBe(4500);
    });

    it('does not research when it cannot afford it', () => {
      const { world, map, ai, player } = aiWith([0.1, 0]);
      player.resources = { food: 100, wood: 0, gold: 0 };
      ai.update({ world, mapData: map }, MIN + 5_000);
      expect(tcOf(world)?.research).toBeUndefined();
    });
  });
});
