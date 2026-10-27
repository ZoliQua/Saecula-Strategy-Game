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

/**
 * Per fog-canvas pixel ((width + 2·pad)·res square px; pixel (0, 0) is
 * at tile (−pad − 0.5, −pad − 0.5)): the tile index (ty · width + tx)
 * whose fog applies there, or −1 outside the map. `rockAt(u, v)` names
 * the cliff tile whose raised rock shows at the screen point of ground
 * (u, v), or −1; there the rock's tile wins, so fog follows the cliff
 * silhouette instead of the flat ground diamonds under it.
 */
export function fogOwners(
  width: number,
  height: number,
  res: number,
  pad: number,
  rockAt: (u: number, v: number) => number,
): Int32Array {
  const cw = (width + pad * 2) * res;
  const ch = (height + pad * 2) * res;
  const out = new Int32Array(cw * ch).fill(-1);
  for (let py = 0; py < ch; py++) {
    const v = (py + 0.5) / res - pad - 0.5;
    for (let px = 0; px < cw; px++) {
      const u = (px + 0.5) / res - pad - 0.5;
      const rock = rockAt(u, v);
      if (rock >= 0) {
        out[py * cw + px] = rock;
        continue;
      }
      const tx = Math.floor(u + 0.5);
      const ty = Math.floor(v + 0.5);
      if (tx >= 0 && ty >= 0 && tx < width && ty < height) out[py * cw + px] = ty * width + tx;
    }
  }
  return out;
}
