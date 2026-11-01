export const TERRAIN = {
  grass: 0,
  forest: 1,
  gold_mine: 2,
  berries: 3,
  water: 4,
  cliff: 5,
  /** A fish school on water (M14): drawn as water, impassable, fished by boats from the water beside it. */
  fish: 6,
} as const;

export type TerrainType = keyof typeof TERRAIN;
export type TerrainId = (typeof TERRAIN)[TerrainType];

const PASSABLE: ReadonlySet<TerrainId> = new Set([
  TERRAIN.grass,
  TERRAIN.berries,
]);

/**
 * Villagers can *work* on a non-passable resource tile (forest,
 * gold_mine) by standing on an adjacent passable tile. Water and
 * cliff are impassable and unworkable.
 */
const WORKABLE: ReadonlySet<TerrainId> = new Set([
  TERRAIN.forest,
  TERRAIN.gold_mine,
  TERRAIN.berries,
]);

export function isPassable(terrain: TerrainId): boolean {
  return PASSABLE.has(terrain);
}

/** Sea terrain (M14): open water or a fish school; the shore, the water shader and the minimap treat both as water. */
export function isSea(terrain: TerrainId): boolean {
  return terrain === TERRAIN.water || terrain === TERRAIN.fish;
}

export function isWorkable(terrain: TerrainId): boolean {
  return WORKABLE.has(terrain);
}

export const TERRAIN_TEXTURE_KEYS: Record<TerrainId, string> = {
  [TERRAIN.grass]: 'terrain_grass',
  [TERRAIN.forest]: 'terrain_forest',
  [TERRAIN.gold_mine]: 'terrain_gold_mine',
  [TERRAIN.berries]: 'terrain_berries',
  [TERRAIN.water]: 'terrain_water',
  [TERRAIN.cliff]: 'terrain_cliff',
  [TERRAIN.fish]: 'terrain_water',
};
