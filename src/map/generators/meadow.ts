import { MapData } from '../MapData';
import { createRng, randInt } from '../random';
import { TERRAIN } from '../TerrainTypes';
import { placeOuterGoldLodes } from './outerGold';
import { nearAnyStart, placeStartEconomies, ringStarts, scatterForestClusters, seedGoodies } from './startArea';
import { assertPlayerCount, type GeneratedMap, type TemplateOptions } from './types';

/**
 * AoE2 "Arabia"-style map (§11.1). 90% grass, forest clusters scattered
 * outside the start areas, a few prize gold tiles and trees in the centre,
 * and the shared start economy next to every player start.
 */
export function generateMeadow(options: TemplateOptions): GeneratedMap {
  const { width, height, seed, playerCount } = options;
  assertPlayerCount(playerCount);
  const rng = createRng(seed);
  const map = new MapData(width, height, TERRAIN.grass);
  const playerStarts = ringStarts(width, height, playerCount, 8);

  scatterForestClusters(map, rng, nearAnyStart(playerStarts, 6), 0.1);
  const center = { tx: Math.floor(width / 2), ty: Math.floor(height / 2) };
  seedGoodies(map, rng, center, 4, randInt(rng, 2, 4), 6);
  placeStartEconomies(map, rng, playerStarts);
  const outerLodes = placeOuterGoldLodes(map, rng, playerStarts);
  return { map, playerStarts, walls: [], outerLodes };
}
