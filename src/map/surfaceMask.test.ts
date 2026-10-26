import { describe, expect, it } from 'vitest';
import { buildRelief } from './cliffRelief';
import { MapData } from './MapData';
import { packSurfaceMask, unpackEdge } from './surfaceMask';
import { TERRAIN } from './TerrainTypes';
import { buildWaterMask } from './waterMask';

describe('surface mask', () => {
  it('packs relief and water on one grid within a byte of precision', () => {
    const map = new MapData(8, 8, TERRAIN.grass);
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) map.setTile(x, y, TERRAIN.cliff);
    for (let y = 5; y <= 7; y++) for (let x = 5; x <= 7; x++) map.setTile(x, y, TERRAIN.water);
    const relief = buildRelief((x, y) => x >= 0 && y >= 0 && x < 8 && y < 8 && map.getTile(x, y) === TERRAIN.cliff, 8, 8, 30, 0, 8);
    const water = buildWaterMask(map, 8);
    expect(water.cols).toBe(8 * 8 + 1);
    const bytes = packSurfaceMask(water.cols, water.rows, relief, water, 3);
    for (const i of [0, 100, 1234, 3000, water.cols * water.rows - 1]) {
      expect(unpackEdge(bytes[i * 4] ?? 0)).toBeCloseTo(relief.edge[i] ?? 0, 1);
      expect((bytes[i * 4 + 2] ?? 0) / 255).toBeCloseTo(water.coverage[i] ?? 0, 2);
    }
    // A rock centre and a lake centre.
    const at = (u: number, v: number) => Math.round((v + 0.5) * 8) * water.cols + Math.round((u + 0.5) * 8);
    expect(unpackEdge(bytes[at(2, 2) * 4] ?? 0)).toBeGreaterThan(0.5);
    expect(bytes[at(6, 6) * 4 + 2]).toBe(255);
    // Lake centre: G holds the (clamped) water depth; rock centre: the plateau height.
    expect(bytes[at(6, 6) * 4 + 1]).toBeGreaterThan(0);
    expect((bytes[at(2, 2) * 4 + 1] ?? 0) / 255).toBeCloseTo((relief.top[at(2, 2)] ?? 0) / relief.maxHeight, 1);
  });

  it('stores water depth where no rock stands and keeps alpha opaque', () => {
    const bytes = packSurfaceMask(3, 3, null, null, 3);
    for (let i = 0; i < 9; i++) {
      expect(bytes[i * 4]).toBe(0);
      expect(bytes[i * 4 + 1]).toBe(0);
      expect(bytes[i * 4 + 3]).toBe(255);
    }
  });
});
