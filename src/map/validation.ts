import { RESOURCE_NODE_AMOUNT, START_ECONOMY } from '../config/balance';
import type { TileCoord } from '../iso/coordinates';
import { floodFrom } from './generators/regions';
import type { GeneratedMap } from './generators/types';
import { townCenterOrigin, TOWN_CENTER_SIZE, villagerSpawnTiles } from './startLayout';
import { TERRAIN, isPassable, type TerrainId } from './TerrainTypes';

export interface MapValidation {
  readonly ok: boolean;
  /** What is wrong, one line per problem (empty when ok). */
  readonly problems: readonly string[];
}

/** Resources a villager can work at a start: within START_ECONOMY.radius and reachable from it. */
export interface StartEconomy {
  readonly food: number;
  readonly wood: number;
  readonly gold: number;
}

const STEPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const RESOURCE_OF: Partial<Record<TerrainId, keyof StartEconomy>> = {
  [TERRAIN.forest]: 'wood',
  [TERRAIN.gold_mine]: 'gold',
  [TERRAIN.berries]: 'food',
};

/**
 * Post-generation check (PROGRAM_TERV.md §11.6) on the map as the game
 * will spawn it (town centres and preset walls block their tiles): every
 * start's town centre and villager tiles are free, every start reaches
 * every other one on foot, and each start has the START_ECONOMY minimum
 * of food, wood and gold reachable close by, and its own outer gold
 * lode (at least outerGold.tiles.min of its tagged lode tiles, see outerLodeTiles).
 */
export function validateMap(generated: GeneratedMap): MapValidation {
  const { map, playerStarts } = generated;
  const problems: string[] = [];
  const w = map.width;
  const h = map.height;
  const walls = new Set(generated.walls.map((wl) => wl.tile.ty * w + wl.tile.tx));
  const open = new Uint8Array(w * h);
  map.forEachTile(({ tx, ty }, terrain) => {
    const idx = ty * w + tx;
    if (isPassable(terrain) && !walls.has(idx)) open[idx] = 1;
  });
  for (const s of playerStarts) {
    const o = townCenterOrigin(s);
    for (let ty = Math.max(0, o.ty); ty < Math.min(h, o.ty + TOWN_CENTER_SIZE); ty++) {
      for (let tx = Math.max(0, o.tx); tx < Math.min(w, o.tx + TOWN_CENTER_SIZE); tx++) open[ty * w + tx] = 0;
    }
  }
  const walkable = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < w && ty < h && open[ty * w + tx] === 1;

  playerStarts.forEach((start, i) => {
    const o = townCenterOrigin(start);
    for (let dy = 0; dy < TOWN_CENTER_SIZE; dy++) {
      for (let dx = 0; dx < TOWN_CENTER_SIZE; dx++) {
        const tx = o.tx + dx;
        const ty = o.ty + dy;
        const free = tx >= 0 && ty >= 0 && tx < w && ty < h && isPassable(map.getTile(tx, ty)) && !walls.has(ty * w + tx);
        if (!free) problems.push(`player ${i}: town centre tile (${tx}, ${ty}) is blocked`);
      }
    }
    for (const v of villagerSpawnTiles(start)) {
      if (!walkable(v.tx, v.ty)) problems.push(`player ${i}: villager tile (${v.tx}, ${v.ty}) is blocked`);
    }
  });
  if (problems.length > 0 || playerStarts.length === 0) return { ok: problems.length === 0, problems };

  const reached = floodFrom([villagerSpawnTiles(playerStarts[0]!)[1]!], w, h, walkable);
  playerStarts.forEach((start, i) => {
    const v = villagerSpawnTiles(start)[1]!;
    if (!reached[v.ty * w + v.tx]) problems.push(`player ${i} cannot be reached from player 0`);
  });
  playerStarts.forEach((start, i) => {
    const reachedFrom = i === 0 ? reached : floodFrom([villagerSpawnTiles(start)[1]!], w, h, walkable);
    const eco = startEconomy(generated, start, reachedFrom);
    if (eco.gold < START_ECONOMY.minGold) problems.push(`player ${i}: only ${eco.gold} gold near the start`);
    const own = ownedGold(generated, i, reachedFrom);
    if (own < START_ECONOMY.minTotalGold) problems.push(`player ${i}: only ${own} gold of its own within ${START_ECONOMY.outerGold.radius} tiles`);
    const outer = outerLodeTiles(generated, i, reachedFrom);
    if (outer < START_ECONOMY.outerGold.tiles.min) {
      problems.push(`player ${i}: only ${outer} workable tiles of its own in its outer gold lode`);
    }
    if (eco.food < START_ECONOMY.minFood) problems.push(`player ${i}: only ${eco.food} food near the start`);
    if (eco.wood < START_ECONOMY.minWood) problems.push(`player ${i}: only ${eco.wood} wood near the start`);
  });
  return { ok: problems.length === 0, problems };
}

