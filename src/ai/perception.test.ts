import { describe, expect, it } from 'vitest';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createResourceNode } from '../ecs/archetypes/resource';
import { killEntity } from '../game/kill';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { Perception } from './perception';

function setup() {
  const map = new MapData(40, 40);
  const world = createEcsWorld();
  const fog = new FogOfWarData(40, 40);
  const player = createPlayer({ id: 2 });
  const ctx = { world, mapData: map, player, timeMs: 0, fog };
  return { map, world, fog, ctx, perception: new Perception() };
}

const reveal = (fog: FogOfWarData, x0: number, y0: number, x1: number, y1: number) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fog.markVisible(x, y);
};

describe('Perception', () => {
  it('always knows its own entities, and foreign ones only through its own fog', () => {
    const { world, map, fog, ctx, perception } = setup();
    const ownTc = createBuilding(world, { type: 'town_center', origin: { tx: 30, ty: 30 }, playerId: 2, mapData: map });
    createUnit(world, { type: 'villager', tile: { tx: 35, ty: 35 }, playerId: 2 });
    createUnit(world, { type: 'knight', tile: { tx: 36, ty: 35 }, playerId: 2 });
    const seen = createUnit(world, { type: 'archer', tile: { tx: 5, ty: 5 }, playerId: 1 });
    createUnit(world, { type: 'archer', tile: { tx: 20, ty: 20 }, playerId: 1 });
    reveal(fog, 4, 4, 6, 6);
    const view = perception.update(ctx);
    expect(view.townCenter).toBe(ownTc);
    expect(view.villagers.length).toBe(1);
    expect(view.military.map((u) => u.unit?.unitType)).toEqual(['knight']);
    expect(view.visibleEnemyUnits).toEqual([seen]);
  });

  it('remembers a seen enemy building out of sight, and forgets it once it sees the spot empty', () => {
    const { world, map, fog, ctx, perception } = setup();
    const house = createBuilding(world, { type: 'house', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    expect(perception.update(ctx).knownEnemyBuildings).toEqual([]);
    reveal(fog, 11, 11, 11, 11); // one footprint tile is enough
    expect(perception.update(ctx).knownEnemyBuildings.map((b) => b.id)).toEqual([house.id]);
    fog.dimVisibleToExplored();
    expect(perception.update(ctx).knownEnemyBuildings.map((b) => b.id)).toEqual([house.id]);
    killEntity(world, house as typeof house & { health: { current: number; max: number } });
    // Destroyed while unseen: still remembered...
    expect(perception.update(ctx).knownEnemyBuildings.length).toBe(1);
    world.remove(house);
    reveal(fog, 10, 10, 10, 10);
    // ...until the AI looks again.
    expect(perception.update(ctx).knownEnemyBuildings).toEqual([]);
  });

  it('knows resources on explored tiles only, and never another player\'s farm', () => {
    const { world, map, fog, ctx, perception } = setup();
    const near = createResourceNode(world, { tile: { tx: 3, ty: 3 }, type: 'gold' });
    createResourceNode(world, { tile: { tx: 30, ty: 3 }, type: 'gold' });
    const foreignFarm = createBuilding(world, { type: 'farm', origin: { tx: 4, ty: 4 }, playerId: 1, mapData: map });
    foreignFarm.resourceNode = { type: 'food', amount: 300, maxAmount: 300 };
    reveal(fog, 2, 2, 6, 6);
    fog.dimVisibleToExplored(); // explored, not in sight: terrain memory is enough for resources
    const view = perception.update(ctx);
    expect(view.resources.gold).toEqual([near]);
    expect(view.resources.food).toEqual([]);
  });

  it('flags hostile units near its buildings as threats and keeps decaying sightings', () => {
    const { world, map, fog, ctx, perception } = setup();
    createBuilding(world, { type: 'house', origin: { tx: 20, ty: 20 }, playerId: 2, mapData: map });
    createUnit(world, { type: 'knight', tile: { tx: 24, ty: 20 }, playerId: 3 });
    createUnit(world, { type: 'knight', tile: { tx: 39, ty: 39 }, playerId: 1 });
    reveal(fog, 0, 0, 39, 39);
    const view = perception.update(ctx);
    expect(view.threats.map((t) => t.owner?.playerId)).toEqual([3]);
    expect(view.enemySightings.knight).toBe(2);
    for (const e of [...world.entities]) if (e.unit) world.remove(e);
    const later = perception.update({ ...ctx, timeMs: 60_000 });
    expect(later.enemySightings.knight).toBeCloseTo(1.2, 5);
  });
});
