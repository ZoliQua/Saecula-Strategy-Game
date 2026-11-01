import { describe, expect, it } from 'vitest';
import { AI_MEDIUM } from '../config/aiBalance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createResourceNode } from '../ecs/archetypes/resource';
import { createVillager } from '../ecs/archetypes/villager';
import type { Entity } from '../ecs/components';
import { MovementSystem } from '../ecs/systems/MovementSystem';
import { PathfindingSystem } from '../ecs/systems/PathfindingSystem';
import { TransportSystem } from '../ecs/systems/TransportSystem';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import type { AIContext } from './AIPlayer';
import { LandingControl } from './LandingControl';
import { NavalPlay } from './NavalPlay';
import { Perception } from './perception';
import { ThoughtLog } from './thoughts';

/** Two islands: land at x < 14 (west, the AI's) and x > 30 (east, the enemy's), sea between. */
function islands() {
  const map = new MapData(44, 30, TERRAIN.grass);
  for (let ty = 0; ty < 30; ty++) for (let tx = 14; tx <= 30; tx++) map.setTile(tx, ty, TERRAIN.water);
  const world = createEcsWorld();
  const fog = new FogOfWarData(44, 30);
  for (let ty = 0; ty < 30; ty++) for (let tx = 0; tx < 44; tx++) fog.markVisible(tx, ty);
  const player = createPlayer({ id: 2 });
  player.resources = { food: 5000, wood: 5000, gold: 5000 };
  const perception = new Perception();
  let now = 0;
  const ctx = (): AIContext => ({ world, mapData: map, player, timeMs: now, fog, enemyPlayerId: 1 });
  const pathing = new PathfindingSystem(world, map);
  const movement = new MovementSystem(world, null, map);
  const transports = new TransportSystem(world, map);
  const step = (ms: number, each: (c: AIContext) => void) => {
    for (let t = 0; t < ms; t += 100) {
      now += 100;
      pathing.update();
      movement.update(100);
      transports.update(100);
      if (t % 1000 === 0) each(ctx());
    }
  };
  return { map, world, player, perception, ctx, step };
}

describe('AI navy (M14)', () => {
  it('a landing boards the army, sails across and hands the units ashore to the army as a wave', () => {
    const s = islands();
    createBuilding(s.world, { type: 'town_center', origin: { tx: 3, ty: 12 }, playerId: 2, mapData: s.map });
    const enemyTc = createBuilding(s.world, { type: 'town_center', origin: { tx: 38, ty: 12 }, playerId: 1, mapData: s.map });
    const ship = createUnit(s.world, { type: 'transport', tile: { tx: 14, ty: 13 }, playerId: 2 });
    const army = [0, 1, 2, 3].map((i) => createUnit(s.world, { type: 'swordsman', tile: { tx: 9, ty: 10 + i }, playerId: 2 }));
    const waves: Entity[][] = [];
    const landing = new LandingControl(new ThoughtLog(), (_c, _v, units) => void waves.push([...units]));
    const target = enemyTc.position!;
    expect(landing.start(s.ctx(), army, [ship], target)).toBe(4);
    for (const u of army) expect(landing.has(u)).toBe(true);
    s.step(120_000, (c) => landing.update(c, s.perception.update(c)));
    expect(landing.active).toBe(false);
    expect(waves).toHaveLength(1);
    expect(waves[0]!.map((u) => u.id).sort()).toEqual(army.map((u) => u.id).sort());
    for (const u of army) expect(u.position!.tx).toBeGreaterThan(30);
  });

  it('navy: a dock on the shore near the base, then fishing boats that fish', () => {
    const s = islands();
    createBuilding(s.world, { type: 'town_center', origin: { tx: 6, ty: 12 }, playerId: 2, mapData: s.map });
    for (let i = 0; i < 12; i++) createVillager(s.world, { tile: { tx: 2 + (i % 4), ty: 3 + Math.floor(i / 4) }, playerId: 2 });
    s.map.setTile(18, 14, TERRAIN.fish);
    createResourceNode(s.world, { tile: { tx: 18, ty: 14 }, type: 'food', amount: 200, sea: true });
    const trained: string[] = [];
    const naval = new NavalPlay(AI_MEDIUM.navy, {
      ownCount: (v, t, f) => v.buildings.filter((b) => b.building?.type === t && (!f || !b.underConstruction)).length,
      startBuilding: (c, _v, t, a) => {
        const origin = { tx: a.tx + 5, ty: a.ty };
        return createBuilding(c.world, { type: t, origin, playerId: 2, mapData: c.mapData });
      },
      train: (c, v, t) => {
        trained.push(t);
        const dock = v.buildings.find((b) => b.building?.type === 'dock')!;
        createUnit(c.world, { type: t, tile: { tx: dock.position!.tx + 3, ty: dock.position!.ty + 1 }, playerId: 2 });
        return true;
      },
      transportsWanted: () => 0,
    });
    naval.build(s.ctx(), s.perception.update(s.ctx()));
    const dock = s.world.entities.find((e) => e.building?.type === 'dock');
    expect(dock).toBeDefined();
    for (let i = 0; i < 6; i++) naval.train(s.ctx(), s.perception.update(s.ctx()));
    expect(trained.filter((t) => t === 'fishing_boat')).toHaveLength(AI_MEDIUM.navy.fishingBoats);
    naval.control(s.ctx(), s.perception.update(s.ctx()));
    const boats = s.world.entities.filter((e) => e.unit?.unitType === 'fishing_boat');
    for (const b of boats) expect(b.gatherIntent).toBeDefined();
  });

  it('a landing does not wait for a member whose boarding order was dropped', () => {
    const s = islands();
    createBuilding(s.world, { type: 'town_center', origin: { tx: 3, ty: 12 }, playerId: 2, mapData: s.map });
    const ship = createUnit(s.world, { type: 'transport', tile: { tx: 14, ty: 13 }, playerId: 2 });
    const a = createUnit(s.world, { type: 'swordsman', tile: { tx: 13, ty: 13 }, playerId: 2 });
    const b = createUnit(s.world, { type: 'swordsman', tile: { tx: 2, ty: 2 }, playerId: 2 });
    const landing = new LandingControl(new ThoughtLog(), () => undefined);
    landing.start(s.ctx(), [a, b], [ship], { tx: 38, ty: 13 });
    // b's order is dropped (its transport out of reach, TransportSystem's timeout).
    s.world.removeComponent(b, 'boardIntent');
    // Well inside AI_NAVAL.boardTimeoutMs: the landing sails with a alone.
    s.step(2_100, (c) => landing.update(c, s.perception.update(c)));
    expect(ship.cargo?.units.map((u) => u.id)).toEqual([a.id]);
    expect(landing.has(b)).toBe(false);
    expect(ship.unloadIntent).toBeDefined();
  });
});
