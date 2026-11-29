import { describe, expect, it } from 'vitest';
import { AI_MEDIUM } from '../config/aiBalance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createResourceNode } from '../ecs/archetypes/resource';
import { createVillager } from '../ecs/archetypes/villager';
import type { Entity } from '../ecs/components';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import type { AIContext } from './AIPlayer';
import { AIPlayer } from './AIPlayer';
import { Perception } from './perception';
import { RepairPlay } from './RepairPlay';
import { EasyStrategy } from './strategies/EasyStrategy';
import { MediumStrategy } from './strategies/MediumStrategy';

const TUNE = AI_MEDIUM.repair;

function damage(b: Entity, fraction: number): void {
  b.health!.current = Math.round(b.health!.max * fraction);
}

function scene(villagers = 4) {
  const map = new MapData(48, 48, TERRAIN.grass);
  const world = createEcsWorld();
  const fog = new FogOfWarData(48, 48);
  for (let ty = 0; ty < 48; ty++) for (let tx = 0; tx < 48; tx++) fog.markVisible(tx, ty);
  const tc = createBuilding(world, { type: 'town_center', origin: { tx: 4, ty: 4 }, playerId: 2, mapData: map });
  const house = createBuilding(world, { type: 'house', origin: { tx: 12, ty: 4 }, playerId: 2, mapData: map });
  const vills = Array.from({ length: villagers }, (_, i) => createVillager(world, { tile: { tx: 4 + i, ty: 9 }, playerId: 2 }));
  const player = createPlayer({ id: 2, isHuman: false });
  player.resources = { food: 200, wood: 200, gold: 200 };
  const play = new RepairPlay(TUNE);
  const perception = new Perception();
  const ctx = (timeMs: number): AIContext => ({ world, mapData: map, player, timeMs, fog });
  const tick = (t: number) => play.update(ctx(t), perception.update(ctx(t)));
  const repairing = () => vills.filter((v) => v.repairIntent);
  return { map, world, tc, house, vills, player, tick, repairing };
}

