import { describe, expect, it } from 'vitest';
import { HILL, WONDER_HOLD_MS } from '../config/balance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import { createHill } from '../ecs/archetypes/hill';
import type { Entity } from '../ecs/components';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { killEntity } from './kill';
import type { VictoryMode } from './GameSetupConfig';
import { createPlayers } from './PlayerManager';
import { createVictoryChecker } from './VictoryChecker';

/** Four players with a town centre each and a hill. */
function setup({ allies = 0, victory = 'hill' as VictoryMode } = {}) {
  const map = new MapData(64, 64);
  const world = createEcsWorld();
  const players = createPlayers('hungarian', ['english', 'german', 'french'], undefined, allies);
  const tcs = players.all().map((p) => createBuilding(world, { type: 'town_center', origin: { tx: p.id * 8, ty: 4 }, playerId: p.id, mapData: map }));
  const hill = createHill(world, map, { tx: 32, ty: 32 }).hill!;
  const checker = createVictoryChecker(victory, world, players);
  return {
    map, world, checker, players,
    hold: (team: number, ms: number = HILL.holdMs) => (hill.heldMs[team] = ms),
    raze: (id: number) => killEntity(world, tcs[id - 1] as Entity & { health: { current: number; max: number } }),
  };
}

describe('King of the Hill victory (M19)', () => {
  it('nobody has held it long enough: playing', () => {
    const m = setup();
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    m.hold(1, HILL.holdMs - 1);
    m.hold(2, HILL.holdMs - 1);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
  });

  it('the human holds it for holdMs: victory', () => {
    const m = setup();
    m.hold(1);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'hill' });
  });

  it('an AI holds it for holdMs: defeat', () => {
    const m = setup();
    m.hold(3);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'hill' });
  });

  it("teams: the human's team wins", () => {
    const m = setup({ allies: 1 });
    m.hold(1);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'hill' });
  });

  it('teams: the enemy team wins, named by its lowest-id standing player', () => {
    const m = setup({ allies: 1 });
    m.hold(2);
    m.raze(3);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 4, cause: 'hill' });
  });

  it("a player who is out does not win by its clock", () => {
    const m = setup();
    m.hold(2);
    m.raze(2);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
  });

  it('conquest takes precedence: the last enemy fell', () => {
    const m = setup({ allies: 2 });
    m.hold(1);
    m.raze(4);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
  });

  it("conquest takes precedence: the human fell, whatever the team's clock", () => {
    const m = setup({ allies: 1 });
    m.hold(1);
    m.raze(1);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'conquest' });
  });

  it('a held Wonder decides nothing in this mode', () => {
    const m = setup();
    const wonder = createBuilding(m.world, { type: 'wonder', origin: { tx: 50, ty: 50 }, playerId: 2, mapData: m.map });
    m.world.addComponent(wonder, 'wonder', { heldMs: WONDER_HOLD_MS });
    expect(m.checker.check()).toEqual({ kind: 'playing' });
  });

  it.each(['conquest', 'conquest_wonder', 'conquest_time', 'all', 'regicide'] as const)('%s: a hill clock wins nothing', (victory) => {
    const m = setup({ victory });
    // Regicide watches kings: give everybody one, so only the hill clock is in play.
    for (const p of m.players.all()) createUnit(m.world, { type: 'king', tile: { tx: p.id * 9, ty: 9 }, playerId: p.id });
    m.hold(2);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
  });
});
