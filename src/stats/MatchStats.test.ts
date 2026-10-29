import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { Entity } from '../ecs/components';
import { createEcsWorld } from '../ecs/world';
import { gameEvents } from '../game/events';
import { applyDamage, killEntity } from '../game/kill';
import { createPlayers } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { MatchStats } from './MatchStats';

type Damageable = Entity & { health: { current: number; max: number } };

function setup() {
  const world = createEcsWorld();
  const map = new MapData(40, 40);
  const players = createPlayers('hungarian', ['english', 'german']);
  const stats = new MatchStats(world, players);
  const detach = stats.attach();
  return { world, map, players, stats, detach };
}

describe('MatchStats', () => {
  it('kill credit goes to the killer owner; deletes and Gaia deaths give none', () => {
    const { world, map, stats, detach } = setup();
    // Swordsman 60 food + 20 gold = 80; house 30 wood.
    const sword = createUnit(world, { type: 'swordsman', tile: { tx: 1, ty: 1 }, playerId: 2 }) as Damageable;
    expect(applyDamage(world, sword, 9999, 1)).toBe(true);
    const house = createBuilding(world, { type: 'house', origin: { tx: 5, ty: 5 }, playerId: 3, mapData: map }) as Damageable;
    applyDamage(world, house, 9999, 1);
    // A deleted building (killEntity, as BuildingDeletion does) is neither a kill nor a loss.
    const barracks = createBuilding(world, { type: 'barracks', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map }) as Damageable;
    killEntity(world, barracks);
    // A Gaia victim gives no credit and is nobody's loss.
    const deer = createUnit(world, { type: 'scout', tile: { tx: 2, ty: 2 }, playerId: 0 }) as Damageable;
    applyDamage(world, deer, 9999, 1);
    // A death without an attacker is a loss with no credit.
    const v = createUnit(world, { type: 'villager', tile: { tx: 3, ty: 3 }, playerId: 1 }) as Damageable;
    applyDamage(world, v, 9999);

    expect(stats.of(1)).toMatchObject({ killValue: 80 + 30, unitsLost: 1, buildingsLost: 0 });
    expect(stats.of(2)).toMatchObject({ killValue: 0, unitsLost: 1, buildingsLost: 0 });
    expect(stats.of(3)).toMatchObject({ killValue: 0, unitsLost: 0, buildingsLost: 1 });
    detach();
  });

  it('counts only its own world, and nothing once detached', () => {
    const { world, stats, detach } = setup();
    const other = createEcsWorld();
    gameEvents.emit('resourcesDelivered', { world: other, playerId: 1, amount: 50 });
    gameEvents.emit('resourcesDelivered', { world, playerId: 1, amount: 10 });
    gameEvents.emit('unitTrained', { world, playerId: 2, unitType: 'archer' });
    gameEvents.emit('buildingCompleted', { world, playerId: 3, entityId: 9, buildingType: 'house' });
    detach();
    gameEvents.emit('resourcesDelivered', { world, playerId: 1, amount: 10 });
    expect(stats.of(1).gathered).toBe(10);
    expect(stats.of(2).unitsTrained).toBe(1);
    expect(stats.of(3).buildingsBuilt).toBe(1);
  });

  it('takes one timeline sample per 60 game seconds and dates age-ups', () => {
    const { world, players, stats, detach } = setup();
    createUnit(world, { type: 'villager', tile: { tx: 1, ty: 1 }, playerId: 1 });
    gameEvents.emit('resourcesDelivered', { world, playerId: 1, amount: 100 });
    for (let t = 0; t < 185_000; t += 100) {
      if (t === 70_000) players.get(2)!.age = 2;
      stats.update(100);
    }
    expect(stats.timeline.map((s) => s.tMs)).toEqual([60_000, 120_000, 180_000]);
    expect(stats.timeline[0]).toEqual({ tMs: 60_000, scores: [10, 0, 0], pops: [1, 0, 0] });
    expect(stats.timeline[1]!.scores).toEqual([10, 300, 0]);
    expect(stats.of(2).ageUpAtMs).toEqual([70_100]);
    detach();
  });

  it('a match resumed mid-minute samples on the next whole minute; snapshot / restore round trips', () => {
    const { world, players, stats, detach } = setup();
    gameEvents.emit('unitTrained', { world, playerId: 1, unitType: 'villager' });
    stats.update(61_000);
    detach();
    const snap = stats.snapshot();
    const again = new MatchStats(world, players, 90_000);
    again.restore(snap);
    expect(again.snapshot()).toEqual(snap);
    again.update(29_000);
    expect(again.timeline.length).toBe(1);
    again.update(1_000);
    expect(again.timeline.map((s) => s.tMs)).toEqual([60_000, 120_000]);
    // The snapshot is a copy.
    expect(snap.timeline.length).toBe(1);
  });
});
