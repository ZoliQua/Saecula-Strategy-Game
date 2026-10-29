import type { TileCoord } from '../iso/coordinates';
import type { SaveData } from './schema';

/*
 * The range checks on a save's tile coordinates that zod cannot make
 * (they depend on the map size): a schema-valid save with a unit, a
 * building or an AI goal off the map would load and then throw inside a
 * game step (final review Minor 1).
 */

interface Size {
  readonly width: number;
  readonly height: number;
}

const isTile = (v: object): v is TileCoord => 'tx' in v && 'ty' in v && Object.keys(v).length === 2;

/** Whether a tile (integer centres, fractional while moving) lies on the map's tile centres' span. */
function onMap(t: TileCoord, size: Size): boolean {
  return t.tx >= 0 && t.ty >= 0 && t.tx <= size.width - 1 && t.ty <= size.height - 1;
}

/** Whether `value` and every tile and footprint nested in it lies on the map. */
function allOnMap(value: unknown, size: Size): boolean {
  if (typeof value !== 'object' || value === null) return true;
  if (Array.isArray(value)) return value.every((v) => allOnMap(v, size));
  if (isTile(value)) return onMap(value, size);
  // An AI's remembered building holds both; an entity keeps the footprint in its `building`.
  const { position, footprint, building } = value as { position?: TileCoord; footprint?: Size; building?: { footprint: Size } };
  if (position && !footprintOnMap(position, footprint ?? building?.footprint, size)) return false;
  return Object.values(value).every((v) => allOnMap(v, size));
}

/** Whether the far corner of a footprint anchored at `position` (its top tile) is on the map. */
function footprintOnMap(position: TileCoord, footprint: Size | undefined, size: Size): boolean {
  if (!footprint) return true;
  return onMap({ tx: position.tx + footprint.width - 1, ty: position.ty + footprint.height - 1 }, size);
}

/**
 * Whether every tile a save holds is on its map: each entity's position,
 * move target and path, a building's whole footprint, and every tile in
 * the AI state (remembered buildings with their footprints, goals,
 * threats). The camera is not checked: it is view state, Phaser clamps it
 * on load, and a view wider than twice the camera bounds legitimately
 * keeps its centre outside them.
 */
export function positionsOnMap(save: SaveData): boolean {
  const size = save.map;
  return save.entities.every((e) => allOnMap(e.components, size)) && Object.values(save.ai).every((state) => allOnMap(state, size));
}
