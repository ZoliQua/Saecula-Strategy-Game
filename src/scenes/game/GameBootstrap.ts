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
import { mapTiles, playerCount, type GameSetupConfig } from '../../game/GameSetupConfig';
import type { PlayerManager } from '../../game/PlayerManager';

export interface GeneratedGame {
  mapData: MapData;
  /** Start tile per player, in player id order (index 0 is the human). */
  starts: readonly TileCoord[];
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
  return { mapData: generated.map, starts: generated.playerStarts };
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
  });
}
