import { describe, expect, it } from 'vitest';
import { createUnit } from '../ecs/archetypes/createUnit';
import { fireProjectile } from '../ecs/archetypes/projectile';
import { MovementSystem } from '../ecs/systems/MovementSystem';
import { ProjectileSystem } from '../ecs/systems/ProjectileSystem';
import { createEcsWorld } from '../ecs/world';
import type { Entity } from '../ecs/components';
import { leadTargetPoint, predictPoint } from './leadTarget';
import { entityPoint } from './targetGeometry';

type Positioned = Entity & { position: { tx: number; ty: number } };

function walker(speed: number, path: Array<[number, number]>, progress = 0): Positioned {
  return {
    position: { tx: 0, ty: 0 },
    movable: { speed, path: path.map(([tx, ty]) => ({ tx, ty })), progress, facing: 'E' },
  };
}

describe('predictPoint', () => {
  it('a stationary target stays where it is', () => {
    const e: Positioned = { position: { tx: 3, ty: 4 } };
    expect(predictPoint(e, 1000)).toEqual({ x: 3, y: 4 });
  });

  it('follows the path at movable.speed steps per second', () => {
    const e = walker(2, [[1, 0], [2, 0], [3, 0], [4, 0]]);
    const p = predictPoint(e, 750); // 1.5 steps
    expect(p.x).toBeCloseTo(1.5);
    expect(p.y).toBeCloseTo(0);
  });

  it('starts from the current progress on the first step and turns corners', () => {
    const e = walker(1, [[1, 0], [1, 1], [1, 2]], 0.5);
    const p = predictPoint(e, 1000); // 0.5 left on step 1, then 0.5 into step 2
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(0.5);
  });

  it('stops at the end of the path', () => {
    const e = walker(3, [[1, 0], [2, 0]]);
    expect(predictPoint(e, 5000)).toEqual({ x: 2, y: 0 });
  });

  it('matches where MovementSystem actually puts the unit', () => {
    const world = createEcsWorld();
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 2, ty: 2 }, playerId: 2 });
    u.movable!.path = [3, 4, 5, 6, 7, 8].map((tx) => ({ tx, ty: 2 }));
    const predicted = predictPoint(u as Positioned, 1200);
    const move = new MovementSystem(world);
    for (let i = 0; i < 75; i++) move.update(16);
    const actual = entityPoint(u as Positioned);
    expect(predicted.x).toBeCloseTo(actual.x, 5);
    expect(predicted.y).toBeCloseTo(actual.y, 5);
  });
});

describe('leadTargetPoint', () => {
  it('aims at a stationary target directly', () => {
    const e: Positioned = { position: { tx: 8, ty: 2 } };
    expect(leadTargetPoint({ x: 0, y: 0 }, e, 10, 120)).toEqual({ x: 8, y: 2 });
  });

  it('aims ahead of a walking target, consistent with the flight time', () => {
    const from = { x: 0, y: 0 };
    const e = walker(1, Array.from({ length: 12 }, (_, i): [number, number] => [0, 7 + i]));
    e.position = { tx: 0, ty: 6 };
    const p = leadTargetPoint(from, e, 10, 120);
    expect(p.y).toBeGreaterThan(6.5);
    // Converged: target reaches p after exactly the flight time to p.
    const flightMs = (Math.hypot(p.x, p.y) / 10) * 1000;
    expect(predictPoint(e, flightMs).y).toBeCloseTo(p.y, 2);
  });

  it('lets an arrow hit a target walking across its line at 7 tiles', () => {
    const world = createEcsWorld();
    const projectiles = new ProjectileSystem(world);
    const move = new MovementSystem(world);
    const victim = createUnit(world, { type: 'villager', tile: { tx: 12, ty: 2 }, playerId: 2 });
    victim.movable!.path = Array.from({ length: 12 }, (_, i) => ({ tx: 12, ty: 3 + i }));
    const hp = victim.health!.current;
    fireProjectile(world, {
      kind: 'arrow',
      from: { x: 5, y: 2 },
      target: victim,
      ownerId: 1,
      payload: { meleeAtk: 0, pierceAtk: 4, bonusVsCavalry: 0 },
    });
    for (let i = 0; i < 80; i++) {
      move.update(16);
      projectiles.update(16);
    }
    expect(world.entities.some((e) => e.projectile)).toBe(false);
    expect(victim.health!.current).toBeLessThan(hp);
  });
});
