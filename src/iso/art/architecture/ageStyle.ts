import type { AgeId, BuildingType } from '../../../types';

/**
 * Building types painted in three age styles (Roman, Medieval,
 * Enlightenment). The foundry and the wonder exist only in the last age
 * and keep one look (their age-1 key). In the world, walls show
 * per-piece textures (buildingTextures.ts wallTexture); their age-styled
 * building key (artKeys.ts ageArtKey) is the menu / placement icon.
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
