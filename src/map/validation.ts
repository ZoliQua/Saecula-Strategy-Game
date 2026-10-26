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
 * of food, wood and gold reachable close by.
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
    const own = i === 0 ? reached : floodFrom([villagerSpawnTiles(start)[1]!], w, h, walkable);
    const eco = startEconomy(generated, start, own);
    if (eco.gold < START_ECONOMY.minGold) problems.push(`player ${i}: only ${eco.gold} gold near the start`);
    if (eco.food < START_ECONOMY.minFood) problems.push(`player ${i}: only ${eco.food} food near the start`);
    if (eco.wood < START_ECONOMY.minWood) problems.push(`player ${i}: only ${eco.wood} wood near the start`);
  });
  return { ok: problems.length === 0, problems };
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
  const canReach =
    reached ??
    floodFrom([villagerSpawnTiles(start)[1]!], w, h, (tx, ty) => tx >= 0 && ty >= 0 && tx < w && ty < h && isPassable(map.getTile(tx, ty)));
  const out = { food: 0, wood: 0, gold: 0 };
  for (let ty = Math.max(0, start.ty - r); ty <= Math.min(h - 1, start.ty + r); ty++) {
    for (let tx = Math.max(0, start.tx - r); tx <= Math.min(w - 1, start.tx + r); tx++) {
      const type = RESOURCE_OF[map.getTile(tx, ty)];
      if (!type) continue;
      const workable = STEPS.some(([dx, dy]) => {
        const nx = tx + dx;
        const ny = ty + dy;
        return nx >= 0 && ny >= 0 && nx < w && ny < h && canReach[ny * w + nx] === 1;
      });
      if (workable || canReach[ty * w + tx] === 1) out[type] += RESOURCE_NODE_AMOUNT[type];
    }
  }
  return out;
}
