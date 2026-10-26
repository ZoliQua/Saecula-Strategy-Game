import { createBuilding } from '../../ecs/archetypes/building';
import {
  createResourceNode,
  TERRAIN_RESOURCE,
} from '../../ecs/archetypes/resource';
import { createVillager } from '../../ecs/archetypes/villager';
import { createWall } from '../../ecs/archetypes/wall';
import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';
import { generateMap, type PresetWall } from '../../map/generator';
import type { MapData } from '../../map/MapData';
import { townCenterOrigin, villagerSpawnTiles } from '../../map/startLayout';
import { mapTiles, playerCount, type GameSetupConfig } from '../../game/GameSetupConfig';
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

/** Creates one resource-node entity per resource terrain tile. */
export function spawnResourceNodes(world: EcsWorld, mapData: MapData): void {
  mapData.forEachTile(({ tx, ty }, terrain) => {
    const type = TERRAIN_RESOURCE[terrain];
    if (!type) return;
    createResourceNode(world, { tile: { tx, ty }, type });
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
    createWall(world, { tile: wall.tile, playerId: player.id, mapData, underConstruction: false });
  }
}
