import { describe, expect, it } from 'vitest';
import { START_ECONOMY } from '../config/balance';
import { generateMap } from './generator';
import { TERRAIN } from './TerrainTypes';

function baseOpts(overrides: Record<string, unknown> = {}) {
  return {
    template: 'meadow' as const,
    width: 64,
    height: 64,
    seed: 42,
    playerCount: 4,
    ...overrides,
  };
}

describe('generator — meadow', () => {
  it('is deterministic for the same seed', () => {
    const a = generateMap(baseOpts());
    const b = generateMap(baseOpts());
    expect(Array.from(a.map.getRawTiles())).toEqual(
      Array.from(b.map.getRawTiles()),
    );
    expect(a.playerStarts).toEqual(b.playerStarts);
  });

  it('differs between seeds', () => {
    const a = generateMap(baseOpts({ seed: 1 }));
    const b = generateMap(baseOpts({ seed: 2 }));
    expect(Array.from(a.map.getRawTiles())).not.toEqual(
      Array.from(b.map.getRawTiles()),
    );
  });

  it('produces the requested number of player starts', () => {
    const result = generateMap(baseOpts({ playerCount: 3 }));
    expect(result.playerStarts).toHaveLength(3);
  });

  it('each player start is on passable terrain', () => {
    const result = generateMap(baseOpts());
    for (const start of result.playerStarts) {
      expect(result.map.isPassable(start.tx, start.ty)).toBe(true);
    }
  });

  it('each player start has a gold lode of START_ECONOMY.goldTiles tiles within radius 8', () => {
    const result = generateMap(baseOpts());
    for (const start of result.playerStarts) {
      const found = findNearby(result.map, start, TERRAIN.gold_mine, 8);
      expect(found).toBeGreaterThanOrEqual(START_ECONOMY.goldTiles.min);
    }
  });

  it('each player start has its START_ECONOMY berry bushes within radius 7', () => {
    const result = generateMap(baseOpts());
    for (const start of result.playerStarts) {
      const found = findNearby(result.map, start, TERRAIN.berries, 7);
      expect(found).toBeGreaterThanOrEqual(START_ECONOMY.berryBushes.min);
      expect(found).toBeLessThanOrEqual(START_ECONOMY.berryBushes.max);
    }
  });

  it('the center area contains at least one gold mine', () => {
    const result = generateMap(baseOpts());
    const cx = Math.floor(result.map.width / 2);
    const cy = Math.floor(result.map.height / 2);
    const found = findNearby(result.map, { tx: cx, ty: cy }, TERRAIN.gold_mine, 6);
    expect(found).toBeGreaterThan(0);
  });

  it('rejects zero and too-many player counts', () => {
    expect(() => generateMap(baseOpts({ playerCount: 0 }))).toThrow();
    expect(() => generateMap(baseOpts({ playerCount: 7 }))).toThrow();
  });
});

function findNearby(
  map: { getTile: (tx: number, ty: number) => number; width: number; height: number },
  origin: { tx: number; ty: number },
  terrain: number,
  radius: number,
): number {
  let count = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = origin.tx + dx;
      const ty = origin.ty + dy;
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
      if (map.getTile(tx, ty) === terrain) count++;
    }
  }
  return count;
}
