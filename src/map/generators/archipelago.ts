import { fbm } from '../../iso/art/palette';
import type { TileCoord } from '../../iso/coordinates';
import { MapData } from '../MapData';
import { createRng, randInt } from '../random';
import { TERRAIN } from '../TerrainTypes';
import { placeOuterGoldLodes } from './outerGold';
import { fillPockets } from './regions';
import { ensureDockSites, placeFish } from './seaArea';
import { clearDisk, nearAnyStart, placeStartEconomies, scatterForestClusters } from './startArea';
import { assertPlayerCount, type GeneratedMap, type TemplateOptions } from './types';

/** Largest island radius (tiles): room for the start economy and the outer gold lode. */
const ISLAND_MAX_RADIUS = 20;
/** Open water kept between neighbouring islands at least (tiles, the difference of the distances to two starts). */
const STRAIT = 6;
/** Open water along the map edge (tiles). */
const EDGE = 2;
/** Solid land kept round every start whatever the noise did (tiles). */
const CORE = 9;

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
  // The core of every island stays solid land whatever the noise did.
  for (const s of playerStarts) clearDisk(map, s, CORE);
  scatterForestClusters(map, rng, nearAnyStart(playerStarts, 7), 0.12);
  placeStartEconomies(map, rng, playerStarts);
  const outerLodes = placeOuterGoldLodes(map, rng, playerStarts);
  fillPockets(map, playerStarts, TERRAIN.forest);
  ensureDockSites(map, playerStarts);
  placeFish(map, rng, playerStarts, randInt(rng, 4, 8));
  return { map, playerStarts, walls: [], outerLodes, naval: true, seaLinked: true };
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
