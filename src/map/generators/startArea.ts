import { START_ECONOMY } from '../../config/balance';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../MapData';
import { randInt } from '../random';
import { TERRAIN, type TerrainId } from '../TerrainTypes';

/** Tiles this close (Chebyshev) to a start stay free of trees and mines: town centre, villagers and a walk-around ring. */
export const START_CORE_RADIUS = 3;

export function inBounds(map: MapData, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < map.width && ty < map.height;
}

/** Starts spread evenly on a ring `margin` tiles in from the map edge, player 0 at the top. */
export function ringStarts(width: number, height: number, count: number, margin: number): TileCoord[] {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - margin;
  const starts: TileCoord[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    starts.push({ tx: Math.round(cx + Math.cos(angle) * radius), ty: Math.round(cy + Math.sin(angle) * radius) });
  }
  return starts;
}

/** Turns every tile within Euclidean `radius` of `center` (rounded to a tile) into `terrain` (grass). */
export function clearDisk(map: MapData, center: TileCoord, radius: number, terrain: TerrainId = TERRAIN.grass): void {
  const r = Math.ceil(radius);
  const cx = Math.round(center.tx);
  const cy = Math.round(center.ty);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      if (inBounds(map, cx + dx, cy + dy)) map.setTile(cx + dx, cy + dy, terrain);
    }
  }
}

/** Predicate: (tx, ty) is within Chebyshev `radius` of any of `starts`. */
export function nearAnyStart(starts: readonly TileCoord[], radius: number): (tx: number, ty: number) => boolean {
  return (tx, ty) => starts.some((s) => Math.abs(s.tx - tx) <= radius && Math.abs(s.ty - ty) <= radius);
}

/**
 * The start economy every template shares (START_ECONOMY), for every
 * start: its core cleared to grass, a gold lode of several adjacent tiles,
 * a berry patch and a forest clump, each on its own side of the town
 * centre. Nothing lands in any start's core (starts may be close).
 */
export function placeStartEconomies(map: MapData, rng: () => number, starts: readonly TileCoord[]): void {
  const inCore = nearAnyStart(starts, START_CORE_RADIUS);
  for (const start of starts) {
    for (let dy = -START_CORE_RADIUS; dy <= START_CORE_RADIUS; dy++) {
      for (let dx = -START_CORE_RADIUS; dx <= START_CORE_RADIUS; dx++) {
        if (inBounds(map, start.tx + dx, start.ty + dy)) map.setTile(start.tx + dx, start.ty + dy, TERRAIN.grass);
      }
    }
  }
  for (const start of starts) placeStartEconomy(map, rng, start, inCore);
}

function placeStartEconomy(map: MapData, rng: () => number, start: TileCoord, inCore: TilePredicate): void {
  const e = START_ECONOMY;
  const goldAngle = placeGoldLode(map, rng, start, inCore, rng() * Math.PI * 2, randInt(rng, e.goldTiles.min, e.goldTiles.max + 1));
  const berryAngle = goldAngle + Math.PI * (0.55 + rng() * 0.3);
  const bushes = randInt(rng, e.berryBushes.min, e.berryBushes.max + 1);
  placeClump(map, rng, start, inCore, berryAngle, e.berryRing, TERRAIN.berries, bushes);
  const treeAngle = goldAngle - Math.PI * (0.55 + rng() * 0.3);
  const trees = randInt(rng, e.trees.min, e.trees.max + 1);
  placeClump(map, rng, start, inCore, treeAngle, e.treeRing, TERRAIN.forest, trees);
}

export type TilePredicate = (tx: number, ty: number) => boolean;

/** Ring point at `angle`, `dist` tiles from `start`. */
export function ringPoint(start: TileCoord, angle: number, dist: number): TileCoord {
  return { tx: Math.round(start.tx + Math.cos(angle) * dist), ty: Math.round(start.ty + Math.sin(angle) * dist) };
}

/**
 * The tiles of a gold lode at `at` (top-left): a 3×2 block when `wide`,
 * else 2×3, one corner left out when `count` is 5. Every tile touches open
 * ground, so all of it can be mined at once.
 */
export function lodeTiles(at: TileCoord, wide: boolean, count: number): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let i = 0; i < 6; i++) {
    tiles.push(wide ? { tx: at.tx + (i % 3), ty: at.ty + Math.floor(i / 3) } : { tx: at.tx + (i % 2), ty: at.ty + Math.floor(i / 2) });
  }
  return tiles.slice(0, count);
}

/**
 * The start lode (lodeTiles) in the START_ECONOMY gold ring.
 * Returns the direction (radians from the start) it ended up in.
 */
