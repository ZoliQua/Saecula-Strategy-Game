import { buildingHpMultiplier } from '../../game/modifiers';
import { createBuilding } from '../../ecs/archetypes/building';
import {
  createResourceNode,
  TERRAIN_RESOURCE,
} from '../../ecs/archetypes/resource';
import { createHill } from '../../ecs/archetypes/hill';
import { createVillager } from '../../ecs/archetypes/villager';
import { createWall } from '../../ecs/archetypes/wall';
import { createUnit } from '../../ecs/archetypes/createUnit';
import { spawnMissionExtras } from '../../campaign/missionStart';
import { findHillSite } from '../../game/hill';
import { kingStartTile } from '../../game/regicide';
import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';
import { generateMap, MapGenerationError, type PresetWall } from '../../map/generator';
import type { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import { NAVAL } from '../../config/balance';
import { townCenterOrigin, villagerSpawnTiles } from '../../map/startLayout';
import { hasHill, hasRegicide, mapTiles, playerCount, type GameSetupConfig } from '../../game/GameSetupConfig';
import type { PlayerManager } from '../../game/PlayerManager';

export interface GeneratedGame {
  mapData: MapData;
  /** Start tile per player, in player id order (index 0 is the human). */
  starts: readonly TileCoord[];
  /** Finished walls the template starts with (fortress), by player slot. */
  walls: readonly PresetWall[];
}

/** Generates the skirmish map from the setup config; one start tile per player. */
export function generateGameMap(config: GameSetupConfig): GeneratedGame {
  const size = mapTiles(config);
  const generated = generateMap({
    template: config.template,
    width: size,
    height: size,
    seed: config.seed,
    playerCount: playerCount(config),
  });
  return { mapData: generated.map, starts: generated.playerStarts, walls: generated.walls };
}

/**
 * generateGameMap, or null when the setup has no playable map for the
 * seed: the template found no valid one (MapGenerationError after its
 * retries), or King of the Hill (M19) has no site on it. Any other error
 * is a bug and propagates.
 */
export function tryGenerateGameMap(config: GameSetupConfig): GeneratedGame | null {
  try {
    const game = generateGameMap(config);
    if (!hasHill(config.victory) || hillSiteOf(game)) return game;
    console.warn(`No hill site on the ${config.template} map for seed ${config.seed}`);
    return null;
  } catch (e) {
    if (e instanceof MapGenerationError) {
      console.warn(e.message);
      return null;
    }
    throw e;
  }
}

/** The hill's centre on this map (M19): the same before and after the spawn (findHillSite already counts its blockers). */
function hillSiteOf({ mapData, starts, walls }: GeneratedGame): TileCoord | null {
  return findHillSite({ map: mapData, playerStarts: starts, walls });
}

/** Creates one resource-node entity per resource terrain tile. */
export function spawnResourceNodes(world: EcsWorld, mapData: MapData): void {
  mapData.forEachTile(({ tx, ty }, terrain) => {
    const type = TERRAIN_RESOURCE[terrain];
    if (!type) return;
    // A fish school (M14) holds its own amount.
    createResourceNode(world, { tile: { tx, ty }, type, ...(terrain === TERRAIN.fish ? { amount: NAVAL.fishAmount, sea: true } : {}) });
  });
}

/** Town center plus three villagers for every player, on their own start tile. */
export function spawnStartingEntities(
  world: EcsWorld,
  players: PlayerManager,
  mapData: MapData,
  starts: readonly TileCoord[],
): void {
  players.all().forEach((player, i) => {
    const start = starts[i];
    if (!start) throw new RangeError(`no start tile for player ${player.id}`);
    createBuilding(world, {
      type: 'town_center',
      origin: townCenterOrigin(start),
      playerId: player.id,
      mapData,
      hpMultiplier: buildingHpMultiplier(player),
    });
    for (const tile of villagerSpawnTiles(start)) createVillager(world, { tile, playerId: player.id });
  });
}

/** The template's pre-built walls (fortress) as finished wall entities of their players. */
export function spawnPresetWalls(
  world: EcsWorld,
  players: PlayerManager,
  mapData: MapData,
  walls: readonly PresetWall[],
): void {
  const all = players.all();
  for (const wall of walls) {
    const player = all[wall.playerIndex];
    if (!player) throw new RangeError(`no player for wall slot ${wall.playerIndex}`);
    createWall(world, { tile: wall.tile, playerId: player.id, mapData, underConstruction: false, minStyleAge: wall.minStyleAge, hpMultiplier: buildingHpMultiplier(player) });
  }
}

/**
 * Everything a new match starts with, in spawn order: resource nodes,
 * starting entities, preset walls, a mission's extras and, last, what an
 * M19 mode adds, Regicide's kings or the hill: every other entity keeps its
 * id and order, and the walls already block their tiles when the kings'
 * tiles are chosen.
 */
export function spawnNewMatch(
  world: EcsWorld,
  players: PlayerManager,
  game: GeneratedGame,
  setup: Pick<GameSetupConfig, 'victory' | 'mission'>,
): void {
  const { mapData, starts, walls } = game;
  spawnResourceNodes(world, mapData);
  spawnStartingEntities(world, players, mapData, starts);
  spawnPresetWalls(world, players, mapData, walls);
  if (setup.mission) spawnMissionExtras(world, players, mapData, setup.mission);
  if (hasRegicide(setup.victory)) spawnKings(world, players, mapData, starts);
  if (hasHill(setup.victory)) spawnHill(world, game);
}

/** The hill at its site (tryGenerateGameMap has ruled out a map without one). */
function spawnHill(world: EcsWorld, game: GeneratedGame): void {
  const site = hillSiteOf(game);
  if (!site) throw new RangeError('no site for a hill on this map');
  createHill(world, game.mapData, site);
}

/** One king for every player, beside its town centre. */
function spawnKings(world: EcsWorld, players: PlayerManager, mapData: MapData, starts: readonly TileCoord[]): void {
  players.all().forEach((player, i) => {
    const start = starts[i];
    if (!start) throw new RangeError(`no start tile for player ${player.id}`);
    createUnit(world, { type: 'king', tile: kingStartTile(start, mapData), playerId: player.id });
  });
}