/**
 * Gold start `index` can count on for the later ages: workable gold tiles
 * within START_ECONOMY.outerGold.radius (Chebyshev) that lie nearer to it
 * than to any other start (`reached` as in startEconomy).
 */
export function ownedGold(generated: GeneratedMap, index: number, reached?: Uint8Array): number {
  return ownGoldTiles(generated, index, reached) * RESOURCE_NODE_AMOUNT.gold;
}

/**
 * The outer lode itself: how many of the tiles placeOuterGoldLodes tagged
 * for start `index` (GeneratedMap.outerLodes) are still gold, workable
 * (`reached` as in startEconomy) and nearer to it than to any other start.
 * Untagged gold (a centre prize, random-template gold) never counts, so a
 * start whose lode found no room fails validation and the map is retried.
 */
export function outerLodeTiles(generated: GeneratedMap, index: number, reached?: Uint8Array): number {
  const { map, playerStarts } = generated;
  const start = playerStarts[index];
  if (!start) return 0;
  const canReach = reached ?? floodOpen(generated, start);
  const d2 = (s: TileCoord, t: TileCoord) => (s.tx - t.tx) ** 2 + (s.ty - t.ty) ** 2;
  let tiles = 0;
  for (const t of generated.outerLodes[index] ?? []) {
    if (t.tx < 0 || t.ty < 0 || t.tx >= map.width || t.ty >= map.height) continue;
    if (map.getTile(t.tx, t.ty) !== TERRAIN.gold_mine || !workableFrom(canReach, map.width, map.height, t.tx, t.ty)) continue;
    const mine = d2(start, t);
    if (playerStarts.every((s, j) => j === index || d2(s, t) > mine)) tiles++;
  }
  return tiles;
}

/** Workable gold tiles within outerGold.radius of start `index`, nearer to it than to any other start. */
function ownGoldTiles(generated: GeneratedMap, index: number, reached: Uint8Array | undefined): number {
  const { map, playerStarts } = generated;
  const start = playerStarts[index];
  if (!start) return 0;
  const canReach = reached ?? floodOpen(generated, start);
  const r = START_ECONOMY.outerGold.radius;
  const d2 = (s: TileCoord, tx: number, ty: number) => (s.tx - tx) ** 2 + (s.ty - ty) ** 2;
  let tiles = 0;
  for (let ty = Math.max(0, start.ty - r); ty <= Math.min(map.height - 1, start.ty + r); ty++) {
    for (let tx = Math.max(0, start.tx - r); tx <= Math.min(map.width - 1, start.tx + r); tx++) {
      if (map.getTile(tx, ty) !== TERRAIN.gold_mine || !workableFrom(canReach, map.width, map.height, tx, ty)) continue;
      const mine = d2(start, tx, ty);
      if (playerStarts.every((s, j) => j === index || d2(s, tx, ty) > mine)) tiles++;
    }
  }
  return tiles;
}

/** Tiles walkable from `start` over the bare terrain. */
function floodOpen(generated: GeneratedMap, start: TileCoord): Uint8Array {
  const { map } = generated;
  const w = map.width;
  const h = map.height;
  return floodFrom([villagerSpawnTiles(start)[1]!], w, h, (tx, ty) => tx >= 0 && ty >= 0 && tx < w && ty < h && isPassable(map.getTile(tx, ty)));
}

/** A villager can stand next to (tx, ty): a neighbour is in `reached`. */
function workableFrom(reached: Uint8Array, w: number, h: number, tx: number, ty: number): boolean {
  return STEPS.some(([dx, dy]) => {
    const nx = tx + dx;
    const ny = ty + dy;
    return nx >= 0 && ny >= 0 && nx < w && ny < h && reached[ny * w + nx] === 1;
  });
}

/**
 * Food / wood / gold on resource tiles within START_ECONOMY.radius of
 * `start` that a villager can stand next to (`reached`: tiles walkable
 * from the start; a flood over the bare terrain when omitted).
 */
export function startEconomy(generated: GeneratedMap, start: TileCoord, reached?: Uint8Array): StartEconomy {
  const { map } = generated;
  const w = map.width;
  const h = map.height;
  const r = START_ECONOMY.radius;
  const canReach = reached ?? floodOpen(generated, start);
  const out = { food: 0, wood: 0, gold: 0 };
  for (let ty = Math.max(0, start.ty - r); ty <= Math.min(h - 1, start.ty + r); ty++) {
    for (let tx = Math.max(0, start.tx - r); tx <= Math.min(w - 1, start.tx + r); tx++) {
      const type = RESOURCE_OF[map.getTile(tx, ty)];
      if (!type) continue;
      if (workableFrom(canReach, w, h, tx, ty) || canReach[ty * w + tx] === 1) out[type] += RESOURCE_NODE_AMOUNT[type];
    }
  }
  return out;
}