function placeGoldLode(map: MapData, rng: () => number, start: TileCoord, inCore: TilePredicate, angle: number, count: number): number {
  const ring = START_ECONOMY.goldRing;
  for (let attempt = 0; attempt < 32; attempt++) {
    const a = angle + (attempt === 0 ? 0 : (rng() - 0.5) * Math.PI * 1.5);
    const at = ringPoint(start, a, ring.min + rng() * (ring.max - ring.min));
    const lode = lodeTiles(at, rng() < 0.5, count);
    if (!lode.every((t) => inBounds(map, t.tx, t.ty) && !inCore(t.tx, t.ty))) continue;
    if (!lode.every((t) => map.getTile(t.tx, t.ty) === TERRAIN.grass || map.getTile(t.tx, t.ty) === TERRAIN.forest)) continue;
    for (const t of lode) map.setTile(t.tx, t.ty, TERRAIN.gold_mine);
    return a;
  }
  return angle;
}

/** Grass tiles this far from a clump's centre may join it (the nearest ones fill first). */
const CLUMP_REACH = 4;

/** `count` tiles of `terrain` on the grass nearest a ring point (outside the core, clear of gold). */
function placeClump(
  map: MapData,
  rng: () => number,
  start: TileCoord,
  inCore: TilePredicate,
  angle: number,
  ring: { readonly min: number; readonly max: number },
  terrain: TerrainId,
  count: number,
): void {
  const center = ringPoint(start, angle, ring.min + rng() * (ring.max - ring.min));
  const spots: TileCoord[] = [];
  for (let dy = -CLUMP_REACH; dy <= CLUMP_REACH; dy++) {
    for (let dx = -CLUMP_REACH; dx <= CLUMP_REACH; dx++) {
      const tx = center.tx + dx;
      const ty = center.ty + dy;
      if (!inBounds(map, tx, ty) || inCore(tx, ty)) continue;
      // A gap stays around the gold lode so the clump never seals it in.
      if (map.getTile(tx, ty) === TERRAIN.grass && !touchesGold(map, tx, ty)) spots.push({ tx, ty });
    }
  }
  // Nearest the clump centre first, with a little jitter so the outline varies.
  const keyed = spots.map((s) => ({ s, k: Math.hypot(s.tx - center.tx, s.ty - center.ty) + rng() * 1.2 }));
  keyed.sort((a, b) => a.k - b.k);
  for (const { s } of keyed.slice(0, count)) map.setTile(s.tx, s.ty, terrain);
}

function touchesGold(map: MapData, tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (inBounds(map, tx + dx, ty + dy) && map.getTile(tx + dx, ty + dy) === TERRAIN.gold_mine) return true;
    }
  }
  return false;
}

/**
 * Forest clusters (3-8 trees) scattered until `density` of the map is
 * forest, skipping tiles `isReserved` (start areas).
 */
export function scatterForestClusters(
  map: MapData,
  rng: () => number,
  isReserved: (tx: number, ty: number) => boolean,
  density: number,
): void {
  const target = Math.floor(map.width * map.height * density);
  let placed = 0;
  const maxAttempts = target * 8;
  for (let attempts = 0; placed < target && attempts < maxAttempts; attempts++) {
    const cx = randInt(rng, 2, map.width - 2);
    const cy = randInt(rng, 2, map.height - 2);
    if (isReserved(cx, cy)) continue;
    const clusterSize = randInt(rng, 3, 9);
    for (let i = 0; i < clusterSize && placed < target; i++) {
      const tx = cx + randInt(rng, -2, 3);
      const ty = cy + randInt(rng, -2, 3);
      if (!inBounds(map, tx, ty) || isReserved(tx, ty)) continue;
      if (map.getTile(tx, ty) !== TERRAIN.grass) continue;
      map.setTile(tx, ty, TERRAIN.forest);
      placed++;
    }
  }
}

/** A handful of gold tiles and trees around `center` (the no-man's-land prize). */
export function seedGoodies(map: MapData, rng: () => number, center: TileCoord, radius: number, gold: number, trees: number): void {
  const put = (terrain: TerrainId, r: number) => {
    const tx = center.tx + randInt(rng, -r, r + 1);
    const ty = center.ty + randInt(rng, -r, r + 1);
    if (inBounds(map, tx, ty) && map.getTile(tx, ty) === TERRAIN.grass) map.setTile(tx, ty, terrain);
  };
  for (let i = 0; i < gold; i++) put(TERRAIN.gold_mine, radius);
  for (let i = 0; i < trees; i++) put(TERRAIN.forest, radius + 1);
}
