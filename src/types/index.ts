/** Globális játékbeli típusok. Lásd CLAUDE.md 4. szekció. */

export type AgeId = 1 | 2 | 3;

export const AGES: readonly { id: AgeId; nameKey: 'roman' | 'medieval' | 'enlightenment' }[] = [
  { id: 1, nameKey: 'roman' },
  { id: 2, nameKey: 'medieval' },
  { id: 3, nameKey: 'enlightenment' },
] as const;

/** Researchable technologies (see src/game/technologies.ts). */
export type TechId =
  | 'feudalism'
  | 'enlightenment'
  | 'blade_sharpening_1'
  | 'blade_sharpening_2'
  | 'arrow_sharpening_1'
  | 'arrow_sharpening_2'
  | 'armor_1'
  | 'armor_2'
  | 'shield_1'
  | 'shield_2'
  | 'double_saw'
  | 'two_man_saw'
  | 'steam_saw'
  | 'gold_mining_1'
  | 'gold_mining_2'
  | 'deep_mining'
  | 'crop_rotation'
  | 'heavy_plow'
  | 'mechanized_harvest'
  | 'artisan_guilds'
  | 'infantry_march'
  | 'cavalry_training';

export type CivId =
  | 'hungarian'
  | 'english'
  | 'german'
  | 'french'
  | 'spanish'
  | 'italian'
  | 'russian'
  | 'finnish';

export type ResourceType = 'food' | 'wood' | 'gold';

export interface Resources {
  food: number;
  wood: number;
  gold: number;
}

export type UnitType =
  | 'villager'
  | 'scout'
  | 'swordsman'
  | 'archer'
  | 'knight'
  | 'pikeman'
  | 'crossbowman'
  | 'musketeer'
  | 'cannon'
  | 'cavalry';

export type BuildingType =
  | 'town_center'
  | 'house'
  | 'farm'
  | 'lumber_camp'
  | 'mining_camp'
  | 'barracks'
  | 'archery_range'
  | 'stable'
  | 'blacksmith'
  | 'foundry'
  | 'tower'
  | 'wall'
  | 'wonder';

export interface Population {
  current: number;
  cap: number;
}

export type Direction =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export const DIRECTIONS: readonly Direction[] = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
] as const;

export function directionFromDelta(dx: number, dy: number): Direction {
  if (dx === 0 && dy === 0) return 'S';
  // Iso convention (CLAUDE.md 3): +tx goes E on screen, +ty goes S on screen.
  // We collapse (dx, dy) to one of 8 headings.
  const angle = Math.atan2(dy, dx);
  const octant = Math.round((angle * 4) / Math.PI + 8) % 8;
  const lookup: Direction[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  return lookup[octant] ?? 'S';
}

export type ProjectileKind = 'arrow' | 'bolt' | 'bullet' | 'cannonball';
