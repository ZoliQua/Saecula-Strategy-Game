import { START_ECONOMY } from '../../config/balance';
import { fbm } from '../../iso/art/palette';
import type { TileCoord } from '../../iso/coordinates';
import { MapData } from '../MapData';
import { createRng, randInt } from '../random';
import { TERRAIN } from '../TerrainTypes';
import { placeOuterGoldLodes } from './outerGold';
import { fillPockets, terrainShare } from './regions';
import { ensureDockSites, placeFish } from './seaArea';
import { inBounds, nearAnyStart, placeStartEconomies, scatterForestClusters } from './startArea';
import { assertPlayerCount, type GeneratedMap, type TemplateOptions } from './types';

/** Largest island radius (tiles): room for the start economy and the outer gold lode. */
const ISLAND_MAX_RADIUS = 20;
/** Open water kept between neighbouring islands at least (tiles, the difference of the distances to two starts). */
const STRAIT = 6;
/** Open water along the map edge (tiles). */
const EDGE = 2;
/** Solid land kept round every start whatever the noise did (tiles), never across the strait to a neighbour. */
const CORE = 9;
/** Forest scattered, as a share of the whole map (the land templates' share)... */
const FOREST_DENSITY = 0.12;
/** ...but at most this share of the island land: a few islands on a big sea are not all wood. */
const FOREST_LAND_SHARE = 0.22;

/**
 * "Szigetvilág" (archipelago, M14): every start on an island of its own,
 * open sea between them and round the map edge, so an army crosses only
 * by transport. Ragged shores, forests and the start economy on every
 * island, fish round each one and out at sea.
 */
export function generateArchipelago(options: TemplateOptions): GeneratedMap {
  const { width, height, seed, playerCount } = options;
  assertPlayerCount(playerCount);
  const rng = createRng(seed);
  const map = new MapData(width, height, TERRAIN.water);
  const playerStarts = islandStarts(width, height, playerCount);
  const noiseSeed = seed % 65_521;
  // Each start's island is its Voronoi cell, short of a strait along every border and the map edge.
  for (let ty = EDGE; ty < height - EDGE; ty++) {
    for (let tx = EDGE; tx < width - EDGE; tx++) {
      const d = playerStarts.map((p) => Math.hypot(tx - p.tx, ty - p.ty)).sort((a, b) => a - b);
      const wobble = (fbm(tx * 0.12, ty * 0.12, noiseSeed) - 0.5) * 5;
      const d1 = d[0]!;
      const d2 = d[1] ?? Infinity;
      if (d1 < ISLAND_MAX_RADIUS + wobble && d2 - d1 > STRAIT + wobble * 0.4) map.setTile(tx, ty, TERRAIN.grass);
    }
  }
  // The core of every island stays solid land whatever the noise did (on its own side of the strait:
  // starts crowded on a small map would otherwise join).
  playerStarts.forEach((_, i) => keepCore(map, playerStarts, i));
  const forest = Math.min(FOREST_DENSITY, FOREST_LAND_SHARE * terrainShare(map, TERRAIN.grass));
  // The beach stays open (docks, landings): no scattered forest beside the water.
  const nearStart = nearAnyStart(playerStarts, 7);
  scatterForestClusters(map, rng, (tx, ty) => nearStart(tx, ty) || besideWater(map, tx, ty), forest);
  // The start lode keeps off the beach: a lode against the shore can leave a tile boxed in by water.
  placeStartEconomies(map, rng, playerStarts, (tx, ty) => !besideWater(map, tx, ty));
  const outerLodes = placeOuterGoldLodes(map, rng, playerStarts);
  // A small, wooded island (six starts on 64×64) can leave no open ground for the outer lode:
  // clear the trees of that island's outskirts (the start's own wood stays) and place it again.
  const bare = new Set(outerLodes.flatMap((lode, i) => (lode.length === 0 ? [i] : [])));
  if (bare.size > 0) {
    bare.forEach((i) => clearOutskirts(map, playerStarts, i));
    placeOuterGoldLodes(map, rng, playerStarts, () => false, (i) => bare.has(i)).forEach((lode, i) => {
      if (bare.has(i)) outerLodes[i] = lode;
    });
  }
  fillPockets(map, playerStarts, TERRAIN.forest);
  ensureDockSites(map, playerStarts);
  placeFish(map, rng, playerStarts, randInt(rng, 4, 8));
  return { map, playerStarts, walls: [], outerLodes, naval: true, seaLinked: true };
}

/** Grass within CORE of start `index`, on tiles at least STRAIT nearer to it than to any other start. */
function keepCore(map: MapData, starts: readonly TileCoord[], index: number): void {
  const s = starts[index]!;
  for (let ty = Math.max(0, s.ty - CORE); ty <= Math.min(map.height - 1, s.ty + CORE); ty++) {
    for (let tx = Math.max(0, s.tx - CORE); tx <= Math.min(map.width - 1, s.tx + CORE); tx++) {
      const own = Math.hypot(tx - s.tx, ty - s.ty);
      if (own > CORE) continue;
      if (starts.every((o, j) => j === index || Math.hypot(tx - o.tx, ty - o.ty) - own > STRAIT)) map.setTile(tx, ty, TERRAIN.grass);
    }
  }
}

/**
 * Forest on start `index`'s island beyond its economy radius (Chebyshev,
 * apron included, so its validated wood stays) and nearer to it than to
 * any other start becomes grass.
 */
function clearOutskirts(map: MapData, starts: readonly TileCoord[], index: number): void {
  const s = starts[index]!;
  const keep = START_ECONOMY.radius + 1;
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (map.getTile(tx, ty) !== TERRAIN.forest || Math.max(Math.abs(tx - s.tx), Math.abs(ty - s.ty)) <= keep) continue;
      const own = Math.hypot(tx - s.tx, ty - s.ty);
      if (starts.every((o, j) => j === index || Math.hypot(tx - o.tx, ty - o.ty) > own)) map.setTile(tx, ty, TERRAIN.grass);
    }
  }
}

/** Whether a tile next to (tx, ty) is water. */
function besideWater(map: MapData, tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (inBounds(map, tx + dx, ty + dy) && map.getTile(tx + dx, ty + dy) === TERRAIN.water) return true;
    }
  }
  return false;
}

/** Island centres: a ring for three or more starts; opposite corners for two (the most room on a small map). */
function islandStarts(width: number, height: number, count: number): TileCoord[] {
  const margin = Math.min(ISLAND_MAX_RADIUS, Math.floor(Math.min(width, height) / 4));
  if (count <= 2) {
    const a = { tx: margin, ty: margin };
    const b = { tx: width - 1 - margin, ty: height - 1 - margin };
    return count === 1 ? [a] : [a, b];
  }
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - margin;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { tx: Math.round(cx + Math.cos(angle) * r), ty: Math.round(cy + Math.sin(angle) * r) };
  });
}
