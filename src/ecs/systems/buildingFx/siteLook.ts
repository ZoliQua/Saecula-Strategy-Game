import { BUILDING_BOTTOM_PAD } from '../../../iso/art/canvas';

/**
 * How a building under construction is drawn (RenderSystem), shared
 * with the collapse of a destroyed site (Collapses) so the site comes
 * down from the height it had risen to. `t` = construction progress 0..1.
 */

/** Texture rows shown, from the bottom of a `frameHeight` sprite, as the building rises out of its site. */
export function siteShownHeight(frameHeight: number, t: number): number {
  return Math.max(BUILDING_BOTTOM_PAD + 4, frameHeight * (0.08 + 0.92 * t));
}

/** Opacity of the rising building. */
export function siteAlpha(t: number): number {
  return 0.75 + 0.25 * t;
}

/** Opacity of the scaffolded site plate under it. */
export function sitePlateAlpha(t: number): number {
  return 1 - t * 0.6;
}
