import { describe, expect, it } from 'vitest';
import { AI_COMMON, AI_MEDIUM } from '../config/aiBalance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createEcsWorld } from '../ecs/world';
import { createPlayer } from '../game/Player';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import type { AIContext } from './AIPlayer';
import { MonkPlay } from './MonkPlay';
import { Perception } from './perception';

function scene() {
  const map = new MapData(40, 40);
  const world = createEcsWorld();
  const fog = new FogOfWarData(40, 40);
  for (let ty = 0; ty < 40; ty++) for (let tx = 0; tx < 40; tx++) fog.markVisible(tx, ty);
  createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 2, mapData: map });
  const monk = createUnit(world, { type: 'monk', tile: { tx: 10, ty: 10 }, playerId: 2 });
  const archer = createUnit(world, { type: 'archer', tile: { tx: 15, ty: 10 }, playerId: 1 });
  const play = new MonkPlay(AI_MEDIUM.monks, {
    ownCount: () => 0,
    militaryReady: () => false,
    startBuilding: () => null,
    train: () => false,
    waveMembers: () => new Set(),
  });
  const perception = new Perception();
  const ctx = (timeMs: number): AIContext => ({ world, mapData: map, player: createPlayer({ id: 2 }), timeMs, fog });
  const tick = (t: number) => play.control(ctx(t), perception.update(ctx(t)));
  return { world, monk, archer, tick };
}

describe('MonkPlay', () => {
  it('does not avoid a target whose order ended because a third player converted it', () => {
    const { world, monk, archer, tick } = scene();
    tick(0);
    expect(monk.convertIntent?.targetId).toBe(archer.id);
    // Another player's monk converts the archer first; MonkSystem drops this order (target changed hands).
    archer.owner!.playerId = 3;
    world.removeComponent(monk, 'convertIntent');
    tick(1000);
    expect(monk.convertIntent?.targetId).toBe(archer.id);
  });

  it('does not pick again, for a while, a target whose conversion was given up (unreachable)', () => {
    const map = new MapData(40, 40);
    const world = createEcsWorld();
    const fog = new FogOfWarData(40, 40);
    for (let ty = 0; ty < 40; ty++) for (let tx = 0; tx < 40; tx++) fog.markVisible(tx, ty);
    createBuilding(world, { type: 'town_center', origin: { tx: 2, ty: 2 }, playerId: 2, mapData: map });
    const monk = createUnit(world, { type: 'monk', tile: { tx: 10, ty: 10 }, playerId: 2 });
    const archer = createUnit(world, { type: 'archer', tile: { tx: 15, ty: 10 }, playerId: 1 });
    const play = new MonkPlay(AI_MEDIUM.monks, {
      ownCount: () => 0,
      militaryReady: () => false,
      startBuilding: () => null,
      train: () => false,
      waveMembers: () => new Set(),
    });
    const perception = new Perception();
    const ctx = (timeMs: number): AIContext => ({ world, mapData: map, player: createPlayer({ id: 2 }), timeMs, fog, enemyPlayerId: 1 });
    const tick = (t: number) => play.control(ctx(t), perception.update(ctx(t)));
    tick(0);
    expect(monk.convertIntent?.targetId).toBe(archer.id);
    // MonkSystem gives the conversion up (the target could not be reached).
    world.removeComponent(monk, 'convertIntent');
    tick(1000);
    tick(2000);
    expect(monk.convertIntent).toBeUndefined();
    tick(1000 + AI_COMMON.monkAvoidMs + 1000);
    expect(monk.convertIntent?.targetId).toBe(archer.id);
  });
});
