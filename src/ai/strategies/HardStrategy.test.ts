import { describe, expect, it } from 'vitest';
import { createBuilding } from '../../ecs/archetypes/building';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { createVillager } from '../../ecs/archetypes/villager';
import { createEcsWorld } from '../../ecs/world';
import { createPlayer } from '../../game/Player';
import { MapData } from '../../map/MapData';
import { createRng } from '../../map/random';
import { AI_HARD } from '../../config/aiBalance';
import { AIPlayer } from '../AIPlayer';
import { HardStrategy } from './HardStrategy';

function setup(age: 1 | 2, gold = 2000) {
  const map = new MapData(48, 48);
  const world = createEcsWorld();
  createBuilding(world, { type: 'town_center', origin: { tx: 20, ty: 20 }, playerId: 2, mapData: map });
  for (let i = 0; i < 8; i++) createVillager(world, { tile: { tx: 24 + (i % 4), ty: 19 + Math.floor(i / 4) * 3 }, playerId: 2 });
  const player = createPlayer({ id: 2, age, resources: { food: 2000, wood: 2000, gold } });
  const hard = new HardStrategy(createRng(5));
  const ai = new AIPlayer(player, hard);
  const tick = (ms: number) => {
    for (let t = 0; t < ms; t += 500) ai.update({ world, mapData: map, enemyPlayerId: 1 }, 500);
  };
  return { map, world, player, hard, tick, ai };
}

const own = (world: ReturnType<typeof setup>['world'], type: string) =>
  world.entities.filter((e) => e.owner?.playerId === 2 && e.building?.type === type);

describe('HardStrategy', () => {
  it('turtles against an enemy army at its base: towers and a wall line toward the attack side', () => {
    const { world, hard, tick } = setup(2);
    // Five enemy swordsmen east of the base, in sight of the villagers.
    for (let i = 0; i < 5; i++) createUnit(world, { type: 'swordsman', tile: { tx: 30, ty: 19 + i }, playerId: 1 });
    tick(6000);
    expect(hard.currentStance).toBe('turtle');
    expect(hard.thoughts().stance).toBe('turtle');
    const walls = own(world, 'wall');
    expect(walls.length).toBeGreaterThan(0);
    // East of the TC, across the approach.
    expect(walls.every((w) => w.position!.tx > 23)).toBe(true);
    const towers = own(world, 'tower');
    expect(towers.length).toBe(1);
    expect(towers[0]!.position!.tx).toBeGreaterThan(22);
  });

  it('does not see what its fog hides: an enemy army out of sight changes nothing', () => {
    const { world, hard, tick } = setup(2);
    for (let i = 0; i < 5; i++) createUnit(world, { type: 'swordsman', tile: { tx: 44, ty: 40 + i }, playerId: 1 });
    tick(6000);
    expect(hard.currentStance).toBe('balanced');
    expect(own(world, 'wall')).toHaveLength(0);
  });

  it('trains villagers through the town centre queue while below its villager share', () => {
    // No gold: the age-up cannot take the town centre.
    const { world, map, tick } = setup(1, 0);
    // Room for more villagers (the TC alone houses 5).
    for (const tx of [10, 13]) createBuilding(world, { type: 'house', origin: { tx, ty: 10 }, playerId: 2, mapData: map });
    tick(2000);
    const tc = own(world, 'town_center')[0]!;
    expect(tc.trainingQueue!.entries.some((e) => e.unitType === 'villager')).toBe(true);
  });

  it('sends a villager raid with its knights once enemy villagers were seen (after the earliest raid time)', () => {
    const { world, hard, tick, ai, map } = setup(2, 0);
    const knights = [0, 1, 2].map((i) => createUnit(world, { type: 'knight', tile: { tx: 30, ty: 19 + i }, playerId: 2 }));
    const villagers = [0, 1].map((i) => createVillager(world, { tile: { tx: 33 + i, ty: 20 }, playerId: 1 }));
    // Jump past the earliest raid time, then let it look around and decide.
    ai.update({ world, mapData: map, enemyPlayerId: 1 }, AI_HARD.harass.notBeforeMs);
    tick(6000);
    expect(hard.raidsLaunched).toBe(1);
    const prey = new Set(villagers.map((v) => v.id));
    expect(knights.filter((k) => k.attackIntent && prey.has(k.attackIntent.targetId)).length).toBeGreaterThanOrEqual(2);
  });

  it('a starved AI does not wait for its raiders forever: with too little food for a scout and no farm, it builds a farm', () => {
    const { world, map, player, ai, tick } = setup(1, 0);
    for (const tx of [10, 13]) createBuilding(world, { type: 'house', origin: { tx, ty: 10 }, playerId: 2, mapData: map });
    createBuilding(world, { type: 'barracks', origin: { tx: 14, ty: 22 }, playerId: 2, mapData: map });
    // No food source anywhere; 70 food buys a farm (60) but not a scout (80).
    player.resources = { food: 70, wood: 500, gold: 0 };
    // Past the first-attack time (rolled at most 5 min), squad still empty.
    ai.update({ world, mapData: map, enemyPlayerId: 1 }, AI_HARD.firstAttackMs.max);
    tick(3000);
    expect(own(world, 'farm').length).toBeGreaterThanOrEqual(1);
  });
});
