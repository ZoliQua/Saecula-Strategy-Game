import { describe, expect, it } from 'vitest';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { createUnit } from '../archetypes/createUnit';
import { createEcsWorld } from '../world';
import { CombatSystem } from './CombatSystem';
import { DeathSystem } from './DeathSystem';

function setup() {
  const map = new MapData(16, 16, TERRAIN.grass);
  const world = createEcsWorld();
  const attacker = createUnit(world, {
    type: 'swordsman',
    tile: { tx: 5, ty: 5 },
    playerId: 1,
  });
  const victim = createUnit(world, {
    type: 'villager',
    tile: { tx: 6, ty: 5 },
    playerId: 2,
  });
  const combat = new CombatSystem(world, map);
  const death = new DeathSystem(world, map);
  return { map, world, attacker, victim, combat, death };
}

describe('CombatSystem', () => {
  it('deals damage when adjacent and cooldown is ready', () => {
    const { combat, attacker, victim, world } = setup();
    world.addComponent(attacker, 'attackIntent', { targetId: victim.id! });
    const startHp = victim.health!.current;
    combat.update(100);
    expect(victim.health!.current).toBeLessThan(startHp);
    expect(attacker.attacker!.cooldownRemaining).toBeGreaterThan(0);
  });

  it('respects the attack cooldown', () => {
    const { combat, attacker, victim, world } = setup();
    world.addComponent(attacker, 'attackIntent', { targetId: victim.id! });
    combat.update(100);
    const afterFirst = victim.health!.current;
    combat.update(100); // still on cooldown
    expect(victim.health!.current).toBe(afterFirst);
  });

  it('kills the victim and tags dying', () => {
    const { combat, attacker, victim, world } = setup();
    victim.health!.current = 1;
    world.addComponent(attacker, 'attackIntent', { targetId: victim.id! });
    combat.update(100);
    expect(victim.health!.current).toBeLessThanOrEqual(0);
    expect(victim.dying).toBeDefined();
  });

  it('death system removes the entity after ttl', () => {
    const { combat, death, attacker, victim, world } = setup();
    victim.health!.current = 1;
    world.addComponent(attacker, 'attackIntent', { targetId: victim.id! });
    combat.update(100);
    // run several ticks past the death ttl (900ms)
    for (let i = 0; i < 12; i++) death.update(100);
    expect(world.entities.find((e) => e.id === victim.id)).toBeUndefined();
  });

  it('refuses to attack friendlies', () => {
    const { combat, world } = setup();
    const ally1 = createUnit(world, {
      type: 'swordsman',
      tile: { tx: 10, ty: 5 },
      playerId: 1,
    });
    const ally2 = createUnit(world, {
      type: 'villager',
      tile: { tx: 11, ty: 5 },
      playerId: 1,
    });
    world.addComponent(ally1, 'attackIntent', { targetId: ally2.id! });
    const startHp = ally2.health!.current;
    combat.update(100);
    expect(ally2.health!.current).toBe(startHp);
    expect(ally1.attackIntent).toBeUndefined();
  });

  it('walks into range when target is far', () => {
    const { combat, world, attacker } = setup();
    const farVictim = createUnit(world, {
      type: 'villager',
      tile: { tx: 12, ty: 5 },
      playerId: 2,
    });
    world.addComponent(attacker, 'attackIntent', { targetId: farVictim.id! });
    combat.update(100);
    expect(attacker.movable!.path.length).toBeGreaterThan(0);
  });

  it('a kill that also ends the victim\'s own attack does not break the attacker loop', () => {
    const map = new MapData(16, 16, TERRAIN.grass);
    const world = createEcsWorld();
    // Pairs fighting back: each victim is one hit from death and attacks its killer.
    const fighters = [0, 1, 2].flatMap((i) => {
      const a = createUnit(world, { type: 'swordsman', tile: { tx: 2, ty: 2 + i * 3 }, playerId: 1 });
      const b = createUnit(world, { type: 'villager', tile: { tx: 3, ty: 2 + i * 3 }, playerId: 2 });
      b.health!.current = 1;
      world.addComponent(b, 'attackIntent', { targetId: a.id! });
      world.addComponent(a, 'attackIntent', { targetId: b.id! });
      return [a, b];
    });
    expect(() => new CombatSystem(world, map).update(100)).not.toThrow();
    expect(fighters.filter((f) => f.dying).length).toBe(3);
  });
});
