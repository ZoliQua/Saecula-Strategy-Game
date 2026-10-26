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

/** One age style's paintings, by building type. */
export type AgeArtSet = Partial<Record<BuildingType, BuildingArt>>;
