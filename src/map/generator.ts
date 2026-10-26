import { generateFortress } from './generators/fortress';
import { generateIslands } from './generators/islands';
import { generateMeadow } from './generators/meadow';
import { generateRandom } from './generators/random';
import type { GeneratedMap, TemplateOptions } from './generators/types';
import { generateWilderness } from './generators/wilderness';
import { validateMap, type MapValidation } from './validation';

/** Spec templates (PROGRAM_TERV.md §11). */
export const MAP_TEMPLATES = ['meadow', 'wilderness', 'islands', 'fortress', 'random'] as const;
export type MapTemplate = (typeof MAP_TEMPLATES)[number];

export interface GenerateMapOptions extends TemplateOptions {
  readonly template: MapTemplate;
}

/** Validation failures retried with a new derived seed before giving up (§11.6). */
export const MAP_RETRIES = 5;

export class MapGenerationError extends Error {
  constructor(
    readonly options: GenerateMapOptions,
    readonly problems: readonly string[],
  ) {
    super(
      `No valid ${options.template} map for seed ${options.seed} after ${MAP_RETRIES} retries: ${problems.join('; ')}`,
    );
    this.name = 'MapGenerationError';
  }
}

/** The raw template generators (no validation); generateMap is the entry point. */
export const TEMPLATE_GENERATORS: Readonly<Record<MapTemplate, (options: TemplateOptions) => GeneratedMap>> = {
  meadow: generateMeadow,
  wilderness: generateWilderness,
  islands: generateIslands,
  fortress: generateFortress,
  random: generateRandom,
};

/** The seed of retry `attempt` (0 is the player's seed itself); deterministic, so a seed always yields the same map. */
export function retrySeed(seed: number, attempt: number): number {
  if (attempt === 0) return seed;
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(attempt, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x27d4eb2f);
  return ((h ^ (h >>> 15)) >>> 0) % 2_147_483_647;
}

/**
 * Generates the template's map and validates it (§11.6): every start
 * reaches every other one and has its start economy. A failing map is
 * regenerated from a derived seed up to MAP_RETRIES times, then a
 * MapGenerationError is thrown.
 */
export function generateMap(
  options: GenerateMapOptions,
  generate: (options: TemplateOptions) => GeneratedMap = TEMPLATE_GENERATORS[options.template],
  validate: (map: GeneratedMap) => MapValidation = validateMap,
): GeneratedMap {
  let problems: readonly string[] = [];
  for (let attempt = 0; attempt <= MAP_RETRIES; attempt++) {
    const generated = generate({ ...options, seed: retrySeed(options.seed, attempt) });
    const result = validate(generated);
    if (result.ok) return generated;
    problems = result.problems;
  }
  throw new MapGenerationError(options, problems);
}

export type { GeneratedMap, PresetWall, TemplateOptions } from './generators/types';
