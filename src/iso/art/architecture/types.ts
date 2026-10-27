import type { BuildingType } from '../../../types';
import type { IsoPainter } from '../isoPainter';

/** Paints one building into the painter in a team colour. */
export type BuildingPainter = (p: IsoPainter, team: number) => void;

export interface BuildingArt {
  /** Footprint edge in tiles. */
  readonly size: number;
  /** Tallest painted point above the ground (art px) — sizes the canvas. */
  readonly maxHeight: number;
  readonly paint: BuildingPainter;
}

/** The Wonder also paints its construction stages (1…WONDER_STAGES, no team colour). */
export interface WonderArt extends BuildingArt {
  readonly paintStage: (p: IsoPainter, stage: number) => void;
}

/** One age style's paintings, by building type. */
export type AgeArtSet = Partial<Record<Exclude<BuildingType, 'wonder'>, BuildingArt>> & { readonly wonder?: WonderArt };
