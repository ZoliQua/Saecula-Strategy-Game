import { describe, expect, it } from 'vitest';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { createWall } from '../archetypes/wall';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createEcsWorld } from '../world';
import { CombatSystem } from './CombatSystem';
import { ConstructionSystem } from './ConstructionSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { TowerCombatSystem } from './TowerCombatSystem';
import { releaseLift, towerLaunchHeight } from './combatFx/fxMath';

function setup(fog: FogOfWarData | null = null) {
  const map = new MapData(24, 24, TERRAIN.grass);
  const world = createEcsWorld();
  const tower = createBuilding(world, { type: 'tower', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
  const unitAt = (tx: number, ty: number, playerId = 2) =>
    createUnit(world, { type: 'swordsman', tile: { tx, ty }, playerId });
  return {
    map,
    world,
    tower,
    unitAt,
    towers: new TowerCombatSystem(world, (id) => (id === 1 ? fog : null)),
    combat: new CombatSystem(world, map),
    projectiles: new ProjectileSystem(world, null),
  };
}

describe('TowerCombatSystem', () => {
  it('targets the nearest enemy unit in range', () => {
    const { towers, tower, unitAt } = setup();
    unitAt(14, 10); // distance 4
    const near = unitAt(12, 10); // distance 2
    unitAt(20, 10); // out of range
    towers.update(300);
    expect(tower.attackIntent?.targetId).toBe(near.id);
  });

  it('ignores own units, out-of-range units and buildings', () => {
    const { towers, tower, unitAt, world, map } = setup();
    unitAt(11, 10, 1);
    unitAt(17, 10);
    createBuilding(world, { type: 'house', origin: { tx: 12, ty: 12 }, playerId: 2, mapData: map });
    towers.update(300);
    expect(tower.attackIntent).toBeUndefined();
  });

  it('drops a target that walked out of range and retargets', () => {
    const { towers, tower, unitAt } = setup();
    const first = unitAt(12, 10);
    towers.update(300);
    expect(tower.attackIntent?.targetId).toBe(first.id);
    first.position = { tx: 20, ty: 10 };
    const second = unitAt(13, 11);
    towers.update(300);
    expect(tower.attackIntent?.targetId).toBe(second.id);
  });

  it('does not shoot enemies the owner cannot see', () => {
    const fog = new FogOfWarData(24, 24);
    const { towers, tower, unitAt } = setup(fog);
    unitAt(12, 10);
    towers.update(300);
    expect(tower.attackIntent).toBeUndefined();
    fog.markVisible(12, 10);
    towers.update(300);
    expect(tower.attackIntent).toBeDefined();
  });

  it('an AI-owned tower aims through its owner\'s own fog of war', () => {
    const map = new MapData(24, 24, TERRAIN.grass);
    const world = createEcsWorld();
    const aiFog = new FogOfWarData(24, 24);
    const humanFog = new FogOfWarData(24, 24);
    const tower = createBuilding(world, { type: 'tower', origin: { tx: 10, ty: 10 }, playerId: 2, mapData: map });
    createUnit(world, { type: 'swordsman', tile: { tx: 12, ty: 10 }, playerId: 1 });
    const towers = new TowerCombatSystem(world, (id) => (id === 2 ? aiFog : id === 1 ? humanFog : null));
    humanFog.markVisible(12, 10); // the human seeing the tile does not help the AI tower
    towers.update(300);
    expect(tower.attackIntent).toBeUndefined();
    aiFog.markVisible(12, 10);
    towers.update(300);
    expect(tower.attackIntent).toBeDefined();
  });

  it('fires arrows that hurt the target, once per cooldown', () => {
    const { towers, combat, projectiles, world, tower, unitAt } = setup();
    const enemy = unitAt(13, 10);
    towers.update(300);
    combat.update(16);
    const arrows = [...world.with('projectile')];
    expect(arrows).toHaveLength(1);
    expect(arrows[0]!.projectile.kind).toBe('arrow');
    expect(tower.attacker!.cooldownRemaining).toBeGreaterThan(0);
    const before = enemy.health!.current;
    for (let i = 0; i < 60; i++) projectiles.update(50);
    expect(enemy.health!.current).toBeLessThan(before);
    // still on cooldown right after the shot: no second arrow yet
    const second = setup();
    second.unitAt(13, 10);
    second.towers.update(300);
    second.combat.update(16);
    second.combat.update(500);
    expect([...second.world.with('projectile')]).toHaveLength(1);
  });

  it('a tower under construction does not shoot until finished', () => {
    const { towers, world, map, unitAt, tower } = setup();
    world.remove(tower);
    const site = createBuilding(world, {
      type: 'tower', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map, underConstruction: true,
    });
    unitAt(12, 10);
    towers.update(300);
    expect(site.attackIntent).toBeUndefined();
    expect(site.attacker).toBeUndefined();
    const builder = createUnit(world, { type: 'villager', tile: { tx: 9, ty: 10 }, playerId: 1 });
    world.addComponent(builder, 'buildCommand', { targetId: site.id! });
    const construction = new ConstructionSystem(world, map);
    for (let i = 0; i < 90; i++) construction.update(1000);
    expect(site.underConstruction).toBeUndefined();
    expect(site.attacker).toBeDefined();
  });
});

describe('createWall', () => {
  it('blocks its tile as a site, has 300 HP cap and no attacker', () => {
    const map = new MapData(8, 8, TERRAIN.grass);
    const world = createEcsWorld();
    const wall = createWall(world, { tile: { tx: 3, ty: 3 }, playerId: 1, mapData: map, underConstruction: true });
    expect(map.isPassable(3, 3)).toBe(false);
    expect(wall.health!.max).toBe(300);
    expect(wall.attacker).toBeUndefined();
  });
});

describe('walls in the world', () => {
  it('a wall line blocks pathing and a builder chains through the segments', () => {
    const map = new MapData(14, 14, TERRAIN.grass);
    const world = createEcsWorld();
    const sites = [4, 5, 6].map((ty) =>
      createWall(world, { tile: { tx: 7, ty }, playerId: 1, mapData: map, underConstruction: true }),
    );
    for (const ty of [4, 5, 6]) expect(map.isPassable(7, ty)).toBe(false);
    const builder = createUnit(world, { type: 'villager', tile: { tx: 6, ty: 5 }, playerId: 1 });
    world.addComponent(builder, 'buildCommand', { targetId: sites[0]!.id! });
    const construction = new ConstructionSystem(world, map);
    for (let i = 0; i < 40; i++) construction.update(1000);
    for (const s of sites) expect(s.underConstruction).toBeUndefined();
    expect(builder.buildCommand).toBeUndefined();
  });

  it('looses its arrows from the tower top (launch height), units from their hands', () => {
    const { towers, combat, world, unitAt } = setup();
    unitAt(12, 10);
    towers.update(300);
    combat.update(16);
    const shots = [...world.with('projectile')];
    expect(shots).toHaveLength(1);
    expect(shots[0]!.projectile.launchHeight).toBe(towerLaunchHeight(1));
    expect(towerLaunchHeight(3)).toBeGreaterThan(towerLaunchHeight(1));
    expect(releaseLift(shots[0]!.projectile, { liftFrom: 19 })).toBe(towerLaunchHeight(1));
    expect(releaseLift({}, { liftFrom: 19 })).toBe(19);
  });
});
