import type { BuildingType } from '../../../types';

/** A persistent point light anchored to a building. */
export interface AnchoredLight {
  /** Ground point offset from the building's front corner, world px. */
  readonly dx: number;
  readonly dy: number;
  readonly color: number;
  readonly radius: number;
  readonly intensity: number;
  /** 0 = steady, ~0.25 = torch flicker. */
  readonly flicker: number;
}

export type LightPreset = Omit<AnchoredLight, 'dx' | 'dy'>;

const TORCH = 0xffa24a;
const FORGE = 0xff7a2a;

export const TORCH_LIGHT: LightPreset = { color: TORCH, radius: 105, intensity: 0.72, flicker: 0.25 };
export const FORGE_LIGHT: LightPreset = { color: FORGE, radius: 100, intensity: 0.9, flicker: 0.35 };
/** Glazed oil lantern: whiter, steadier than a torch. */
export const LANTERN_LIGHT: LightPreset = { color: 0xffc77a, radius: 115, intensity: 0.7, flicker: 0.06 };

/**
 * Hand-placed lights for buildings whose art does not record its own
 * (front-corner relative ground points). Age-styled buildings record
 * torches / forges / lanterns while painting (IsoPainter.addLight), so
 * the lights follow each age's geometry; see architecture/parts.ts.
 */
export const BUILDING_LIGHTS: Partial<Record<BuildingType, readonly AnchoredLight[]>> = {
  tower: [{ dx: -6, dy: -6, color: TORCH, radius: 90, intensity: 0.7, flicker: 0.3 }],
};
