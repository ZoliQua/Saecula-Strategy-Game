import { fbm } from '../../iso/art/palette';
import type { TileCoord } from '../../iso/coordinates';
import { MapData } from '../MapData';
import { createRng } from '../random';
import { TERRAIN, type TerrainId } from '../TerrainTypes';
import { fillPockets } from './regions';
import { clearDisk, placeStartEconomies } from './startArea';
import { assertPlayerCount, type GeneratedMap, type TemplateOptions } from './types';

/** §11.5 noise scale. */
const NOISE_SCALE = 0.1;
/**
 * The raw noise is squeezed by CONTRAST around CENTER before the §11.5
 * thresholds apply, which gives about 15% water, 50% grass, 34% forest
 * and 1% gold seeds (measured over seeds 1-5).
 */
const CONTRAST = 0.87;
const CENTER = 0.44;
/** Starts keep this many tiles from the map edge. */
const START_MARGIN = 9;
/** Start clearing radius: room for the whole start economy. */
const START_CLEARING = 8;

/** §11.5 bands: water (obstacle only) < 0.3 ≤ grass < 0.5 ≤ forest < 0.7 ≤ gold seed. */
export function terrainForNoise(v: number): TerrainId {
  if (v < 0.3) return TERRAIN.water;
  if (v < 0.5) return TERRAIN.grass;
  if (v < 0.7) return TERRAIN.forest;
  return TERRAIN.gold_mine;
}

/**
 * Noise map (§11.5): water lakes as obstacles, grass, forest and rare
 * gold seeds by noise band. Starts are spread over the largest walkable
 * region (farthest-point sampling, player 0 nearest the top), cleared,
 * and given the shared start economy.
 */
export function generateRandom(options: TemplateOptions): GeneratedMap {
  const { width, height, seed, playerCount } = options;
  assertPlayerCount(playerCount);
  const rng = createRng(seed);
  const noiseSeed = seed % 65_521;
  const map = new MapData(width, height, TERRAIN.grass);
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const n = fbm(tx * NOISE_SCALE, ty * NOISE_SCALE, noiseSeed);
      map.setTile(tx, ty, terrainForNoise((n - 0.5) * CONTRAST + CENTER));
    }
  }
  const playerStarts = spreadStarts(map, playerCount);
  for (const s of playerStarts) clearDisk(map, s, START_CLEARING);
  placeStartEconomies(map, rng, playerStarts);
  fillPockets(map, playerStarts, TERRAIN.forest);
  return { map, playerStarts, walls: [] };
}

/** `count` starts in the largest walkable region, each as far from the others as it can be. */
function spreadStarts(map: MapData, count: number): TileCoord[] {
  // Only open ground (a 5×5 walkable patch) away from the edge: the town centre must not plug a neck.
  const candidates = largestRegion(map).filter(
    (t) =>
      t.tx >= START_MARGIN && t.ty >= START_MARGIN && t.tx < map.width - START_MARGIN && t.ty < map.height - START_MARGIN &&
      isOpenPatch(map, t, 2),
  );
  if (candidates.length === 0) {
    // No room anywhere (tiny map): fall back to the middle; validation rejects it if unplayable.
    return Array.from({ length: count }, () => ({ tx: Math.floor(map.width / 2), ty: Math.floor(map.height / 2) }));
  }
  const top = { tx: map.width / 2, ty: START_MARGIN };
  const d2 = (a: TileCoord, b: TileCoord) => (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2;
  let first = candidates[0]!;
  for (const c of candidates) if (d2(c, top) < d2(first, top)) first = c;
  const starts = [first];
  const nearest = candidates.map((c) => d2(c, first));
  while (starts.length < count) {
    let best = 0;
    for (let i = 1; i < candidates.length; i++) if (nearest[i]! > nearest[best]!) best = i;
    const pick = candidates[best]!;
    starts.push(pick);
    candidates.forEach((c, i) => {
      nearest[i] = Math.min(nearest[i]!, d2(c, pick));
    });
  }
  return starts;
}

function isOpenPatch(map: MapData, at: TileCoord, r: number): boolean {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!map.isPassable(at.tx + dx, at.ty + dy)) return false;
  return true;
}

/** Tiles of the largest connected walkable region (8 directions, no corner cutting). */
function largestRegion(map: MapData): TileCoord[] {
  const w = map.width;
  const h = map.height;
  const label = new Int32Array(w * h).fill(-1);
  const open = (x: number, y: number) => map.isPassable(x, y);
  let best: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (label[i] !== -1 || !open(i % w, Math.floor(i / w))) continue;
    const region = [i];
    label[i] = i;
    for (let head = 0; head < region.length; head++) {
      const idx = region[head]!;
      const tx = idx % w;
      const ty = (idx - tx) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if ((dx === 0 && dy === 0) || !open(nx, ny) || label[ny * w + nx] !== -1) continue;
          if (dx !== 0 && dy !== 0 && (!open(tx + dx, ty) || !open(tx, ty + dy))) continue;
          label[ny * w + nx] = i;
          region.push(ny * w + nx);
        }
      }
    }
    if (region.length > best.length) best = region;
  }
  return best.map((idx) => ({ tx: idx % w, ty: Math.floor(idx / w) }));
}
