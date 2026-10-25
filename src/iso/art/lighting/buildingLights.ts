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

const TORCH = 0xffa24a;
const FORGE = 0xff7a2a;

/**
 * Torches and fires per building type (front-corner relative ground
 * points). Later art tasks add their own entries here.
 */
export const BUILDING_LIGHTS: Partial<Record<BuildingType, readonly AnchoredLight[]>> = {
  town_center: [
    { dx: -58, dy: -27, color: TORCH, radius: 110, intensity: 0.75, flicker: 0.25 },
    { dx: -26, dy: -12, color: TORCH, radius: 110, intensity: 0.75, flicker: 0.25 },
  ],
  tower: [{ dx: -6, dy: -6, color: TORCH, radius: 90, intensity: 0.7, flicker: 0.3 }],
  blacksmith: [{ dx: -15, dy: -22, color: FORGE, radius: 100, intensity: 0.9, flicker: 0.35 }],
  foundry: [{ dx: -15, dy: -22, color: FORGE, radius: 120, intensity: 1, flicker: 0.35 }],
  barracks: [
    { dx: 36, dy: -38, color: TORCH, radius: 95, intensity: 0.65, flicker: 0.25 },
    { dx: 58, dy: -26, color: TORCH, radius: 95, intensity: 0.65, flicker: 0.25 },
  ],
};
