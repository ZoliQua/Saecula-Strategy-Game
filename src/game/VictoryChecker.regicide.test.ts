import { describe, expect, it } from 'vitest';
import { BUILDING_DEATH_TTL_MS, WONDER_HOLD_MS } from '../config/balance';
import { createBuilding } from '../ecs/archetypes/building';
import { createUnit } from '../ecs/archetypes/createUnit';
import type { CargoUnit, Entity } from '../ecs/components';
import { createEcsWorld } from '../ecs/world';
import { chooseEnemyPlayer } from '../ai/targetPlayer';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { decidedWinner } from './gameOverStats';
import { applyDamage, killEntity } from './kill';
import { createPlayer } from './Player';
import { PlayerManager } from './PlayerManager';
import type { VictoryMode } from './GameSetupConfig';
import { createVictoryChecker } from './VictoryChecker';

type Mortal = Entity & { health: { current: number; max: number } };

/** `count` players, each with a town centre and a king; `allies` as in the setup. */
function setup({ count = 2, allies = 0, victory = 'regicide' as VictoryMode } = {}) {
  const map = new MapData(64, 64, TERRAIN.grass);
  const world = createEcsWorld();
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const players = new PlayerManager(ids.map((id) => createPlayer({ id, isHuman: id === 1 })));
  players.assignTeams(allies);
  const tcs = new Map<number, Mortal>();
  const kings = new Map<number, Mortal>();
  for (const id of ids) {
    tcs.set(id, createBuilding(world, { type: 'town_center', origin: { tx: id * 9, ty: 4 }, playerId: id, mapData: map }) as Mortal);
    kings.set(id, createUnit(world, { type: 'king', tile: { tx: id * 9, ty: 9 }, playerId: id }) as Mortal);
  }
  const checker = createVictoryChecker(victory, world, players);
  return {
    map, world, players, checker,
    killKing: (id: number) => killEntity(world, kings.get(id)!),
    razeTc: (id: number) => killEntity(world, tcs.get(id)!),
    kings,
    tcs,
    addTc: (id: number, underConstruction = false) =>
      createBuilding(world, { type: 'town_center', origin: { tx: id * 9, ty: underConstruction ? 24 : 16 }, playerId: id, mapData: map, underConstruction }) as Mortal,
    /** Owners of the collapsing town centres, one entry each. */
    fallen: () => world.entities.filter((e) => e.building?.type === 'town_center' && e.dying).map((e) => e.owner!.playerId).sort(),
    out: () => players.all().filter((p) => p.defeated).map((p) => p.id),
  };
}

describe('Regicide elimination (M19)', () => {
  it('everyone has a king and a town centre: playing', () => {
    const { checker, out } = setup({ count: 3 });
    expect(checker.check()).toEqual({ kind: 'playing' });
    expect(out()).toEqual([]);
  });

  it('losing the king eliminates', () => {
    const m = setup({ count: 3 });
    m.killKing(3);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    expect(m.out()).toEqual([3]);
  });

  it('losing the town centre eliminates, king alive', () => {
    const m = setup({ count: 3 });
    m.razeTc(3);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    expect(m.out()).toEqual([3]);
  });

  it('both conditions are judged in one pass', () => {
    const m = setup({ count: 4 });
    m.killKing(2);
    m.razeTc(3);
    expect(m.checker.check().kind).toBe('playing');
    expect(m.out()).toEqual([2, 3]);
  });

  it('a king in cargo keeps its owner in; sunk with it, the owner is out in that check', () => {
    const m = setup();
    const ship = createUnit(m.world, { type: 'transport', tile: { tx: 30, ty: 30 }, playerId: 2 }) as Mortal;
    const king = m.kings.get(2)!;
    m.world.remove(king);
    m.world.addComponent(ship, 'cargo', { units: [king as CargoUnit] });
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    applyDamage(m.world, ship, 10_000, 1);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'regicide' });
  });

  it('a defeated player is never revived by a king and a town centre', () => {
    const m = setup({ count: 3 });
    m.players.markDefeated(3);
    m.checker.check();
    expect(m.out()).toEqual([3]);
  });

  it.each(['conquest', 'conquest_wonder', 'conquest_time', 'all', 'hill'] as const)('%s: a dead king changes nothing', (victory) => {
    const m = setup({ victory });
    m.killKing(2);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    expect(m.out()).toEqual([]);
  });

  it('no Wonder victory in Regicide', () => {
    const m = setup();
    const wonder = createBuilding(m.world, { type: 'wonder', origin: { tx: 40, ty: 40 }, playerId: 2, mapData: m.map });
    m.world.addComponent(wonder, 'wonder', { heldMs: WONDER_HOLD_MS });
    expect(m.checker.check()).toEqual({ kind: 'playing' });
  });
});

