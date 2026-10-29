import { describe, expect, it } from 'vitest';
import { createUnit } from '../ecs/archetypes/createUnit';
import { CombatSystem } from '../ecs/systems/CombatSystem';
import { ProjectileSystem } from '../ecs/systems/ProjectileSystem';
import { createEcsWorld } from '../ecs/world';
import { gameEvents, type GameEvents } from '../game/events';
import { MapData } from '../map/MapData';

describe('kill credit from the combat systems', () => {
  it('melee and projectile kills name the killer owner', () => {
    const world = createEcsWorld();
    const map = new MapData(24, 24);
    const combat = new CombatSystem(world, map);
    const projectiles = new ProjectileSystem(world);
    const seen: GameEvents['entityKilled'][] = [];
    const off = gameEvents.on('entityKilled', (e) => seen.push(e));
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const prey = createUnit(world, { type: 'villager', tile: { tx: 6, ty: 5 }, playerId: 2 });
    prey.health!.current = 1;
    world.addComponent(sword, 'attackIntent', { targetId: prey.id! });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 12 }, playerId: 3 });
    const mark = createUnit(world, { type: 'villager', tile: { tx: 8, ty: 12 }, playerId: 2 });
    mark.health!.current = 1;
    world.addComponent(archer, 'attackIntent', { targetId: mark.id! });
    for (let i = 0; i < 40; i++) {
      combat.update(100);
      projectiles.update(100);
    }
    off();
    expect(seen.map((e) => [e.killerId, e.victimOwnerId, e.unitType])).toEqual([
      [1, 2, 'villager'],
      [3, 2, 'villager'],
    ]);
    expect(seen.every((e) => e.world === world)).toBe(true);
  });
});
