import { hu } from '../i18n/hu';
import type { BuildingType, CivId } from '../types';

/** A building's name as `civ` builds it: the landmark (M17) takes its nation's name, the rest the shared one. */
export function buildingName(type: BuildingType, civ: CivId): string {
  return type === 'landmark' ? hu.landmarks[civ].name : hu.buildings[type];
}

/** A building's one-line role for `civ`: the landmark (M17) states its nation's effect. */
export function buildingRole(type: BuildingType, civ: CivId): string {
  return type === 'landmark' ? hu.landmarks[civ].role : hu.buildingRoles[type];
}
