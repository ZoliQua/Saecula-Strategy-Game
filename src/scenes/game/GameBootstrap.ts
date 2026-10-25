import { DEFAULT_MAP_SIZE } from '../../config/constants';
import { createBuilding } from '../../ecs/archetypes/building';
import {
  createResourceNode,
  TERRAIN_RESOURCE,
} from '../../ecs/archetypes/resource';
import { createVillager } from '../../ecs/archetypes/villager';
import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';
import { generateMap } from '../../map/generator';
import type { MapData } from '../../map/MapData';
import type { PlayerManager } from '../../game/PlayerManager';

export interface GeneratedGame {
  mapData: MapData;
  playerStart: TileCoord;
  aiStart: TileCoord;
}

/** Generates the skirmish map and picks the human / AI start tiles. */
export function generateGameMap(players: PlayerManager): GeneratedGame {
  const generated = generateMap({
    template: 'meadow',
    width: DEFAULT_MAP_SIZE,
    height: DEFAULT_MAP_SIZE,
    seed: 42,
    playerCount: players.all().length,
  });
  return {
    mapData: generated.map,
    playerStart: generated.playerStarts[0] ?? { tx: 10, ty: 10 },
    aiStart: generated.playerStarts[1] ?? { tx: 50, ty: 50 },
  };
}

/** Creates one resource-node entity per resource terrain tile. */
export function spawnResourceNodes(world: EcsWorld, mapData: MapData): void {
  mapData.forEachTile(({ tx, ty }, terrain) => {
    const type = TERRAIN_RESOURCE[terrain];
    if (!type) return;
    createResourceNode(world, { tile: { tx, ty }, type });
  });
}

/** Town center plus three villagers for every player. */
export function spawnStartingEntities(
  world: EcsWorld,
  players: PlayerManager,
  mapData: MapData,
  playerStart: TileCoord,
  aiStart: TileCoord,
): void {
  for (const player of players.all()) {
    const start = player.isHuman ? playerStart : aiStart;
    const tcOrigin = { tx: start.tx - 1, ty: start.ty - 1 };
    createBuilding(world, {
      type: 'town_center',
      origin: tcOrigin,
      playerId: player.id,
      mapData,
    });
    for (const dx of [-1, 0, 1]) {
      createVillager(world, {
        tile: { tx: start.tx + dx, ty: start.ty + 3 },
        playerId: player.id,
      });
    }
  }
}
