import { describe, expect, it } from 'vitest';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createEcsWorld } from '../ecs/world';
import { createPlayers } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { AIPlayer, type AIStrategy } from './AIPlayer';

const idle: AIStrategy = {
  name: 'idle',
  update: () => {},
  snapshot: () => ({ kind: 'easy' }) as unknown as ReturnType<AIStrategy['snapshot']>,
  restore: () => {},
};

describe("an AI's fog with teams (M16 shared vision)", () => {
  it("is lit by its allies' sight, not by its enemies'", () => {
    const world = createEcsWorld();
    const map = new MapData(32, 32);
    const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, 1);
    createUnit(world, { type: 'scout', tile: { tx: 5, ty: 5 }, playerId: 1 }); // the human: player 2's ally
    createUnit(world, { type: 'scout', tile: { tx: 25, ty: 25 }, playerId: 3 }); // an enemy
    const ai = new AIPlayer(players.get(2)!, idle);
    ai.update({ world, mapData: map, teams: players }, 1000);
    expect(ai.fog!.isVisible(5, 5)).toBe(true);
    expect(ai.fog!.isVisible(25, 25)).toBe(false);
  });

  it('without teams only its own emitters count (unchanged)', () => {
    const world = createEcsWorld();
    const map = new MapData(32, 32);
    const players = createPlayers('hungarian', ['english']);
    createUnit(world, { type: 'scout', tile: { tx: 5, ty: 5 }, playerId: 1 });
    const ai = new AIPlayer(players.get(2)!, idle);
    ai.update({ world, mapData: map, teams: players }, 1000);
    expect(ai.fog!.isVisible(5, 5)).toBe(false);
  });
});
