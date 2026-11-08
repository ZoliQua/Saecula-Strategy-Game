import { fbm } from '../../iso/art/palette';
import { MapData } from '../MapData';
import { createRng, randInt } from '../random';
import { TERRAIN } from '../TerrainTypes';
import { placeOuterGoldLodes } from './outerGold';
import { fillPockets } from './regions';
import { ensureDockSites, placeFish } from './seaArea';
import { nearAnyStart, placeStartEconomies, ringStarts, scatterForestClusters } from './startArea';
import { assertPlayerCount, type GeneratedMap, type TemplateOptions } from './types';

/** Radius of the central sea as a share of the map side (before noise). */
const SEA_RADIUS = 0.27;
/** How far (tiles) the start ring lies outside the lake's mean shore. */
const SHORE_GAP = 11;

/**
 * "Beltenger" (inland sea, M14): a wide lake fills the middle of the map
 * with a ragged shore; the starts sit on the land ring around it, which
 * can be walked all the way round. Fish near every start's shore, forest
 * clusters on the land.
 */
export function generateInlandSea(options: TemplateOptions): GeneratedMap {
  const { width, height, seed, playerCount } = options;
  assertPlayerCount(playerCount);
  const rng = createRng(seed);
  const map = new MapData(width, height, TERRAIN.grass);
  const side = Math.min(width, height);
  // The starts ring the lake a little way back from its shore (their dock and fish close by).
  const ringRadius = Math.min(side / 2 - 9, SEA_RADIUS * side + SHORE_GAP);
  const playerStarts = ringStarts(width, height, playerCount, side / 2 - ringRadius);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const noiseSeed = seed % 65_521;
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const wobble = (fbm(tx * 0.09, ty * 0.09, noiseSeed) - 0.5) * side * 0.12;
      if (Math.hypot(tx - cx, ty - cy) < SEA_RADIUS * side + wobble) map.setTile(tx, ty, TERRAIN.water);
    }
  }
  scatterForestClusters(map, rng, nearAnyStart(playerStarts, 7), 0.08);
  placeStartEconomies(map, rng, playerStarts);
  const outerLodes = placeOuterGoldLodes(map, rng, playerStarts);
  fillPockets(map, playerStarts, TERRAIN.forest);
  ensureDockSites(map, playerStarts);
  placeFish(map, rng, playerStarts, randInt(rng, 3, 6));
  return { map, playerStarts, walls: [], outerLodes, naval: true };
}
