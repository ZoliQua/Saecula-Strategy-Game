import { describe, expect, it } from 'vitest';
import { createPlayers } from '../../game/PlayerManager';
import { FogOfWarData } from '../../map/FogOfWarData';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { isFriendly } from '../../game/diplomacy';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { fireProjectile } from '../archetypes/projectile';
import { createEcsWorld } from '../world';
import { CombatSystem } from './CombatSystem';
import { FogOfWarSystem } from './FogOfWarSystem';
import { MonkSystem } from './MonkSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { TowerCombatSystem } from './TowerCombatSystem';

/** Players 1 and 2 allied (team 1), 3 the enemy (M16, allies = 1). */
function setup() {
  const map = new MapData(32, 32, TERRAIN.grass);
  const world = createEcsWorld();
  const players = createPlayers('hungarian', ['english', 'german'], undefined, 1);
  return { map, world, players };
}

describe('allies never fight (M16)', () => {
  it('combat drops an attack intent on an ally, but keeps one on an enemy and on Gaia', () => {
    const { map, world, players } = setup();
    const combat = new CombatSystem(world, map, players);
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const ally = createUnit(world, { type: 'villager', tile: { tx: 6, ty: 5 }, playerId: 2 });
    const hp = ally.health!.current;
    world.addComponent(sword, 'attackIntent', { targetId: ally.id! });
    combat.update(100);
    expect(sword.attackIntent).toBeUndefined();
    expect(ally.health!.current).toBe(hp);

    const enemy = createUnit(world, { type: 'villager', tile: { tx: 5, ty: 6 }, playerId: 3 });
    world.addComponent(sword, 'attackIntent', { targetId: enemy.id! });
    combat.update(100);
    expect(enemy.health!.current).toBeLessThan(enemy.health!.max);

    // Gaia stays a valid target of an explicit attack, as before M16.
    const deer = createUnit(world, { type: 'scout', tile: { tx: 4, ty: 5 }, playerId: 0 });
    sword.attacker!.cooldownRemaining = 0;
    world.removeComponent(sword, 'attackIntent');
    world.addComponent(sword, 'attackIntent', { targetId: deer.id! });
    combat.update(100);
    expect(deer.health!.current).toBeLessThan(deer.health!.max);
  });

  it('an allied army next to the human army: nothing attacks, nothing converts, towers stay silent', () => {
    const { map, world, players } = setup();
    const combat = new CombatSystem(world, map, players);
    const towers = new TowerCombatSystem(world, () => null, players);
    const monks = new MonkSystem(world, map, (id) => players.get(id)?.civ ?? 'hungarian', (id) => players.get(id), undefined, players);
    const projectiles = new ProjectileSystem(world, players);
    const tower = createBuilding(world, { type: 'tower', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    const allyArcher = createUnit(world, { type: 'archer', tile: { tx: 12, ty: 10 }, playerId: 2 });
    const allyMonk = createUnit(world, { type: 'monk', tile: { tx: 12, ty: 11 }, playerId: 2 });
    const mine = createUnit(world, { type: 'swordsman', tile: { tx: 13, ty: 11 }, playerId: 1 });
    world.addComponent(allyArcher, 'attackIntent', { targetId: mine.id! });
    world.addComponent(allyMonk, 'convertIntent', { targetId: mine.id!, elapsedMs: 0 });
    for (let i = 0; i < 100; i++) {
      towers.update(100);
      combat.update(100);
      monks.update(100);
      projectiles.update(100);
    }
    expect(tower.attackIntent).toBeUndefined();
    expect(allyArcher.attackIntent).toBeUndefined();
    expect(allyMonk.convertIntent).toBeUndefined();
    expect(mine.owner!.playerId).toBe(1);
    expect(mine.health!.current).toBe(mine.health!.max);
    expect(allyArcher.health!.current).toBe(allyArcher.health!.max);
  });

  it('a tower ignores an ally in range and shoots the enemy', () => {
    const { map, world, players } = setup();
    const towers = new TowerCombatSystem(world, () => null, players);
    const tower = createBuilding(world, { type: 'tower', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    createUnit(world, { type: 'swordsman', tile: { tx: 11, ty: 10 }, playerId: 2 });
    towers.update(300);
    expect(tower.attackIntent).toBeUndefined();
    const enemy = createUnit(world, { type: 'swordsman', tile: { tx: 13, ty: 10 }, playerId: 3 });
    towers.update(300);
    expect(tower.attackIntent?.targetId).toBe(enemy.id);
  });

  it('cannon splash hurts the enemy but not an ally standing next to it', () => {
    const { world, players } = setup();
    const projectiles = new ProjectileSystem(world, players);
    const enemy = createUnit(world, { type: 'swordsman', tile: { tx: 10, ty: 10 }, playerId: 3 });
    const ally = createUnit(world, { type: 'swordsman', tile: { tx: 10, ty: 11 }, playerId: 2 });
    fireProjectile(world, { kind: 'cannonball', from: { x: 4, y: 10 }, target: enemy, ownerId: 1, payload: { meleeAtk: 0, pierceAtk: 40, bonusVsCavalry: 0 } });
    projectiles.update(10_000);
    expect(enemy.health!.current).toBeLessThan(enemy.health!.max);
    expect(ally.health!.current).toBe(ally.health!.max);
  });

  it('a single-target shot aimed at an ally does no damage', () => {
    const { world, players } = setup();
    const projectiles = new ProjectileSystem(world, players);
    const ally = createUnit(world, { type: 'swordsman', tile: { tx: 8, ty: 8 }, playerId: 2 });
    fireProjectile(world, { kind: 'arrow', from: { x: 4, y: 8 }, target: ally, ownerId: 1, payload: { meleeAtk: 0, pierceAtk: 10, bonusVsCavalry: 0 } });
    projectiles.update(10_000);
    expect(ally.health!.current).toBe(ally.health!.max);
  });
});

describe('shared vision (M16)', () => {
  it("an allied unit's sight reveals the viewer's fog; an enemy's does not", () => {
    const { world, players } = setup();
    const fog = new FogOfWarData(32, 32);
    const system = new FogOfWarSystem(world, fog, 1, undefined, (owner) => isFriendly(players, owner, 1));
    createUnit(world, { type: 'scout', tile: { tx: 20, ty: 20 }, playerId: 2 });
    createUnit(world, { type: 'scout', tile: { tx: 5, ty: 25 }, playerId: 3 });
    system.update(250);
    expect(fog.isVisible(20, 20)).toBe(true);
    expect(fog.isVisible(5, 25)).toBe(false);
  });

  it('without a sharing rule only the viewer\'s own emitters count (default)', () => {
    const { world } = setup();
    const fog = new FogOfWarData(32, 32);
    const system = new FogOfWarSystem(world, fog, 1);
    createUnit(world, { type: 'scout', tile: { tx: 20, ty: 20 }, playerId: 2 });
    createUnit(world, { type: 'scout', tile: { tx: 5, ty: 5 }, playerId: 1 });
    system.update(250);
    expect(fog.isVisible(20, 20)).toBe(false);
    expect(fog.isVisible(5, 5)).toBe(true);
  });
});
