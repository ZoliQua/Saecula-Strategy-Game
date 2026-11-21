/**
 * The game-time delta of one frame (M16): real frame time scaled by the
 * match's chosen speed and the dev-only time scale. Camera, audio and
 * cosmetic animation stay on real time and never use this.
 */
export function gameDelta(realDelta: number, speed: number, devScale: number): number {
  return realDelta * speed * devScale;
}
