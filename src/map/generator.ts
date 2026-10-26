import { generateMeadow, type MeadowOptions, type GeneratedMap } from './generators/meadow';

/** Spec templates (PROGRAM_TERV.md §11); only meadow is generated so far. */
export const MAP_TEMPLATES = ['meadow', 'wilderness', 'islands', 'fortress', 'random'] as const;
export type MapTemplate = (typeof MAP_TEMPLATES)[number];

export interface GenerateMapOptions {
  readonly template: MapTemplate;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly playerCount: number;
}

export function generateMap(options: GenerateMapOptions): GeneratedMap {
  switch (options.template) {
    case 'meadow':
      return generateMeadow(options satisfies MeadowOptions);
    case 'wilderness':
    case 'islands':
    case 'fortress':
    case 'random':
      // Not implemented yet: the setup screen keeps these disabled.
      return generateMeadow(options satisfies MeadowOptions);
  }
}

export type { GeneratedMap, MeadowOptions };
