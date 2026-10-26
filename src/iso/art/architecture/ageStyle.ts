import type { AgeId, BuildingType } from '../../../types';

/**
 * Building types painted in three age styles (Roman, Medieval,
 * Enlightenment). The foundry and the wonder exist only in the last age
 * and keep one look (their age-1 key). In the world, walls show
 * per-piece textures (textures.ts wallTexture); their age keys here are
 * the menu / placement icon.
 */
export const AGE_STYLED_BUILDINGS: readonly BuildingType[] = [
  'town_center',
  'house',
  'farm',
  'lumber_camp',
  'mining_camp',
  'barracks',
  'archery_range',
  'stable',
  'blacksmith',
  'tower',
  'wall',
];

/** The art age a building of `type` shows when its owner is in `age`. */
export function artAgeFor(type: BuildingType, age: AgeId): AgeId {
  return AGE_STYLED_BUILDINGS.includes(type) ? age : 1;
}

/** Texture key of a building's art in an age style (age 1 = the base key). */
export function ageArtKey(baseKey: string, type: BuildingType, age: AgeId): string {
  const a = artAgeFor(type, age);
  return a === 1 ? baseKey : `${baseKey}~a${a}`;
}

/** Texture key of a team-colour variant (player 1 uses the painted base). */
export function teamArtKey(key: string, playerId: number): string {
  return playerId <= 1 ? key : `${key}@p${playerId}`;
}