describe('RepairPlay', () => {
  it('repairs the town centre first, even when another building is worse off', () => {
    const { tc, house, tick, repairing } = scene();
    damage(house, 0.2);
    damage(tc, 0.5);
    tick(0);
    expect(repairing().length).toBeGreaterThan(0);
    expect(repairing().every((v) => v.repairIntent!.targetId === tc.id)).toBe(true);
  });

  it('then the lowest HP share, and nothing above belowHpFraction', () => {
    const { world, map, house, tick, repairing } = scene();
    const barracks = createBuilding(world, { type: 'barracks', origin: { tx: 20, ty: 4 }, playerId: 2, mapData: map });
    damage(house, 0.5);
    damage(barracks, 0.3);
    tick(0);
    expect(repairing().map((v) => v.repairIntent!.targetId)).toEqual([barracks.id, barracks.id]);

    const s = scene();
    damage(s.house, TUNE.belowHpFraction + 0.05);
    s.tick(0);
    expect(s.repairing()).toEqual([]);
  });

  it('sends at most maxVillagers, counting those already repairing', () => {
    const { tc, house, tick, repairing } = scene(6);
    damage(tc, 0.3);
    tick(0);
    expect(repairing().length).toBe(TUNE.maxVillagers);
    damage(house, 0.3);
    tick(TUNE.everyMs);
    expect(repairing().length).toBe(TUNE.maxVillagers);
  });

  it('takes idle villagers first, then the gatherers nearest the building', () => {
    const { world, house, vills, tick, repairing } = scene(4);
    const tree = createResourceNode(world, { tile: { tx: 30, ty: 30 }, type: 'wood' });
    // Every villager gathers except the farthest one, which is idle.
    for (const v of vills.slice(0, 3)) world.addComponent(v, 'gatherIntent', { nodeId: tree.id! });
    damage(house, 0.3);
    tick(0);
    // The idle one (vills[3]) and the gatherer nearest the house (vills[2]).
    expect(new Set(repairing())).toEqual(new Set([vills[3], vills[2]]));
  });

  it('does not repair with an enemy seen near the building, and calls a repair off when one comes', () => {
    const { world, house, tick, repairing } = scene();
    damage(house, 0.3);
    const enemy = createUnit(world, { type: 'swordsman', tile: { tx: 13 + TUNE.safeRadius - 2, ty: 5 }, playerId: 1 });
    tick(0);
    expect(repairing()).toEqual([]);
    world.remove(enemy);
    tick(TUNE.everyMs);
    expect(repairing().length).toBe(TUNE.maxVillagers);
    createUnit(world, { type: 'swordsman', tile: { tx: 14, ty: 8 }, playerId: 1 });
    // The stop is checked on every upkeep, not only every everyMs.
    tick(TUNE.everyMs + 1000);
    expect(repairing()).toEqual([]);
  });

  it('ignores an enemy it cannot see (no cheating)', () => {
    const s = scene();
    damage(s.house, 0.3);
    createUnit(s.world, { type: 'swordsman', tile: { tx: 14, ty: 8 }, playerId: 1 });
    // The AI's fog hides that one tile.
    const fog = new FogOfWarData(48, 48);
    for (let ty = 0; ty < 48; ty++) for (let tx = 0; tx < 48; tx++) if (!(tx === 14 && ty === 8)) fog.markVisible(tx, ty);
    const ctx: AIContext = { world: s.world, mapData: s.map, player: s.player, timeMs: 0, fog };
    new RepairPlay(TUNE).update(ctx, new Perception().update(ctx));
    expect(s.repairing().length).toBe(TUNE.maxVillagers);
  });

  it('does not repair when the wallet cannot pay one unit of each resource the building costs', () => {
    const { player, house, tick, repairing } = scene();
    damage(house, 0.3);
    player.resources = { food: 500, wood: 0, gold: 500 };
    tick(0);
    expect(repairing()).toEqual([]);
    player.resources = { food: 0, wood: 1, gold: 0 };
    tick(TUNE.everyMs);
    expect(repairing().length).toBe(TUNE.maxVillagers);
  });

  it('checks for new repairs at most every everyMs', () => {
    const { house, tick, repairing } = scene();
    tick(0);
    damage(house, 0.3);
    tick(1000);
    expect(repairing()).toEqual([]);
    tick(TUNE.everyMs);
    expect(repairing().length).toBe(TUNE.maxVillagers);
  });

  it('leaves a building under construction alone', () => {
    const { world, map, tick, repairing } = scene();
    const site = createBuilding(world, { type: 'barracks', origin: { tx: 20, ty: 4 }, playerId: 2, mapData: map, underConstruction: true });
    damage(site, 0.1);
    tick(0);
    expect(repairing()).toEqual([]);
  });
});

describe('repair by strategy', () => {
  function match(strategy: 'easy' | 'medium') {
    const map = new MapData(32, 32, TERRAIN.grass);
    const world = createEcsWorld();
    const tc = createBuilding(world, { type: 'town_center', origin: { tx: 4, ty: 4 }, playerId: 2, mapData: map });
    for (let i = 0; i < 5; i++) createVillager(world, { tile: { tx: 3 + i, ty: 9 }, playerId: 2 });
    map.setTile(12, 6, TERRAIN.forest);
    createResourceNode(world, { tile: { tx: 12, ty: 6 }, type: 'wood' });
    const player = createPlayer({ id: 2, isHuman: false });
    player.resources = { food: 500, wood: 500, gold: 500 };
    const ai = new AIPlayer(player, strategy === 'easy' ? new EasyStrategy(() => 0) : new MediumStrategy(() => 0));
    damage(tc, 0.3);
    let repaired = false;
    for (let t = 0; t < 30_000; t += 500) {
      ai.update({ world, mapData: map }, 500);
      if (world.entities.some((e) => e.repairIntent?.targetId === tc.id)) repaired = true;
    }
    return repaired;
  }

  it('the Medium strategy sends villagers to repair its damaged town centre', () => {
    expect(match('medium')).toBe(true);
  });

  it('the Easy strategy never repairs', () => {
    expect(match('easy')).toBe(false);
  });
});
