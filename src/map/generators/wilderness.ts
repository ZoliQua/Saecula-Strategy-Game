import { fbm } from '../../iso/art/palette';
import type { TileCoord } from '../../iso/coordinates';
import { MapData } from '../MapData';
import { createRng, randInt, randRange } from '../random';
import { TERRAIN } from '../TerrainTypes';
import { carveCorridor } from './carve';
import { fillPockets } from './regions';
import { clearDisk, inBounds, placeStartEconomies, ringStarts, seedGoodies } from './startArea';
import { assertPlayerCount, type GeneratedMap, type TemplateOptions } from './types';

/** Noise above this opens a glade in the forest (tuned for ~40% grass overall). */
const GLADE_THRESHOLD = 0.6;
const GLADE_SCALE = 0.09;
/** Start clearing radius (tiles), before the noisy edge. */
const CLEARING_RADIUS = 8.5;

/**
 * AoE2 "Black Forest"-style map (§11.2): about 60% forest. Each start sits
 * in a clearing; roads 3-4 tiles wide run from every start to the open
 * centre and on to the neighbouring starts; noise opens a few glades.
 * Gold is scarce: the start lode plus a couple of tiles mid-map.
 */
export function generateWilderness(options: TemplateOptions): GeneratedMap {
  const { width, height, seed, playerCount } = options;
  assertPlayerCount(playerCount);
  const rng = createRng(seed);
  const map = new MapData(width, height, TERRAIN.forest);
  const noiseSeed = seed % 65_521;
  const playerStarts = ringStarts(width, height, playerCount, 9);
  const center = { tx: Math.floor(width / 2), ty: Math.floor(height / 2) };

  // Glades first: the clearings and roads cut through whatever they leave.
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      if (fbm(tx * GLADE_SCALE, ty * GLADE_SCALE, noiseSeed) > GLADE_THRESHOLD) map.setTile(tx, ty, TERRAIN.grass);
    }
  }
  for (const s of playerStarts) carveNoisyClearing(map, s, CLEARING_RADIUS, noiseSeed + 7);
  carveNoisyClearing(map, center, Math.min(width, height) * 0.1, noiseSeed + 11);

  const road = () => randRange(rng, 1.5, 2.0);
  const bend = () => randRange(rng, -0.12, 0.12) * Math.min(width, height);
  for (const s of playerStarts) carveCorridor(map, s, center, road(), bend());
  if (playerCount >= 3) {
    playerStarts.forEach((s, i) => carveCorridor(map, s, playerStarts[(i + 1) % playerCount]!, road(), bend()));
  }

  seedGoodies(map, rng, center, 3, randInt(rng, 2, 4), 0);
  placeStartEconomies(map, rng, playerStarts);
  fillPockets(map, playerStarts, TERRAIN.forest);
  return { map, playerStarts, walls: [] };
}

function carveNoisyClearing(map: MapData, center: TileCoord, radius: number, noiseSeed: number): void {
  const r = Math.ceil(radius + 2);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const tx = center.tx + dx;
      const ty = center.ty + dy;
      if (!inBounds(map, tx, ty)) continue;
      const edge = radius + (fbm(tx * 0.3, ty * 0.3, noiseSeed) - 0.5) * 4;
      if (dx * dx + dy * dy <= edge * edge) map.setTile(tx, ty, TERRAIN.grass);
    }
  }
  clearDisk(map, center, Math.min(radius, 4));
}
