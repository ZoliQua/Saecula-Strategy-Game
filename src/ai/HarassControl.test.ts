import { describe, expect, it } from 'vitest';
import { AI_HARD } from '../config/aiBalance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createVillager } from '../ecs/archetypes/villager';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import type { AIContext } from './AIPlayer';
import { HarassControl } from './HarassControl';
import { Perception } from './perception';
import { ThoughtLog } from './thoughts';

function setup() {
  const map = new MapData(48, 48);
  const world = createEcsWorld();
  const fog = new FogOfWarData(48, 48);
  createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 2, mapData: map });
  const raiders = [0, 1, 2].map((i) => createUnit(world, { type: 'scout', tile: { tx: 20 + i, ty: 20 }, playerId: 2 }));
  const villagers = [0, 1].map((i) => createVillager(world, { tile: { tx: 24 + i, ty: 22 }, playerId: 1 }));
  // Everything around the raid is in sight.
  for (let ty = 14; ty < 30; ty++) for (let tx = 14; tx < 32; tx++) fog.markVisible(tx, ty);
  const ctx: AIContext = { world, mapData: map, player: createPlayer({ id: 2 }), timeMs: 10 * 60_000, fog, enemyPlayerId: 1 };
  const log = new ThoughtLog();
  return { world, ctx, raiders, villagers, perception: new Perception(), control: new HarassControl(log, AI_HARD.harass), log };
}

describe('HarassControl (villager raids)', () => {
  it('rides to the remembered villagers and attacks them, villagers only', () => {
    const { ctx, raiders, villagers, perception, control } = setup();
    createBuilding(ctx.world, { type: 'house', origin: { tx: 22, ty: 24 }, playerId: 1, mapData: ctx.mapData });
    const view = perception.update(ctx);
    const target = control.pickTarget(ctx, view);
    expect(target?.villagers).toBe(2);
    expect(control.mayLaunch(ctx.timeMs)).toBe(true);
    control.launch(ctx, raiders, target!);
    expect(raiders.every((r) => control.has(r))).toBe(true);
    control.update(ctx, perception.update(ctx));
    const ids = new Set(villagers.map((v) => v.id));
    expect(raiders.every((r) => r.attackIntent && ids.has(r.attackIntent.targetId))).toBe(true);
    // One raid at a time.
    expect(control.mayLaunch(ctx.timeMs)).toBe(false);
  });

  it('falls back home once armed enemies outnumber it, and waits out the cooldown', () => {
    const { ctx, raiders, perception, control, log } = setup();
    control.launch(ctx, raiders, control.pickTarget(ctx, perception.update(ctx))!);
    for (let i = 0; i < 4; i++) createUnit(ctx.world, { type: 'swordsman', tile: { tx: 22 + i, ty: 25 }, playerId: 1 });
    control.update(ctx, perception.update(ctx));
    expect(control.active).toBe(false);
    expect(raiders.every((r) => r.moveIntent?.target.tx === 2 && r.moveIntent.target.ty === 2)).toBe(true);
    expect(log.snapshot('hard').recent.some((t) => t.kind === 'retreat')).toBe(true);
    expect(control.mayLaunch(ctx.timeMs + 1000)).toBe(false);
    expect(control.mayLaunch(ctx.timeMs + AI_HARD.harass.cooldownMs)).toBe(true);
  });

  it('sends at most maxRaids raids per game', () => {
    const { ctx, raiders, perception, control } = setup();
    let t = ctx.timeMs;
    for (let i = 0; i < AI_HARD.harass.maxRaids; i++) {
      const c = { ...ctx, timeMs: t };
      expect(control.mayLaunch(t)).toBe(true);
      control.launch(c, raiders, control.pickTarget(c, perception.update(c))!);
      for (const r of raiders) ctx.world.remove(r);
      control.update(c, perception.update(c));
      for (const [j, r] of raiders.entries()) {
        raiders[j] = createUnit(ctx.world, { type: 'scout', tile: { ...r.position! }, playerId: 2 });
      }
      t += AI_HARD.harass.cooldownMs;
    }
    expect(control.raidsLaunched).toBe(AI_HARD.harass.maxRaids);
    expect(control.mayLaunch(t + 10 * 60_000)).toBe(false);
  });
});
