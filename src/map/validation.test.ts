import { describe, expect, it } from 'vitest';
import { generateMap, MAP_RETRIES, MapGenerationError, retrySeed, type TemplateOptions } from './generator';
import type { GeneratedMap } from './generators/types';
import { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';
import { startEconomy, validateMap } from './validation';

/** A 40×20 grass map with two starts and a full start economy next to each. */
function twoStarts(): GeneratedMap {
  const map = new MapData(40, 20, TERRAIN.grass);
  const starts = [{ tx: 8, ty: 8 }, { tx: 31, ty: 8 }];
  for (const s of starts) {
    for (let i = 0; i < 5; i++) map.setTile(s.tx - 4 + i, s.ty - 5, TERRAIN.gold_mine);
    for (let i = 0; i < 6; i++) map.setTile(s.tx + 5, s.ty - 3 + i, TERRAIN.berries);
    for (let i = 0; i < 9; i++) map.setTile(s.tx - 6, s.ty - 4 + i, TERRAIN.forest);
  }
  return { map, playerStarts: starts, walls: [] };
}

describe('validateMap', () => {
  it('accepts a connected map with a full start economy', () => {
    expect(validateMap(twoStarts())).toEqual({ ok: true, problems: [] });
  });

  it('rejects starts a cliff wall splits apart', () => {
    const g = twoStarts();
    for (let ty = 0; ty < 20; ty++) g.map.setTile(20, ty, TERRAIN.cliff);
    expect(validateMap(g).problems).toEqual(['player 1 cannot be reached from player 0']);
  });

  it('treats preset walls as blocked', () => {
    const g = twoStarts();
    const walls = Array.from({ length: 20 }, (_, ty) => ({ tile: { tx: 20, ty }, playerIndex: 0, minStyleAge: 2 as const }));
    expect(validateMap({ ...g, walls }).ok).toBe(false);
    // A gap in the wall is a gate.
    expect(validateMap({ ...g, walls: walls.filter((w) => w.tile.ty !== 10) }).ok).toBe(true);
  });

  it('rejects a start whose town centre or villager tiles are blocked', () => {
    const g = twoStarts();
    g.map.setTile(9, 9, TERRAIN.forest);
    g.map.setTile(30, 11, TERRAIN.water);
    expect(validateMap(g).problems).toEqual([
      'player 0: town centre tile (9, 9) is blocked',
      'player 1: villager tile (30, 11) is blocked',
    ]);
  });

  it('rejects a start short of gold, food or wood, counting only resources villagers can stand next to', () => {
    const g = twoStarts();
    // Wall player 0's lode off on every side: the gold is there but unworkable.
    for (let tx = 3; tx <= 10; tx++) {
      g.map.setTile(tx, 2, TERRAIN.cliff);
      g.map.setTile(tx, 4, TERRAIN.cliff);
    }
    g.map.setTile(3, 3, TERRAIN.cliff);
    g.map.setTile(10, 3, TERRAIN.cliff);
    for (let ty = 5; ty <= 10; ty++) g.map.setTile(36, ty, TERRAIN.grass);
    expect(startEconomy(g, g.playerStarts[0]!).gold).toBe(0);
    expect(validateMap(g).problems).toEqual([
      'player 0: only 0 gold near the start',
      'player 1: only 0 food near the start',
    ]);
  });
});

describe('generateMap retry (§11.6)', () => {
  const options = { template: 'meadow' as const, width: 64, height: 64, seed: 42, playerCount: 2 };
  const bad = { ok: false, problems: ['nope'] };

  it('retries with derived seeds until a map validates', () => {
    const seeds: number[] = [];
    const generate = (o: TemplateOptions) => {
      seeds.push(o.seed);
      return twoStarts();
    };
    let calls = 0;
    const result = generateMap(options, generate, (g) => (++calls < 3 ? bad : validateMap(g)));
    expect(result.playerStarts).toHaveLength(2);
    expect(seeds).toEqual([42, retrySeed(42, 1), retrySeed(42, 2)]);
    expect(new Set(seeds).size).toBe(3);
  });

  it('throws a MapGenerationError after MAP_RETRIES retries', () => {
    let calls = 0;
    const run = () => generateMap(options, () => {
      calls++;
      return twoStarts();
    }, () => bad);
    expect(run).toThrow(MapGenerationError);
    expect(calls).toBe(MAP_RETRIES + 1);
    expect(run).toThrow(/after 5 retries: nope/);
  });

  it('derived seeds are deterministic and differ per attempt', () => {
    expect(retrySeed(7, 0)).toBe(7);
    expect(retrySeed(7, 1)).toBe(retrySeed(7, 1));
    expect(retrySeed(7, 1)).not.toBe(retrySeed(7, 2));
    expect(retrySeed(7, 1)).not.toBe(retrySeed(8, 1));
  });
});
