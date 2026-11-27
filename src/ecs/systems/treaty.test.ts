import { describe, expect, it } from 'vitest';
import { createPlayers } from '../../game/PlayerManager';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import type { TreatyGate } from '../../game/treaty';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { fireProjectile } from '../archetypes/projectile';
import { createEcsWorld } from '../world';
import { CombatSystem } from './CombatSystem';
import { MonkSystem } from './MonkSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { TowerCombatSystem } from './TowerCombatSystem';

/** Two players, no allies (everyone hostile), and a switchable treaty. */
function setup() {
  const map = new MapData(32, 32, TERRAIN.grass);
  const world = createEcsWorld();
  const players = createPlayers('hungarian', ['english']);
  const state = { on: true };
  const treaty: TreatyGate = () => state.on;
  return { map, world, players, state, treaty };
}

const ARROW = { meleeAtk: 0, pierceAtk: 10, bonusVsCavalry: 0 };

describe('the treaty (M16)', () => {
  it('drops an attack intent on a player while it holds; the same unit attacks again right after it ends', () => {
    const { map, world, players, state, treaty } = setup();
    const combat = new CombatSystem(world, map, players, undefined, treaty);
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const foe = createUnit(world, { type: 'villager', tile: { tx: 6, ty: 5 }, playerId: 2 });
    world.addComponent(sword, 'attackIntent', { targetId: foe.id! });
    combat.update(100);
    expect(sword.attackIntent).toBeUndefined();
    expect(foe.health!.current).toBe(foe.health!.max);

    // Mid-fight end (Review Focus): nothing sticky, a new order on the same target fights at once.
    state.on = false;
    world.addComponent(sword, 'attackIntent', { targetId: foe.id! });
    combat.update(100);
    expect(sword.attackIntent?.targetId).toBe(foe.id);
    expect(foe.health!.current).toBeLessThan(foe.health!.max);
  });

  it('Gaia stays attackable during the treaty', () => {
    const { map, world, players, treaty } = setup();
    const combat = new CombatSystem(world, map, players, undefined, treaty);
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const deer = createUnit(world, { type: 'scout', tile: { tx: 4, ty: 5 }, playerId: 0 });
    world.addComponent(sword, 'attackIntent', { targetId: deer.id! });
    combat.update(100);
    expect(deer.health!.current).toBeLessThan(deer.health!.max);
  });

  it('a tower stays silent while it holds and fires once it ends', () => {
    const { map, world, players, state, treaty } = setup();
    const towers = new TowerCombatSystem(world, () => null, players, treaty);
    const tower = createBuilding(world, { type: 'tower', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    const foe = createUnit(world, { type: 'swordsman', tile: { tx: 12, ty: 10 }, playerId: 2 });
    towers.update(300);
    expect(tower.attackIntent).toBeUndefined();
    state.on = false;
    towers.update(300);
    expect(tower.attackIntent?.targetId).toBe(foe.id);
  });

  it('a tower that already aims at a player lets go when the treaty holds', () => {
    const { map, world, players, state, treaty } = setup();
    state.on = false;
    const towers = new TowerCombatSystem(world, () => null, players, treaty);
    const tower = createBuilding(world, { type: 'tower', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    createUnit(world, { type: 'swordsman', tile: { tx: 12, ty: 10 }, playerId: 2 });
    towers.update(300);
    expect(tower.attackIntent).toBeDefined();
    state.on = true;
    towers.update(300);
    expect(tower.attackIntent).toBeUndefined();
  });

  it('projectiles do not hurt a player while it holds (single shot and splash), and do after', () => {
    const { world, players, state, treaty } = setup();
    const projectiles = new ProjectileSystem(world, players, treaty);
    const foe = createUnit(world, { type: 'swordsman', tile: { tx: 8, ty: 8 }, playerId: 2 });
    const next = createUnit(world, { type: 'swordsman', tile: { tx: 8, ty: 9 }, playerId: 2 });
    fireProjectile(world, { kind: 'arrow', from: { x: 4, y: 8 }, target: foe, ownerId: 1, payload: ARROW });
    fireProjectile(world, { kind: 'cannonball', from: { x: 4, y: 8 }, target: foe, ownerId: 1, payload: { ...ARROW, pierceAtk: 40 } });
    projectiles.update(10_000);
    expect(foe.health!.current).toBe(foe.health!.max);
    expect(next.health!.current).toBe(next.health!.max);

    state.on = false;
    fireProjectile(world, { kind: 'cannonball', from: { x: 4, y: 8 }, target: foe, ownerId: 1, payload: { ...ARROW, pierceAtk: 40 } });
    projectiles.update(10_000);
    expect(foe.health!.current).toBeLessThan(foe.health!.max);
    expect(next.health!.current).toBeLessThan(next.health!.max);
  });

  it('no conversion while it holds; a new order converts after it ends', () => {
    const { map, world, players, state, treaty } = setup();
    const monks = new MonkSystem(world, map, (id) => players.get(id)?.civ ?? 'hungarian', (id) => players.get(id), undefined, players, treaty);
    const monk = createUnit(world, { type: 'monk', tile: { tx: 10, ty: 10 }, playerId: 1 });
    const foe = createUnit(world, { type: 'swordsman', tile: { tx: 11, ty: 10 }, playerId: 2 });
    world.addComponent(monk, 'convertIntent', { targetId: foe.id!, elapsedMs: 0 });
    monks.update(100);
    expect(monk.convertIntent).toBeUndefined();
    for (let i = 0; i < 200; i++) monks.update(100);
    expect(foe.owner!.playerId).toBe(2);

    state.on = false;
    world.addComponent(monk, 'convertIntent', { targetId: foe.id!, elapsedMs: 0 });
    for (let i = 0; i < 200 && foe.owner!.playerId === 2; i++) monks.update(100);
    expect(foe.owner!.playerId).toBe(1);
  });
});