describe('Regicide results and causes (M19)', () => {
  it('human kingless: defeat by regicide', () => {
    const m = setup();
    m.killKing(1);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'regicide' });
  });

  it('human with a king but no town centre: defeat by conquest', () => {
    const m = setup();
    m.razeTc(1);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'conquest' });
  });

  it('human lost both: regicide', () => {
    const m = setup();
    m.razeTc(1);
    m.killKing(1);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'regicide' });
  });

  it('the last enemy kingless: victory by regicide', () => {
    const m = setup();
    m.killKing(2);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'regicide' });
  });

  it('every enemy razed with its king alive: victory by conquest', () => {
    const m = setup({ count: 3 });
    m.razeTc(2);
    m.razeTc(3);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
  });

  it('one enemy kingless, the last razed: regicide', () => {
    const m = setup({ count: 3 });
    m.killKing(2);
    expect(m.checker.check().kind).toBe('playing');
    m.razeTc(3);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'regicide' });
  });

  it('human and last enemy in one tick: the human loses, nobody named', () => {
    const m = setup();
    m.killKing(1);
    m.killKing(2);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 0, cause: 'regicide' });
  });

  it('teams: won when every enemy is out, though the ally fell', () => {
    const m = setup({ count: 4, allies: 1 });
    m.killKing(2);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    m.killKing(3);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    m.razeTc(4);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'regicide' });
  });

  it("teams: an ally's lost king alone makes no regicide victory", () => {
    const m = setup({ count: 3, allies: 1 });
    m.killKing(2);
    m.razeTc(3);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
  });

  it('teams: the human loses while the ally stands', () => {
    const m = setup({ count: 4, allies: 1 });
    m.killKing(1);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'regicide' });
    expect(m.out()).toEqual([1]);
  });

  it('teams: a kingless player is no target any more', () => {
    const m = setup({ count: 4, allies: 1 });
    expect(chooseEnemyPlayer(m.players, 2, m.world)).toBe(3);
    m.killKing(3);
    m.checker.check();
    expect(chooseEnemyPlayer(m.players, 2, m.world)).toBe(4);
  });
});

