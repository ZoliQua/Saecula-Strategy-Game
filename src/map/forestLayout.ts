import { TILE_HEIGHT, TILE_WIDTH } from '../config/constants';
import { TERRAIN_LOOK } from '../config/visual';
import { hash2 } from '../iso/art/palette';
import { TERRAIN, type TerrainId } from './TerrainTypes';

export interface ForestSource {
  readonly width: number;
  readonly height: number;
  getTile(tx: number, ty: number): TerrainId;
}

/** Where and how one tree stands (world px), independent of the renderer. */
export interface TreePlacement {
  readonly x: number;
  readonly y: number;
  /** Atlas frame index (variant × 2 + flipped). */
  readonly frame: number;
  /** Display scale relative to the art (before ART_SCALE). */
  readonly scale: number;
  /** Sway phase, radians. */
  readonly phase: number;
  readonly edge: boolean;
}

/** A forest tile with at least one 4-neighbour inside the map that is not forest. */
export function isForestEdge(map: ForestSource, tx: number, ty: number): boolean {
  const open = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < map.width && y < map.height && map.getTile(x, y) !== TERRAIN.forest;
  return open(tx + 1, ty) || open(tx - 1, ty) || open(tx, ty + 1) || open(tx, ty - 1);
}

/**
 * Deterministic tree for a forest tile: variant and flip from the tile
 * hash, a small jitter inside the tile, and a larger scale on the forest
 * edge so the canopy wall reads as old growth facing the clearing.
 */
export function treePlacement(map: ForestSource, tx: number, ty: number, variants: number): TreePlacement {
  const edge = isForestEdge(map, tx, ty);
  const variant = Math.floor(hash2(tx, ty, 7) * variants) % variants;
  const flipped = hash2(tx, ty, 204) > 0.5 ? 1 : 0;
  const base = edge ? TERRAIN_LOOK.edgeTreeScale : TERRAIN_LOOK.interiorTreeScale;
  return {
    x: (tx - ty) * (TILE_WIDTH / 2) + (hash2(tx, ty, 201) - 0.5) * 10,
    y: (tx + ty) * (TILE_HEIGHT / 2) + (hash2(tx, ty, 202) - 0.5) * 5,
    frame: variant * 2 + flipped,
    scale: base * (0.92 + hash2(tx, ty, 203) * 0.2),
    phase: hash2(tx, ty, 205) * Math.PI * 2,
    edge,
  };
}

/** Depth row of a tile (tiles of one row share tileDepth and draw order). */
export function depthRow(tx: number, ty: number): number {
  return tx + ty;
}

/**
 * Inclusive range of depth rows whose content can be on screen: row s has
 * its ground line at y = s · TILE_HEIGHT / 2 and its sprites reach `above`
 * px higher and `below` px lower. Empty when first > last.
 */
export function visibleRows(
  viewTop: number,
  viewBottom: number,
  rowCount: number,
  above: number,
  below: number,
): { first: number; last: number } {
  const step = TILE_HEIGHT / 2;
  return {
    first: Math.max(0, Math.ceil((viewTop - below) / step)),
    last: Math.min(rowCount - 1, Math.floor((viewBottom + above) / step)),
  };
}

/** Index of the first element ≥ x in an ascending array (length when none). */
export function lowerBound(sorted: ArrayLike<number>, x: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((sorted[mid] ?? 0) < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
