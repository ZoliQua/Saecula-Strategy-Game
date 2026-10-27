import type { TileCoord } from '../../iso/coordinates';
import { MapData } from '../MapData';
import { createRng, randInt } from '../random';
import { TERRAIN } from '../TerrainTypes';
import { placeOuterGoldLodes } from './outerGold';
import { clearDisk, inBounds, nearAnyStart, placeStartEconomies, ringStarts, scatterForestClusters, seedGoodies } from './startArea';
import { assertPlayerCount, type GeneratedMap, type PresetWall, type TemplateOptions } from './types';

/** Chebyshev radius of the wall ring around each start (the start economy stays inside it)... */
export const FORTRESS_RING_RADIUS = 9;
/** ...shrunk down to this on crowded maps so neighbouring rings keep a road between them. */
const MIN_RING_RADIUS = 7;
/** Preset walls are stone (§11.4): the medieval wall style, even for a Roman-age owner. */
const STONE_WALL_AGE = 2;
/** Tiles left open in the middle of a gated side. */
export const FORTRESS_GATE_WIDTH = 3;

/**
 * AoE2 "Arena"-style map (§11.4): every start sits inside a finished
 * stone wall ring (a square, clipped by the map edge) with a gate gap on
 * the two sides facing the open centre. All start resources are inside
 * the walls (the outer gold lode is a short walk out of a gate); the centre
 * holds a richer prize of gold and trees.
 */
export function generateFortress(options: TemplateOptions): GeneratedMap {
  const { width, height, seed, playerCount } = options;
  assertPlayerCount(playerCount);
  const rng = createRng(seed);
  const map = new MapData(width, height, TERRAIN.grass);
  const playerStarts = ringStarts(width, height, playerCount, 11);
  const center = { tx: Math.floor(width / 2), ty: Math.floor(height / 2) };

  scatterForestClusters(map, rng, nearAnyStart(playerStarts, FORTRESS_RING_RADIUS + 1), 0.12);
  clearDisk(map, center, 5);
  seedGoodies(map, rng, center, 4, randInt(rng, 5, 8), 14);

  const radius = ringRadius(playerStarts);
  // The start economy keeps off the ring line (walls and gates): parked as cliff while it is laid out.
  const ringLine = playerStarts.flatMap((s) => wallRing(map, s, center, radius, 0));
  for (const t of ringLine) map.setTile(t.tx, t.ty, TERRAIN.cliff);
  placeStartEconomies(map, rng, playerStarts);
  for (const t of ringLine) map.setTile(t.tx, t.ty, TERRAIN.grass);

  const walls: PresetWall[] = [];
  const taken = new Set<number>();
  // On a crowded map a ring may cut into a neighbour's: those tiles stay open (the neighbour's yard).
  const insideOther = (tile: TileCoord, own: number) =>
    playerStarts.some((s, i) => i !== own && Math.max(Math.abs(s.tx - tile.tx), Math.abs(s.ty - tile.ty)) < radius);
  playerStarts.forEach((start, playerIndex) => {
    for (const tile of wallRing(map, start, center, radius)) {
      const key = tile.ty * width + tile.tx;
      if (taken.has(key) || insideOther(tile, playerIndex)) continue;
      taken.add(key);
      walls.push({ tile, playerIndex, minStyleAge: STONE_WALL_AGE });
    }
  });
  // The outer gold lies outside the walls (or in a roomy yard), reached through the gates.
  const outerLodes = placeOuterGoldLodes(map, rng, playerStarts, (tx, ty) => taken.has(ty * width + tx));
  return { map, playerStarts, walls, outerLodes };
}

/** The ring radius: FORTRESS_RING_RADIUS, less when starts are so close that rings would leave no road between. */
export function ringRadius(starts: readonly TileCoord[]): number {
  let closest = Infinity;
  for (let i = 0; i < starts.length; i++) {
    for (let j = i + 1; j < starts.length; j++) {
      const a = starts[i]!;
      const b = starts[j]!;
      closest = Math.min(closest, Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty)));
    }
  }
  // Two rings plus a 3-tile road between them.
  return Math.max(MIN_RING_RADIUS, Math.min(FORTRESS_RING_RADIUS, Math.floor((closest - 4) / 2)));
}

/**
 * The square ring of wall tiles `r` around `start`, inside the map,
 * minus a `gateWidth` gap mid-way along each of the two sides that face
 * `center` most.
 */
export function wallRing(map: MapData, start: TileCoord, center: TileCoord, r: number, gateWidth = FORTRESS_GATE_WIDTH): TileCoord[] {
  const toCenter = { x: center.tx - start.tx, y: center.ty - start.ty };
  // Sides by outward normal; the two facing the centre most get gates.
  const sides = [
    { nx: 1, ny: 0 },
    { nx: -1, ny: 0 },
    { nx: 0, ny: 1 },
    { nx: 0, ny: -1 },
  ].sort((a, b) => b.nx * toCenter.x + b.ny * toCenter.y - (a.nx * toCenter.x + a.ny * toCenter.y));
  const gated = sides.slice(0, 2);
  const half = Math.floor(gateWidth / 2);
  const inGate = (dx: number, dy: number) =>
    gateWidth > 0 &&
    gated.some((s) => (s.nx !== 0 ? dx === s.nx * r && Math.abs(dy) <= half : dy === s.ny * r && Math.abs(dx) <= half));
  const tiles: TileCoord[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || inGate(dx, dy)) continue;
      const tx = start.tx + dx;
      const ty = start.ty + dy;
      if (inBounds(map, tx, ty)) tiles.push({ tx, ty });
    }
  }
  return tiles;
}
