import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gameEvents } from '../../game/events';
import { createPlayer } from '../../game/Player';
import { PlayerManager } from '../../game/PlayerManager';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { uiStore } from '../../ui/store';
import { createBuilding } from '../archetypes/building';
import { createResourceNode } from '../archetypes/resource';
import { createUnit } from '../archetypes/createUnit';
import { createVillager } from '../archetypes/villager';
import { startResearch, playerWallet } from '../research';
import { createEcsWorld } from '../world';
import { CombatSystem } from './CombatSystem';
import { GatheringSystem } from './GatheringSystem';
import { MovementSystem } from './MovementSystem';
import { PopulationSystem } from './PopulationSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { ResearchSystem } from './ResearchSystem';
import { TrainingSystem } from './TrainingSystem';
import type { TechId } from '../../types';

function setup(p1: TechId[] = [], p2: TechId[] = []) {
  const map = new MapData(24, 24, TERRAIN.grass);
  const world = createEcsWorld();
  const a = createPlayer({ id: 1, researched: new Set(p1), resources: { food: 5000, wood: 5000, gold: 5000 } });
  const b = createPlayer({ id: 2, researched: new Set(p2) });
  const players = new PlayerManager([a, b]);
  return { map, world, a, b, players };
}

describe('technology effects in systems', () => {
  beforeEach(() => uiStore.setState({ resources: { food: 0, wood: 0, gold: 0 }, population: { current: 0, cap: 0 } }));

  it('melee attack and armour techs change dealt damage', () => {
    const { map, world, players } = setup(['blade_sharpening_1']);
    const attacker = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'swordsman', tile: { tx: 6, ty: 5 }, playerId: 2 });
    world.addComponent(attacker, 'attackIntent', { targetId: victim.id! });
    new CombatSystem(world, map, players).update(100);
    // 7 melee - 0 melee def = 7 (base would be 6).
    expect(victim.health!.max - victim.health!.current).toBe(7);
  });

  it('victim armour tech reduces damage; the unit component itself is untouched', () => {
    const { map, world, players } = setup([], ['armor_1']);
    const attacker = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'swordsman', tile: { tx: 6, ty: 5 }, playerId: 2 });
    world.addComponent(attacker, 'attackIntent', { targetId: victim.id! });
    new CombatSystem(world, map, players).update(100);
    expect(victim.health!.max - victim.health!.current).toBe(5);
    expect(attacker.attacker!.meleeAtk).toBe(6);
  });

  it('ranged attack bonus is copied into the projectile payload', () => {
    const { map, world, players } = setup(['arrow_sharpening_1']);
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'swordsman', tile: { tx: 8, ty: 5 }, playerId: 2 });
    world.addComponent(archer, 'attackIntent', { targetId: victim.id! });
    new CombatSystem(world, map, players).update(100);
    const shot = world.with('projectile').first!;
    expect(shot.projectile!.payload.pierceAtk).toBe(5);
    new ProjectileSystem(world, players).update(10_000);
    // 5 pierce - 1 pierce def = 4
    expect(victim.health!.max - victim.health!.current).toBe(4);
  });

  it('gather rate follows the owner techs, per player', () => {
    const { map, world, players } = setup(['double_saw'], []);
    createBuilding(world, { type: 'town_center', origin: { tx: 0, ty: 0 }, playerId: 1, mapData: map });
    const tree = createResourceNode(world, { tile: { tx: 5, ty: 5 }, type: 'wood', amount: 500 });
    const v1 = createVillager(world, { tile: { tx: 4, ty: 5 } });
    v1.gatherIntent = { nodeId: tree.id! };
    const sys = new GatheringSystem(world, map, players);
    sys.update(1000);
    expect(v1.gatherer!.carrying).toBeCloseTo(0.6 * 1.1, 5);
  });

  it('movement speed follows infantry march for infantry only', () => {
    const { world, players } = setup(['infantry_march']);
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 0, ty: 0 }, playerId: 1 });
    const knight = createUnit(world, { type: 'knight', tile: { tx: 0, ty: 1 }, playerId: 1 });
    sword.movable!.path = [{ tx: 5, ty: 0 }];
    knight.movable!.path = [{ tx: 5, ty: 1 }];
    sword.movable!.speed = 1;
    knight.movable!.speed = 1;
    new MovementSystem(world, players).update(500);
    expect(sword.movable!.progress).toBeCloseTo(0.55, 5);
    expect(knight.movable!.progress).toBeCloseTo(0.5, 5);
  });

  it('artisan guilds add +2 cap per finished house and no more than once', () => {
    const { map, world, players, a } = setup();
    createBuilding(world, { type: 'town_center', origin: { tx: 0, ty: 0 }, playerId: 1, mapData: map });
    createBuilding(world, { type: 'house', origin: { tx: 6, ty: 0 }, playerId: 1, mapData: map });
    const pop = new PopulationSystem(world, 1, players);
    pop.update();
    expect(uiStore.getState().population.cap).toBe(10);
    a.researched.add('artisan_guilds');
    pop.update();
    expect(uiStore.getState().population.cap).toBe(12);
  });

  describe('cavalry HP', () => {
    const off: Array<() => void> = [];
    afterEach(() => off.splice(0).forEach((f) => f()));

    it('scales existing cavalry once on completion, proportionally, and not other units', () => {
      const { map, world, players, a } = setup();
      const bk = createBuilding(world, { type: 'barracks', origin: { tx: 0, ty: 0 }, playerId: 1, mapData: map });
      const knight = createUnit(world, { type: 'knight', tile: { tx: 9, ty: 9 }, playerId: 1 });
      const sword = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 10 }, playerId: 1 });
      const enemyKnight = createUnit(world, { type: 'knight', tile: { tx: 9, ty: 11 }, playerId: 2 });
      knight.health!.current = 50;
      a.age = 2;
      expect(startResearch(world, bk, 'cavalry_training', a, playerWallet(a)).ok).toBe(true);
      const sys = new ResearchSystem(world, players);
      sys.update(100_000);
      expect(knight.health).toEqual({ current: 55, max: 110 });
      expect(sword.health!.max).toBe(40);
      expect(enemyKnight.health!.max).toBe(100);
      sys.update(100_000);
      expect(knight.health!.max).toBe(110);
    });

    it('applies to cavalry trained after the tech', () => {
      const { map, world, players } = setup(['cavalry_training']);
      const stable = createBuilding(world, { type: 'stable', origin: { tx: 0, ty: 0 }, playerId: 1, mapData: map });
      stable.trainingQueue!.entries.push({ unitType: 'knight', elapsed: 0, totalTime: 1 });
      new TrainingSystem(world, map, players).update(2000);
      const knight = world.with('unit').entities.find((e) => e.unit!.unitType === 'knight')!;
      expect(knight.health).toEqual({ current: 110, max: 110 });
    });
  });

  it('a tech cannot be started twice, and emits no second completion', () => {
    const { map, world, players, a } = setup();
    a.age = 2;
    const sm = createBuilding(world, { type: 'blacksmith', origin: { tx: 0, ty: 0 }, playerId: 1, mapData: map });
    const sm2 = createBuilding(world, { type: 'blacksmith', origin: { tx: 6, ty: 0 }, playerId: 1, mapData: map });
    const done: TechId[] = [];
    const off = gameEvents.on('techResearched', (e) => done.push(e.techId));
    expect(startResearch(world, sm, 'armor_1', a, playerWallet(a)).ok).toBe(true);
    expect(startResearch(world, sm2, 'armor_1', a, playerWallet(a)).reason).toBe('already-in-progress');
    new ResearchSystem(world, players).update(100_000);
    expect(startResearch(world, sm, 'armor_1', a, playerWallet(a)).reason).toBe('unavailable');
    expect(done).toEqual(['armor_1']);
    off();
  });
});
