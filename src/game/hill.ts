import { HILL } from '../config/balance';
import type { Entity } from '../ecs/components';
import { moveLayerOf } from '../ecs/navLayer';
import type { EcsWorld } from '../ecs/world';
import { chebyshev, type TileCoord } from '../iso/coordinates';
import type { GeneratedMap } from '../map/generators/types';
import { reachMask } from '../map/gridSteps';
import { MapData } from '../map/MapData';
import { townCenterOrigin, TOWN_CENTER_SIZE, villagerSpawnTiles } from '../map/startLayout';
import { baseUnitType } from './civUnits';
import type { PlayerManager } from './PlayerManager';

/* King of the Hill (M19): where the hill is, who may hold it and who has won by it. */

const HALF = Math.floor(HILL.size / 2);

/** What the site depends on: a map as generated. */
export type HillLayout = Pick<GeneratedMap, 'map' | 'playerStarts' | 'walls'>;

/** Whether `tile` is in the zone of a hill centred on `centre`. */
export function inHillZone(centre: TileCoord, tile: TileCoord): boolean {
  return chebyshev(centre, tile) <= HALF;
}

/** The zone's tiles, row by row. */
export function* hillTiles(centre: TileCoord): Generator<TileCoord, void> {
  for (let ty = centre.ty - HALF; ty <= centre.ty + HALF; ty++) {
    for (let tx = centre.tx - HALF; tx <= centre.tx + HALF; tx++) yield { tx, ty };
  }
}

/** Nothing may be built on the zone of a hill at `centre`: set when it is created and again on a load. */
export function forbidBuildingOnHill(map: MapData, centre: TileCoord): void {
  for (const t of hillTiles(centre)) map.forbidBuilding(t.tx, t.ty);
}

/**
 * The hill's centre on a generated map as the game will spawn it (town
 * centres and preset walls block): of the zones lying wholly on the map
 * with at least HILL.minPassable passable tiles that every start can walk
 * to, the one nearest the map centre (straight-line; ties by ty, then tx).
 * Null when there is none. No RNG; the map is not changed.
 */
export function findHillSite(generated: HillLayout): TileCoord | null {
  const { map, playerStarts, walls } = generated;
  const { width, height } = map;
  const homes = playerStarts.map((start) => villagerSpawnTiles(start)[1]!);
  const first = homes[0];
  if (!first) return null;
  const spawned = MapData.fromRaw(width, height, map.getRawTiles(), map.getRawBlocked());
  for (const start of playerStarts) {
    const o = townCenterOrigin(start);
    for (let dy = 0; dy < TOWN_CENTER_SIZE; dy++) {
      for (let dx = 0; dx < TOWN_CENTER_SIZE; dx++) spawned.setBlocked(o.tx + dx, o.ty + dy, true);
    }
  }
  for (const wall of walls) spawned.setBlocked(wall.tile.tx, wall.tile.ty, true);
  // A walk works both ways: when the first start reaches the others, all of them reach what it reaches.
  const reached = reachMask(spawned, first);
  if (!homes.every((home) => reached[home.ty * width + home.tx] === 1)) return null;

  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  let best: TileCoord | null = null;
  let bestD = Infinity;
  for (let ty = HALF; ty < height - HALF; ty++) {
    for (let tx = HALF; tx < width - HALF; tx++) {
      const d = (tx - midX) ** 2 + (ty - midY) ** 2;
      if (d >= bestD) continue;
      let open = 0;
      for (const t of hillTiles({ tx, ty })) open += reached[t.ty * width + t.tx]!;
      if (open < HILL.minPassable) continue;
      best = { tx, ty };
      bestD = d;
    }
  }
  return best;
}

/**
 * Whether `unit` occupies a hill it stands on: a living land unit with an
 * attacker, not a villager (kings, monks, traders and ships never do), of
 * a player still in the match (Gaia is none). Cargo is out of the world.
 */
export function hillOccupant(unit: Entity, players: Pick<PlayerManager, 'get'>): boolean {
  if (!unit.unit || !unit.position || !unit.owner || !unit.attacker || unit.dying) return false;
  if (moveLayerOf(unit) !== 'land' || baseUnitType(unit.unit.unitType) === 'villager') return false;
  return players.get(unit.owner.playerId)?.defeated === false;
}

/** The hill as everybody may know it (its place and clocks are public). */
export interface HillState extends Readonly<NonNullable<Entity['hill']>> {
  readonly centre: TileCoord;
}

/** The match's hill, or null outside King of the Hill. */
export function hillState(world: EcsWorld): HillState | null {
  for (const e of world.with('hill', 'position')) return { centre: e.position, ...e.hill };
  return null;
}

/** The lowest-id standing player of a team whose clock is full, or null. */
export function hillWinner(heldMs: HillState['heldMs'], players: Pick<PlayerManager, 'all' | 'teamOf'>): number | null {
  const winner = players.all().find((p) => !p.defeated && (heldMs[players.teamOf(p.id)] ?? 0) >= HILL.holdMs);
  return winner?.id ?? null;
}
