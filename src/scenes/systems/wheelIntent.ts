import { TRACKPAD_DELTA_MAX, WHEEL_ZOOM_RATE, WHEEL_ZOOM_STEP } from '../../config/constants';
import type { ScrollMode } from '../../ui/settings';

export type WheelIntent = 'zoom' | 'pan';
export type WheelLike = Pick<WheelEvent, 'deltaX' | 'deltaY' | 'deltaMode' | 'ctrlKey'>;

/** Pixels per wheel line / page (Firefox reports a mouse wheel in lines). */
const LINE_PX = 16;
const PAGE_PX = 800;

/**
 * What a wheel event means. A `ctrlKey` wheel is a trackpad pinch (the
 * browsers send pinch that way), so it always zooms. The 'zoom' and 'pan'
 * modes force the rest. 'auto' reads a trackpad from a pixel-mode delta
 * with a sideways component, a fractional value or a small step, and pans
 * for it; a mouse wheel (±100 px notches on Windows, line mode in Firefox)
 * zooms. Known ambiguity: a Mac mouse wheel sends small integer pixel
 * deltas (e.g. 4) with no deltaX, which reads as a trackpad, so it pans
 * in 'auto'; such a player picks 'zoom'.
 */
export function wheelIntent(e: WheelLike, mode: ScrollMode): WheelIntent {
  if (e.ctrlKey) return 'zoom';
  if (mode !== 'auto') return mode;
  const trackpad =
    e.deltaMode === 0 && (e.deltaX !== 0 || !Number.isInteger(e.deltaY) || Math.abs(e.deltaY) < TRACKPAD_DELTA_MAX);
  return trackpad ? 'pan' : 'zoom';
}

const toPixels = (d: number, mode: number): number => (mode === 1 ? d * LINE_PX : mode === 2 ? d * PAGE_PX : d);

/** The zoom multiplier of a zooming wheel event: exp(-deltaY * rate), at most one wheel notch either way. */
export function wheelZoomFactor(e: WheelLike): number {
  const f = Math.exp(-toPixels(e.deltaY, e.deltaMode) * WHEEL_ZOOM_RATE);
  return Math.min(WHEEL_ZOOM_STEP, Math.max(1 / WHEEL_ZOOM_STEP, f));
}

/** The camera scroll of a panning wheel event, in world pixels: the delta over the zoom. */
export function wheelPan(e: WheelLike, zoom: number): { dx: number; dy: number } {
  return { dx: toPixels(e.deltaX, e.deltaMode) / zoom, dy: toPixels(e.deltaY, e.deltaMode) / zoom };
}
