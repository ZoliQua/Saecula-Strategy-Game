import { describe, expect, it } from 'vitest';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createUnit } from '../archetypes/createUnit';
import { fireProjectile } from '../archetypes/projectile';
import { createEcsWorld } from '../world';
import type { Entity } from '../components';
import { CombatSystem } from './CombatSystem';
import { ProjectileSystem } from './ProjectileSystem';

function setup() {
  const world = createEcsWorld();
  const map = new MapData(24, 24, TERRAIN.grass);
  const combat = new CombatSystem(world, map);
  const projectiles = new ProjectileSystem(world);
  const shots = () => world.entities.filter((e) => e.projectile);
  return { world, map, combat, projectiles, shots };
}

describe('ranged attacks via projectiles', () => {
  it('an archer spawns an arrow instead of dealing instant damage, then hits on arrival', () => {
    const { world, combat, projectiles, shots } = setup();
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 5 }, playerId: 2 });
    world.addComponent(archer, 'attackIntent', { targetId: victim.id! });
    const hp = victim.health!.current;
    combat.update(16);
    expect(victim.health!.current).toBe(hp);
    expect(shots()).toHaveLength(1);
    expect(shots()[0]!.projectile!.kind).toBe('arrow');
    expect(archer.attacker!.cooldownRemaining).toBeGreaterThan(0);
    projectiles.update(100);
    expect(victim.health!.current).toBe(hp);
    projectiles.update(2000);
    expect(victim.health!.current).toBeLessThan(hp);
    expect(shots()).toHaveLength(0);
  });

  it('projectiles carry no selectable/position/owner components', () => {
    const { world, combat, shots } = setup();
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'villager', tile: { tx: 8, ty: 5 }, playerId: 2 });
    world.addComponent(archer, 'attackIntent', { targetId: victim.id! });
    combat.update(16);
    const s = shots()[0] as Entity;
    expect(s.selectable).toBeUndefined();
    expect(s.position).toBeUndefined();
    expect(s.owner).toBeUndefined();
  });

  it('kills a victim through the shared kill path', () => {
    const { world, combat, projectiles } = setup();
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'villager', tile: { tx: 8, ty: 5 }, playerId: 2 });
    victim.health!.current = 1;
    world.addComponent(archer, 'attackIntent', { targetId: victim.id! });
    combat.update(16);
    projectiles.update(2000);
    expect(victim.dying).toBeDefined();
    combat.update(16);
    expect(archer.attackIntent).toBeUndefined();
  });

  it('misses a target that has moved away from the impact point', () => {
    const { world, combat, projectiles } = setup();
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 5 }, playerId: 2 });
    world.addComponent(archer, 'attackIntent', { targetId: victim.id! });
    combat.update(16);
    const hp = victim.health!.current;
    victim.position = { tx: 9, ty: 8 };
    projectiles.update(2000);
    expect(victim.health!.current).toBe(hp);
  });

  it('does nothing if the target died in flight', () => {
    const { world, combat, projectiles, shots } = setup();
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const victim = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 5 }, playerId: 2 });
    world.addComponent(archer, 'attackIntent', { targetId: victim.id! });
    combat.update(16);
    world.remove(victim);
    projectiles.update(2000);
    expect(shots()).toHaveLength(0);
  });

  it('melee units still hit instantly', () => {
    const { world, combat } = setup();
    const s = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const v = createUnit(world, { type: 'villager', tile: { tx: 6, ty: 5 }, playerId: 2 });
    world.addComponent(s, 'attackIntent', { targetId: v.id! });
    combat.update(16);
    expect(v.health!.current).toBeLessThan(v.health!.max);
  });
});

describe('cannonball splash', () => {
  it('damages every enemy within 1 tile of impact, spares friendlies and distant units', () => {
    const { world, combat, projectiles } = setup();
    const cannon = createUnit(world, { type: 'cannon', tile: { tx: 4, ty: 10 }, playerId: 1 });
    const main = createUnit(world, { type: 'swordsman', tile: { tx: 10, ty: 10 }, playerId: 2 });
    const near = createUnit(world, { type: 'swordsman', tile: { tx: 11, ty: 10 }, playerId: 2 });
    const diag = createUnit(world, { type: 'archer', tile: { tx: 10, ty: 11 }, playerId: 2 });
    const far = createUnit(world, { type: 'swordsman', tile: { tx: 13, ty: 10 }, playerId: 2 });
    const friend = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 10 }, playerId: 1 });
    world.addComponent(cannon, 'attackIntent', { targetId: main.id! });
    combat.update(16);
    expect(world.entities.find((e) => e.projectile)!.projectile!.kind).toBe('cannonball');
    projectiles.update(5000);
    for (const e of [main, near, diag]) expect(e.health!.current).toBeLessThan(e.health!.max);
    expect(far.health!.current).toBe(far.health!.max);
    expect(friend.health!.current).toBe(friend.health!.max);
  });

  it('damages an adjacent enemy building', () => {
    const { world, projectiles } = setup();
    const target = createUnit(world, { type: 'swordsman', tile: { tx: 10, ty: 10 }, playerId: 2 });
    const building: Entity = {
      id: 999,
      position: { tx: 11, ty: 9 },
      building: { type: 'house', footprint: { width: 2, height: 2 } },
      health: { current: 500, max: 500 },
      armor: { melee: 0, pierce: 6 },
      owner: { playerId: 2 },
    };
    world.add(building);
    fireProjectile(world, {
      kind: 'cannonball',
      from: { x: 4, y: 10 },
      target,
      ownerId: 1,
      payload: { meleeAtk: 0, pierceAtk: 40, bonusVsCavalry: 0 },
    });
    projectiles.update(5000);
    expect(building.health!.current).toBe(500 - 34);
  });
});
