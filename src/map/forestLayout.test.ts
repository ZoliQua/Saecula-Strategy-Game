import { describe, expect, it } from 'vitest';
import { TERRAIN_LOOK } from '../config/visual';
import { depthRow, isForestEdge, lowerBound, treePlacement, visibleRows } from './forestLayout';
import { MapData } from './MapData';
import { TERRAIN } from './TerrainTypes';

function forest(size: number): MapData {
  const map = new MapData(size, size, TERRAIN.forest);
  map.setTile(0, 0, TERRAIN.grass);
  return map;
}

describe('forest layout', () => {
  it('flags trees next to open ground (not the map border) as edge trees', () => {
    const map = forest(6);
    expect(isForestEdge(map, 1, 0)).toBe(true);
    expect(isForestEdge(map, 0, 1)).toBe(true);
    expect(isForestEdge(map, 3, 3)).toBe(false);
    expect(isForestEdge(map, 5, 5)).toBe(false);
  });

  it('places edge trees larger than interior trees, deterministically', () => {
    const map = forest(8);
    const edge = treePlacement(map, 1, 0, 8);
    const inner = treePlacement(map, 4, 4, 8);
    expect(edge.edge).toBe(true);
    expect(edge.scale).toBeGreaterThanOrEqual(TERRAIN_LOOK.edgeTreeScale * 0.92);
    expect(inner.scale).toBeLessThanOrEqual(TERRAIN_LOOK.interiorTreeScale * 1.12);
    expect(treePlacement(map, 4, 4, 8)).toEqual(inner);
    expect(inner.frame).toBeGreaterThanOrEqual(0);
    expect(inner.frame).toBeLessThan(16);
  });

  it('keeps the tree near its tile centre', () => {
    const p = treePlacement(forest(8), 5, 2, 8);
    expect(Math.abs(p.x - (5 - 2) * 32)).toBeLessThanOrEqual(5);
    expect(Math.abs(p.y - (5 + 2) * 16)).toBeLessThanOrEqual(2.5);
    expect(depthRow(5, 2)).toBe(7);
  });

  it('selects the depth rows a view can see, padded for tall sprites', () => {
    // Rows sit 16 px apart; a view from y=160 to y=320 sees rows 10..20 plus padding.
    expect(visibleRows(160, 320, 100, 0, 0)).toEqual({ first: 10, last: 20 });
    expect(visibleRows(160, 320, 100, 96, 16)).toEqual({ first: 9, last: 26 });
    expect(visibleRows(-500, 40, 100, 0, 0)).toEqual({ first: 0, last: 2 });
    expect(visibleRows(5000, 6000, 100, 0, 0).first).toBeGreaterThan(visibleRows(5000, 6000, 100, 0, 0).last);
  });

  it('binary-searches sorted positions', () => {
    const xs = [-40, -10, 0, 12, 12, 90];
    expect(lowerBound(xs, -100)).toBe(0);
    expect(lowerBound(xs, 12)).toBe(3);
    expect(lowerBound(xs, 13)).toBe(5);
    expect(lowerBound(xs, 1000)).toBe(6);
  });
});
