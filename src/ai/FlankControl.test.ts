import { describe, expect, it } from 'vitest';
import { AI_COMMON, AI_MASTER } from '../config/aiBalance';
import { createBuilding, unblockBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { createRng } from '../map/random';
import type { AIContext } from './AIPlayer';
import { ArmyControl } from './ArmyControl';
import { FlankControl } from './FlankControl';
import { Perception } from './perception';
import { ThoughtLog } from './thoughts';

function setup() {
  const map = new MapData(48, 48);
  const world = createEcsWorld();
  const fog = new FogOfWarData(48, 48);
  createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 2, mapData: map });
  const army = Array.from({ length: 6 }, (_, i) => createUnit(world, { type: 'swordsman', tile: { tx: 10 + i, ty: 10 }, playerId: 2 }));
  const enemyTc = createBuilding(world, { type: 'town_center', origin: { tx: 36, ty: 36 }, playerId: 1, mapData: map });
  const farm = createBuilding(world, { type: 'farm', origin: { tx: 40, ty: 10 }, playerId: 1, mapData: map });
  // Scouting saw both enemy buildings.
  fog.markVisible(37, 37);
  fog.markVisible(40, 10);
  const ctx: AIContext = { world, mapData: map, player: createPlayer({ id: 2 }), timeMs: 0, fog, enemyPlayerId: 1 };
  const log = new ThoughtLog();
  const perception = new Perception();
  const wave = new ArmyControl(log, createRng(1));
  const flank = new FlankControl(log, AI_MASTER.flank);
  return { world, map, ctx, army, enemyTc, farm, perception, wave, flank, log };
}

describe('FlankControl', () => {
  it('launch moves the given units toward the target and they leave the main wave (detach)', () => {
    const { ctx, army, enemyTc, farm, perception, wave, flank } = setup();
    const view = perception.update(ctx);
    wave.launchWave(ctx, view, army);
    expect(wave.target?.id).toBe(enemyTc.id);
    expect(wave.members().size).toBe(6);
    const target = view.knownEnemyBuildings.find((b) => b.id === farm.id)!;
    const flankers = army.slice(0, 2);
    wave.detach(flankers.map((u) => u.id!));
    flank.launch(ctx, view, flankers, target);
    expect(wave.members().size).toBe(4);
    expect(flankers.every((u) => !wave.inWave(u) && flank.has(u))).toBe(true);
    expect(flankers.every((u) => u.moveIntent?.target.tx === 40 && u.moveIntent.target.ty === 10)).toBe(true);
    expect(army.slice(2).every((u) => !flank.has(u))).toBe(true);
    // The main wave's upkeep leaves the flank alone.
    wave.update(ctx, perception.update(ctx));
    flank.update(ctx, perception.update(ctx));
    // The farm is in sight (fog marked visible): the flank attacks it; the wave keeps marching on the TC.
    expect(flankers.every((u) => u.attackIntent?.targetId === farm.id)).toBe(true);
    expect(army.slice(2).every((u) => u.attackIntent?.targetId !== farm.id)).toBe(true);
  });

  it('members return to idle when the target is gone', () => {
    const { ctx, map, world, army, farm, perception, flank, log } = setup();
    const view = perception.update(ctx);
    const flankers = army.slice(0, 3);
    flank.launch(ctx, view, flankers, view.knownEnemyBuildings.find((b) => b.id === farm.id)!);
    expect(flank.active).toBe(true);
    // The farm burns down in sight: perception forgets it.
    unblockBuilding(map, farm);
    world.remove(farm);
    flank.update(ctx, perception.update(ctx));
    expect(flank.active).toBe(false);
    expect(flankers.every((u) => !flank.has(u) && !u.moveIntent && !u.attackIntent && u.movable!.path.length === 0)).toBe(true);
    expect(log.snapshot('master').recent.at(-1)).toMatchObject({ kind: 'flank', detail: 'done' });
  });

  it('flanksLaunched counts', () => {
    const { ctx, army, farm, perception, flank } = setup();
    expect(flank.flanksLaunched).toBe(0);
    const view = perception.update(ctx);
    const target = view.knownEnemyBuildings.find((b) => b.id === farm.id)!;
    flank.launch(ctx, view, army.slice(0, 2), target);
    flank.launch(ctx, view, army.slice(2, 4), target);
    expect(flank.flanksLaunched).toBe(2);
  });

  it('a member that keeps ending up idle short of the target (no path) leaves the flank', () => {
    const { ctx, army, farm, perception, flank } = setup();
    const view = perception.update(ctx);
    const target = view.knownEnemyBuildings.find((b) => b.id === farm.id)!;
    // The farm drops out of sight (remembered only), so the flank marches instead of attacking.
    ctx.fog.dimVisibleToExplored();
    const [stuck, walker] = [army[0]!, army[1]!];
    flank.launch(ctx, view, [stuck, walker], target);
    for (let i = 0; i <= AI_COMMON.flankReorders; i++) {
      // PathfindingSystem found no path: the order is dropped and the unit stands idle.
      ctx.world.removeComponent(stuck, 'moveIntent');
      flank.update(ctx, perception.update(ctx));
      expect(flank.has(stuck), `round ${i}`).toBe(i < AI_COMMON.flankReorders);
    }
    expect(stuck.moveIntent).toBeUndefined();
    // The walker (still on its way) stays on the flank, and the flank goes on.
    expect(flank.has(walker)).toBe(true);
    expect(walker.moveIntent?.target).toEqual(target.position);
  });
});
