import { isNavalType, UNIT_PROJECTILE } from '../config/balance';
import type { MapData } from '../map/MapData';
import { gridOf, type MoveLayer, type NavGrid } from '../map/navGrid';
import type { UnitType } from '../types';
import type { Entity } from './components';

/** The layer a unit type moves on (M14): ships on water, everything else on land. */
export function moveLayerOfType(type: UnitType): MoveLayer {
  return isNavalType(type) ? 'water' : 'land';
}

/** The layer an entity moves on: a ship on water, anything else on land. */
export function moveLayerOf(e: Entity): MoveLayer {
  return e.unit ? moveLayerOfType(e.unit.unitType) : 'land';
}

/** The grid an entity's path searches and steps use. */
export function navGridFor(map: MapData, e: Entity): NavGrid {
  return gridOf(map, moveLayerOf(e));
}

/**
 * Whether `attacker` can hurt `target` (M14): a ship is out of reach of
 * melee units (no one wades out to it); ranged units, towers and other
 * ships can shoot it. Everything else as before.
 */
export function canAttackTarget(attacker: Entity, target: Entity): boolean {
  if (moveLayerOf(target) !== 'water') return true;
  if (attacker.building) return true;
  return !!attacker.unit && UNIT_PROJECTILE[attacker.unit.unitType] !== undefined;
}
