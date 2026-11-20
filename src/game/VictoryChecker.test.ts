import { describe, expect, it } from 'vitest';
import { TIME_VICTORY, WONDER_HOLD_MS } from '../config/balance';
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

  describe('Time victory', () => {
    /** setup() with a time rule: `now` is the clock, `scores` / `kills` by player id. */
    function timed(nowMs: number, scores: Record<number, number>, kills: Record<number, number> = {}, holdMs: number | null = null) {
      const w = setup();
      const vc = new VictoryChecker(w.world, w.players, holdMs, {
        limitMs: TIME_VICTORY.limitMs,
        nowMs: () => nowMs,
        standing: (id) => ({ score: scores[id] ?? 0, killValue: kills[id] ?? 0 }),
      });
      return { ...w, vc };
    }

    it('before the limit → playing', () => {
      expect(timed(TIME_VICTORY.limitMs - 1, { 1: 100, 2: 900 }).vc.check()).toEqual({ kind: 'playing' });
    });

    it('at the limit the higher score wins: AI ahead → defeat, cause time', () => {
      expect(timed(TIME_VICTORY.limitMs, { 1: 100, 2: 900 }).vc.check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'time' });
    });

    it('human ahead → victory, cause time', () => {
      expect(timed(TIME_VICTORY.limitMs + 50, { 1: 901, 2: 900 }).vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'time' });
    });

    it('tie on score: kill value decides', () => {
      expect(timed(TIME_VICTORY.limitMs, { 1: 900, 2: 900 }, { 1: 10, 2: 20 }).vc.check()).toEqual({ kind: 'defeat', winnerId: 2, cause: 'time' });
    });

    it('without a time rule the clock never ends the match', () => {
      const w = setup();
      expect(new VictoryChecker(w.world, w.players, WONDER_HOLD_MS, null).check()).toEqual({ kind: 'playing' });
    });

    it('conquest and the Wonder come before time', () => {
      const a = timed(TIME_VICTORY.limitMs, { 1: 100, 2: 900 });
      const aiTc = a.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 2)!;
      a.world.addComponent(aiTc, 'dying', { ttlMs: 0 });
      expect(a.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });

      const b = timed(TIME_VICTORY.limitMs, { 1: 100, 2: 900 }, {}, WONDER_HOLD_MS);
      const wonder = createBuilding(b.world, { type: 'wonder', origin: { tx: 8, ty: 8 }, playerId: 1, mapData: b.map });
      b.world.addComponent(wonder, 'wonder', { heldMs: WONDER_HOLD_MS });
      expect(b.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'wonder' });
    });
  });
});

describe('VictoryChecker in teams (M16)', () => {
  /** 2v2: human 1 + ally 2 vs AIs 3 and 4, a town centre each. */
  function teams(holdMs: number | null = WONDER_HOLD_MS, scores: Record<number, number> = {}, kills: Record<number, number> = {}, nowMs = 0) {
    const map = new MapData(60, 60, TERRAIN.grass);
    const world = createEcsWorld();
    const players = new PlayerManager([1, 2, 3, 4].map((id) => createPlayer({ id, isHuman: id === 1 })));
    players.assignTeams(1);
    [1, 2, 3, 4].forEach((id, i) =>
      createBuilding(world, { type: 'town_center', origin: { tx: 4 + i * 12, ty: 4 }, playerId: id, mapData: map }),
    );
    const vc = new VictoryChecker(world, players, holdMs, {
      limitMs: TIME_VICTORY.limitMs,
      nowMs: () => nowMs,
      standing: (id) => ({ score: scores[id] ?? 0, killValue: kills[id] ?? 0 }),
    });
    const kill = (id: number) => {
      const tc = world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === id)!;
      world.addComponent(tc, 'dying', { ttlMs: 0 });
    };
    const wonder = (playerId: number, heldMs: number) => {
      const e = createBuilding(world, { type: 'wonder', origin: { tx: 10, ty: 30 }, playerId, mapData: map });
      world.addComponent(e, 'wonder', { heldMs });
    };
    return { vc, players, kill, wonder };
  }

  it('the human falls while the ally stands: defeat, the first enemy standing named', () => {
    const t = teams();
    t.kill(1);
    expect(t.vc.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'conquest' });
  });

  it('the human and the last enemy fall in the same tick: a defeat that never names an ally', () => {
    const t = teams();
    t.kill(3);
    expect(t.vc.check().kind).toBe('playing');
    t.kill(1);
    t.kill(4);
    expect(t.vc.check()).toEqual({ kind: 'defeat', winnerId: 0, cause: 'conquest' });
  });

  it('the last enemy falls with the human alive: victory even though the ally fell', () => {
    const t = teams();
    t.kill(2);
    t.kill(3);
    expect(t.vc.check().kind).toBe('playing');
    t.kill(4);
    expect(t.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
  });

  it('every enemy down while the ally stands: victory (the ally is no opponent)', () => {
    const t = teams();
    t.kill(3);
    t.kill(4);
    expect(t.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'conquest' });
  });

  it("an ally's held Wonder is the team's victory, named for the team's lowest standing id", () => {
    const t = teams();
    t.wonder(2, WONDER_HOLD_MS);
    expect(t.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'wonder' });
  });

  it("an enemy's held Wonder is a defeat, named for the enemy team's lowest standing id", () => {
    const t = teams();
    t.wonder(4, WONDER_HOLD_MS);
    expect(t.vc.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'wonder' });
    const u = teams();
    u.kill(3);
    u.wonder(4, WONDER_HOLD_MS);
    expect(u.vc.check()).toEqual({ kind: 'defeat', winnerId: 4, cause: 'wonder' });
  });

  it('time: the summed team score decides, not the best single player', () => {
    // Player 3 is the best single score, but team 1 sums 1100 against 1000.
    const t = teams(null, { 1: 500, 2: 600, 3: 900, 4: 100 }, {}, TIME_VICTORY.limitMs);
    expect(t.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'time' });
    const u = teams(null, { 1: 500, 2: 400, 3: 900, 4: 100 }, {}, TIME_VICTORY.limitMs);
    expect(u.vc.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'time' });
  });

  it('time: a defeated teammate adds nothing; ties go to summed kill value, then the lower id', () => {
    const t = teams(null, { 1: 500, 2: 9000, 3: 600, 4: 100 }, {}, TIME_VICTORY.limitMs);
    t.kill(2);
    expect(t.vc.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'time' });
    const k = teams(null, { 1: 500, 2: 500, 3: 500, 4: 500 }, { 1: 10, 2: 10, 3: 5, 4: 20 }, TIME_VICTORY.limitMs);
    expect(k.vc.check()).toEqual({ kind: 'defeat', winnerId: 3, cause: 'time' });
    const i = teams(null, { 1: 500, 2: 500, 3: 500, 4: 500 }, {}, TIME_VICTORY.limitMs);
    expect(i.vc.check()).toEqual({ kind: 'victory', winnerId: 1, cause: 'time' });
  });
});
