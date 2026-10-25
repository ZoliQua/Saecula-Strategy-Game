import { FOG_EXPLORED, FOG_VISIBLE } from './FogOfWarData';

/** Opacity of explored-but-not-visible land. */
export const EXPLORED_ALPHA = 0.52;
/** Alpha change per millisecond while fading. */
const FADE_PER_MS = 1 / 450;

/** Target fog opacity for a fog state. */
export function fogAlphaTarget(state: number): number {
  if (state === FOG_VISIBLE) return 0;
  if (state === FOG_EXPLORED) return EXPLORED_ALPHA;
  return 1;
}

/**
 * Moves every alpha in `current` towards `target` by a time-scaled
 * step. Returns true while any cell is still moving.
 */
export function stepFogAlpha(current: Float32Array, target: Float32Array, deltaMs: number): boolean {
  const step = deltaMs * FADE_PER_MS;
  let moving = false;
  for (let i = 0; i < current.length; i++) {
    const c = current[i]!;
    const t = target[i]!;
    if (c === t) continue;
    const d = t - c;
    current[i] = Math.abs(d) <= step ? t : c + Math.sign(d) * step;
    moving = true;
  }
  return moving;
}
