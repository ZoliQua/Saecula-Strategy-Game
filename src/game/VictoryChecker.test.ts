import { describe, expect, it } from 'vitest';
import { WONDER_HOLD_MS } from '../config/balance';
import { createBuilding } from '../ecs/archetypes/building';
import { createEcsWorld } from '../ecs/world';
import { MapData } from '../map/MapData';
import { TERRAIN } from '../map/TerrainTypes';
import { createPlayer } from './Player';
import { PlayerManager } from './PlayerManager';
import { VictoryChecker } from './VictoryChecker';

function setup() {
  const map = new MapData(20, 20, TERRAIN.grass);
  const world = createEcsWorld();
  const players = new PlayerManager([
    createPlayer({ id: 1, isHuman: true }),
    createPlayer({ id: 2 }),
  ]);
  createBuilding(world, {
    type: 'town_center',
    origin: { tx: 3, ty: 3 },
    playerId: 1,
    mapData: map,
  });
  createBuilding(world, {
    type: 'town_center',
    origin: { tx: 15, ty: 15 },
    playerId: 2,
    mapData: map,
  });
  return { map, world, players, vc: new VictoryChecker(world, players, WONDER_HOLD_MS) };
}

describe('VictoryChecker', () => {
  it('reports playing while both sides have TCs', () => {
    const { vc } = setup();
    expect(vc.check().kind).toBe('playing');
  });

  it('marks a player defeated when their TC dies', () => {
    const { vc, world, players } = setup();
    const aiTc = world.entities.find(
      (e) => e.building?.type === 'town_center' && e.owner?.playerId === 2,
    )!;
    world.addComponent(aiTc, 'dying', { ttlMs: 0 });
    const result = vc.check();
    expect(result).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
    expect(players.get(2)?.defeated).toBe(true);
  });

  it('human loss reports defeat', () => {
    const { vc, world } = setup();
    const humanTc = world.entities.find(
      (e) => e.building?.type === 'town_center' && e.owner?.playerId === 1,
    )!;
    world.addComponent(humanTc, 'dying', { ttlMs: 0 });
    const result = vc.check();
    expect(result).toEqual({ kind: 'defeat', winnerId: 2, cause: 'conquest' });
  });

  it('keeps playing until every AI is defeated', () => {
    const map = new MapData(40, 40, TERRAIN.grass);
    const world = createEcsWorld();
    const players = new PlayerManager([
      createPlayer({ id: 1, isHuman: true }),
      createPlayer({ id: 2 }),
      createPlayer({ id: 3 }),
    ]);
    [1, 2, 3].forEach((id, i) =>
      createBuilding(world, { type: 'town_center', origin: { tx: 4 + i * 12, ty: 4 }, playerId: id, mapData: map }),
    );
    const vc = new VictoryChecker(world, players, WONDER_HOLD_MS);
    const kill = (id: number) => {
      const tc = world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === id)!;
      world.addComponent(tc, 'dying', { ttlMs: 0 });
    };
    kill(2);
    expect(vc.check().kind).toBe('playing');
    kill(3);
    expect(vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
  });

  it('human defeat ends the match even while several AIs survive', () => {
    const map = new MapData(40, 40, TERRAIN.grass);
    const world = createEcsWorld();
    const players = new PlayerManager([
      createPlayer({ id: 1, isHuman: true }),
      createPlayer({ id: 2 }),
      createPlayer({ id: 3 }),
    ]);
    [2, 3].forEach((id, i) =>
      createBuilding(world, { type: 'town_center', origin: { tx: 4 + i * 12, ty: 4 }, playerId: id, mapData: map }),
    );
    expect(new VictoryChecker(world, players, null).check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'conquest' });
  });

  describe('Wonder victory', () => {
    /** A finished Wonder of `playerId` whose clock reads `heldMs`. */
    function wonderOf(w: ReturnType<typeof setup>, playerId: number, heldMs: number, tx = 8) {
      const e = createBuilding(w.world, { type: 'wonder', origin: { tx, ty: 8 }, playerId, mapData: w.map });
      w.world.addComponent(e, 'wonder', { heldMs });
      return e;
    }

    it('AI Wonder held WONDER_HOLD_MS → defeat, cause wonder', () => {
      const w = setup();
      wonderOf(w, 2, WONDER_HOLD_MS);
      expect(w.vc.check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'wonder' });
    });

    it('599_999 ms → playing', () => {
      const w = setup();
      wonderOf(w, 2, WONDER_HOLD_MS - 1);
      expect(w.vc.check()).toEqual({ kind: 'playing' });
    });

    it('human Wonder → victory, cause wonder', () => {
      const w = setup();
      wonderOf(w, 1, WONDER_HOLD_MS);
      expect(w.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'wonder' });
    });

    it('holdMs null ignores heldMs 10 h', () => {
      const w = setup();
      wonderOf(w, 2, 36_000_000);
      expect(new VictoryChecker(w.world, w.players, null).check()).toEqual({ kind: 'playing' });
    });

    it("defeated owner's Wonder never wins", () => {
      const map = new MapData(40, 40, TERRAIN.grass);
      const world = createEcsWorld();
      const players = new PlayerManager([
        createPlayer({ id: 1, isHuman: true }),
        createPlayer({ id: 2 }),
        createPlayer({ id: 3 }),
      ]);
      // Player 2 has no town centre left (defeated by conquest) but its Wonder stands past the hold.
      createBuilding(world, { type: 'town_center', origin: { tx: 3, ty: 3 }, playerId: 1, mapData: map });
      createBuilding(world, { type: 'town_center', origin: { tx: 30, ty: 30 }, playerId: 3, mapData: map });
      const wonder = createBuilding(world, { type: 'wonder', origin: { tx: 15, ty: 15 }, playerId: 2, mapData: map });
      world.addComponent(wonder, 'wonder', { heldMs: WONDER_HOLD_MS * 2 });
      const vc = new VictoryChecker(world, players, WONDER_HOLD_MS);
      expect(vc.check()).toEqual({ kind: 'playing' });
      expect(players.get(2)?.defeated).toBe(true);
    });

    it('two Wonders: the one past the hold wins', () => {
      const w = setup();
      wonderOf(w, 1, WONDER_HOLD_MS - 5000, 8);
      wonderOf(w, 2, WONDER_HOLD_MS + 16, 13);
      expect(w.vc.check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'wonder' });
    });

    it('two Wonders both past the hold: the one held longest wins', () => {
      const w = setup();
      wonderOf(w, 2, WONDER_HOLD_MS + 16, 8);
      wonderOf(w, 1, WONDER_HOLD_MS + 32, 13);
      expect(w.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'wonder' });
    });

    it('conquest is checked before the Wonder', () => {
      const w = setup();
      wonderOf(w, 2, WONDER_HOLD_MS);
      const aiTc = w.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 2)!;
      w.world.addComponent(aiTc, 'dying', { ttlMs: 0 });
      expect(w.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
    });

    it('a dying Wonder never wins', () => {
      const w = setup();
      const e = wonderOf(w, 2, WONDER_HOLD_MS);
      w.world.addComponent(e, 'dying', { ttlMs: 2400 });
      expect(w.vc.check()).toEqual({ kind: 'playing' });
    });
  });
});
