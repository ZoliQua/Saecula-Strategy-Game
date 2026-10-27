import type Phaser from 'phaser';
import { LightManager } from '../../../iso/art/lighting/LightManager';
import { shadowVector } from '../../../iso/art/lighting/sun';
import type { FogOfWarData } from '../../../map/FogOfWarData';

export { GROUND_FX_DEPTH, SHOT_SHADOW_DEPTH, STANDING_FX_DEPTH } from './fxDepths';

/** Effects only show on tiles the viewer can currently see (no fog → always). */
export function tileSeen(fog: FogOfWarData | null, x: number, y: number): boolean {
  return !fog || fog.isVisible(Math.round(x), Math.round(y));
}

/** Sun shadow offset per px of height; straight down and full strength when lighting is off. */
export function sunShadow(scene: Phaser.Scene): { x: number; y: number; strength: number } {
  const lights = LightManager.of(scene);
  if (!lights?.active) return { x: 0, y: 0.15, strength: 1 };
  return shadowVector(lights.sun);
}