describe('the town centres collapse when the king falls (M19)', () => {
  it('every one, a site too, in the check that eliminates', () => {
    const m = setup({ count: 3 });
    const second = m.addTc(3);
    const site = m.addTc(3, true);
    m.killKing(3);
    expect(m.fallen()).toEqual([]);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    for (const tc of [m.tcs.get(3)!, second, site]) {
      expect(tc.dying).toEqual({ ttlMs: BUILDING_DEATH_TTL_MS });
      expect(tc.health.current).toBe(0);
    }
    expect(m.fallen()).toEqual([3, 3, 3]);
  });

  it('only town centres, and only of that player', () => {
    const m = setup({ count: 3 });
    const barracks = createBuilding(m.world, { type: 'barracks', origin: { tx: 40, ty: 40 }, playerId: 3, mapData: m.map });
    const knight = createUnit(m.world, { type: 'knight', tile: { tx: 45, ty: 45 }, playerId: 3 });
    m.killKing(3);
    m.checker.check();
    expect(m.fallen()).toEqual([3]);
    expect([barracks.dying, knight.dying]).toEqual([undefined, undefined]);
  });

  it('once: a later check restarts no collapse', () => {
    const m = setup({ count: 3 });
    m.killKing(3);
    m.checker.check();
    const tc = m.tcs.get(3)!;
    tc.dying!.ttlMs -= 500;
    m.checker.check();
    expect(tc.dying).toEqual({ ttlMs: BUILDING_DEATH_TTL_MS - 500 });
  });

  it('a town centre razed in the same tick keeps its own collapse, the others join', () => {
    const m = setup({ count: 3 });
    const second = m.addTc(3);
    m.razeTc(3);
    m.tcs.get(3)!.dying!.ttlMs -= 100;
    m.killKing(3);
    expect(m.checker.check()).toEqual({ kind: 'playing' });
    expect(m.tcs.get(3)!.dying).toEqual({ ttlMs: BUILDING_DEATH_TTL_MS - 100 });
    expect(second.dying).toEqual({ ttlMs: BUILDING_DEATH_TTL_MS });
    expect(m.out()).toEqual([3]);
  });

  it('a king sunk with its transport brings them down too', () => {
    const m = setup({ count: 3 });
    const ship = createUnit(m.world, { type: 'transport', tile: { tx: 30, ty: 30 }, playerId: 3 }) as Mortal;
    const king = m.kings.get(3)!;
    m.world.remove(king);
    m.world.addComponent(ship, 'cargo', { units: [king as CargoUnit] });
    m.checker.check();
    expect(m.fallen()).toEqual([]);
    applyDamage(m.world, ship, 10_000, 1);
    m.checker.check();
    expect(m.fallen()).toEqual([3]);
  });

  it('out by the town centre: nothing more collapses, whenever the king falls', () => {
    const m = setup({ count: 3 });
    m.razeTc(3);
    m.checker.check();
    const later = m.addTc(3);
    m.killKing(3);
    m.checker.check();
    expect(later.dying).toBeUndefined();
  });

  it("human's loss: theirs collapse, and the result holds when judged again", () => {
    const m = setup();
    m.killKing(1);
    const lost = { kind: 'defeat', winnerId: 2, cause: 'regicide' } as const;
    expect(m.checker.check()).toEqual(lost);
    expect(m.fallen()).toEqual([1]);
    expect(m.checker.check()).toEqual(lost);
    expect(decidedWinner(lost, m.players.all())).toBe(2);
  });

  it('both last kings in one tick: both collapse, nobody is crowned', () => {
    const m = setup();
    m.killKing(1);
    m.killKing(2);
    const state = m.checker.check();
    expect(state).toEqual({ kind: 'defeat', winnerId: 0, cause: 'regicide' });
    expect(m.fallen()).toEqual([1, 2]);
    if (state.kind !== 'defeat') throw new Error('no defeat');
    expect(decidedWinner(state, m.players.all())).toBeNull();
  });

  it('teams: won by regicide, the standing ally keeps its town centre', () => {
    const m = setup({ count: 4, allies: 1 });
    m.killKing(3);
    m.killKing(4);
    expect(m.checker.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'regicide' });
    expect(m.fallen()).toEqual([3, 4]);
  });

  it("teams: the human's loss leaves the ally's standing", () => {
    const m = setup({ count: 4, allies: 1 });
    m.killKing(1);
    expect(m.checker.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'regicide' });
    expect(m.fallen()).toEqual([1]);
  });

  it.each(['conquest', 'conquest_wonder', 'conquest_time', 'all', 'hill'] as const)('%s: never, nor for a player who is out', (victory) => {
    const m = setup({ victory, count: 3 });
    const second = m.addTc(2);
    m.razeTc(3);
    m.killKing(2);
    m.killKing(3);
    m.checker.check();
    expect(m.fallen()).toEqual([3]);
    expect(second.dying).toBeUndefined();
    expect(m.out()).toEqual([3]);
  });
});
