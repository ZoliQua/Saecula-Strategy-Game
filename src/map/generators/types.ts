import type { TileCoord } from '../../iso/coordinates';
import type { AgeId } from '../../types';
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
  /** The wall shows at least this age's style (fortress: medieval stone from the start, §11.4 "kőfal"). */
  readonly minStyleAge: AgeId;
}

export interface GeneratedMap {
  readonly map: MapData;
  readonly playerStarts: readonly TileCoord[];
  /** Walls spawned as real wall entities (empty on most templates). */
  readonly walls: readonly PresetWall[];
  /**
   * Each start's outer gold lode as placed (placeOuterGoldLodes), by start
   * index; empty when no site fitted. Validation counts only these tiles,
   * so centre-prize or random gold never stands in for a missing lode.
   */
  readonly outerLodes: readonly (readonly TileCoord[])[];
}

export const MAX_PLAYER_SLOTS = 6;

export function assertPlayerCount(playerCount: number): void {
  if (playerCount < 1 || playerCount > MAX_PLAYER_SLOTS) {
    throw new RangeError(`playerCount must be 1..${MAX_PLAYER_SLOTS}, got ${playerCount}`);
  }
}
