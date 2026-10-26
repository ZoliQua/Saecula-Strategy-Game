import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../MapData';

/** Inputs every template generator takes. */
export interface TemplateOptions {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly playerCount: number;
}

/** A finished stone wall segment the map starts with (fortress), owned by player slot `playerIndex`. */
export interface PresetWall {
  readonly tile: TileCoord;
  /** Index into `playerStarts` (0 is the human). */
  readonly playerIndex: number;
}

export interface GeneratedMap {
  readonly map: MapData;
  readonly playerStarts: readonly TileCoord[];
  /** Walls spawned as real wall entities (empty on most templates). */
  readonly walls: readonly PresetWall[];
}

export const MAX_PLAYER_SLOTS = 6;

export function assertPlayerCount(playerCount: number): void {
  if (playerCount < 1 || playerCount > MAX_PLAYER_SLOTS) {
    throw new RangeError(`playerCount must be 1..${MAX_PLAYER_SLOTS}, got ${playerCount}`);
  }
}
