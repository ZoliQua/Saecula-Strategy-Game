import { describe, expect, it } from 'vitest';
import { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';
import { buildWaterMask, depth01, hasWater, waterCoverage } from './waterMask';

function lake(size: number, from: number, to: number): MapData {
  const map = new MapData(size, size, TERRAIN.grass);
  for (let y = from; y <= to; y++) for (let x = from; x <= to; x++) map.setTile(x, y, TERRAIN.water);
  return map;
}

describe('water mask', () => {
  it('reports whether a map has water', () => {
    expect(hasWater(new MapData(8, 8))).toBe(false);
    expect(hasWater(lake(8, 3, 4))).toBe(true);
  });

  it('covers water tile centres fully and land centres not at all', () => {
    const map = lake(12, 3, 8);
    expect(waterCoverage(map, 5, 5)).toBe(1);
    expect(waterCoverage(map, 1, 1)).toBe(0);
    // Half way between a water and a land centre: the shore line.
    expect(waterCoverage(map, 8.5, 5)).toBeCloseTo(0.5);
  });

  it('grows depth from the shore towards the middle of a lake', () => {
    const map = lake(16, 2, 13);
    const m = buildWaterMask(map, 4);
    expect(m.cols).toBe(65);
    const at = (u: number, v: number) => m.depth[Math.round((v + 0.5) * 4) * m.cols + Math.round((u + 0.5) * 4)] ?? -1;
    expect(at(0, 0)).toBe(0);
    const shore = at(3, 7.5);
    const middle = at(7.5, 7.5);
    expect(shore).toBeGreaterThan(0);
    expect(middle).toBeGreaterThan(shore);
    // Lake centre is ~6 tiles from the shore line at 13.5.
    expect(middle).toBeGreaterThan(5);
    expect(middle).toBeLessThan(7);
  });

  it('treats the map border as shore', () => {
    const map = new MapData(6, 6, TERRAIN.water);
    const m = buildWaterMask(map, 2);
    expect(m.depth[0]).toBeLessThanOrEqual(0.5);
    expect(m.depth[6 * m.cols + 6]).toBeGreaterThan(1);
  });

  it('scales depth to 0..1 of the deep-water distance', () => {
    const m = buildWaterMask(lake(16, 2, 13), 2);
    const centre = 16 * m.cols + 16;
    expect(m.coverage[centre]).toBe(1);
    expect(depth01(m, centre, 3)).toBe(1);
    expect(depth01(m, 0, 3)).toBe(0);
  });
});
