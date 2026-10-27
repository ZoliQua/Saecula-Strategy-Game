import { fbm } from '../../iso/art/palette';
import { MapData } from '../MapData';
import { createRng, randInt } from '../random';
import { TERRAIN } from '../TerrainTypes';
import { carveBridge } from './carve';
import { placeOuterGoldLodes } from './outerGold';
import { fillPockets } from './regions';
import { clearDisk, nearAnyStart, placeStartEconomies, ringStarts, scatterForestClusters, seedGoodies } from './startArea';
import { assertPlayerCount, type GeneratedMap, type TemplateOptions } from './types';

/** Half-width of the cliff channels between islands, as a share of the map side (before noise). */
const CHANNEL_HALF = 0.05;
/** Cliff band along the map rim, as a share of the map side (before noise). */
const RIM = 0.07;

/**
 * AoE2 "Continents"-style map (§11.3) with impassable cliffs instead of
 * water: 2-3 large islands (sectors of the map holding neighbouring
 * starts), a cliff rim, and one bridge 1-2 tiles wide across every
 * channel. Every island carries its own players' full start economy,
 * forest and a little gold.
 */
export function generateIslands(options: TemplateOptions): GeneratedMap {
  const { width, height, seed, playerCount } = options;
  assertPlayerCount(playerCount);
  const rng = createRng(seed);
  const map = new MapData(width, height, TERRAIN.grass);
  const noiseSeed = seed % 65_521;
  const side = Math.min(width, height);
  const rim = RIM * side;
  const channelHalf = CHANNEL_HALF * side;
  const playerStarts = ringStarts(width, height, playerCount, Math.round(rim + 6));
  const center = { tx: (width - 1) / 2, ty: (height - 1) / 2 };
  const boundaries = channelAngles(playerCount, Math.min(3, Math.max(2, playerCount)));

  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const wobble = (fbm(tx * 0.12, ty * 0.12, noiseSeed) - 0.5) * 4;
      const edge = Math.min(tx, ty, width - 1 - tx, height - 1 - ty);
      if (edge < rim + wobble || inChannel(tx - center.tx, ty - center.ty, boundaries, channelHalf + wobble * 0.6)) {
        map.setTile(tx, ty, TERRAIN.cliff);
      }
    }
  }
  // Where the channels meet: a cliff hub, so islands touch only by bridges.
  clearDisk(map, center, side * 0.09, TERRAIN.cliff);
  for (const s of playerStarts) clearDisk(map, s, 6);
  scatterForestClusters(map, rng, nearAnyStart(playerStarts, 6), 0.09);

  // Bridges after the forest, so no tree lands on one.
  const reach = side / 2;
  for (const angle of boundaries) {
    const along = reach * (0.42 + rng() * 0.2);
    const span = channelHalf + 4;
    const at = { tx: center.tx + Math.cos(angle) * along, ty: center.ty + Math.sin(angle) * along };
    const across = { tx: -Math.sin(angle), ty: Math.cos(angle) };
    const a = { tx: Math.round(at.tx - across.tx * span), ty: Math.round(at.ty - across.ty * span) };
    const b = { tx: Math.round(at.tx + across.tx * span), ty: Math.round(at.ty + across.ty * span) };
    carveBridge(map, a, b, rng() < 0.5 ? 1 : 2);
  }

  // A little extra gold on every island, between its starts and the hub.
  for (const s of playerStarts) {
    const mid = { tx: Math.round((s.tx + center.tx) / 2), ty: Math.round((s.ty + center.ty) / 2) };
    seedGoodies(map, rng, mid, 2, randInt(rng, 1, 3), 3);
  }
  placeStartEconomies(map, rng, playerStarts);
  placeOuterGoldLodes(map, rng, playerStarts);
  fillPockets(map, playerStarts, TERRAIN.cliff);
  return { map, playerStarts, walls: [] };
}

/**
 * Directions (radians, from the map centre) of the channels between
 * islands: the sector boundaries between groups of neighbouring starts
 * (start i sits at angle i / n · 2π − π/2, as ringStarts places them).
 */
export function channelAngles(playerCount: number, islandCount: number): number[] {
  const startAngle = (i: number) => (i / playerCount) * Math.PI * 2 - Math.PI / 2;
  if (playerCount < 2) return [startAngle(0) + Math.PI / 2, startAngle(0) - Math.PI / 2];
  const firstOf = (j: number) => Math.floor((j * playerCount) / islandCount);
  const angles: number[] = [];
  for (let j = 0; j < islandCount; j++) {
    // Between the first start of island j and the last start of island j - 1.
    angles.push(startAngle(firstOf(j)) - Math.PI / playerCount);
  }
  return angles;
}

/** True when (x, y) (relative to the map centre) lies within `half` tiles of a channel ray. */
function inChannel(x: number, y: number, angles: readonly number[], half: number): boolean {
  for (const a of angles) {
    const along = x * Math.cos(a) + y * Math.sin(a);
    if (along < 0) continue;
    if (Math.abs(-x * Math.sin(a) + y * Math.cos(a)) < half) return true;
  }
  return false;
}
