import { AVAILABLE_CIVS } from '../config/civs';
import { MENU_PHASE } from '../config/visual';
import { PLAYER_COLORS } from '../game/Player';
import { artAgeFor } from '../iso/art/architecture/ageStyle';
import { paintBuilding } from '../iso/art/buildings';
import type { LitArt } from '../iso/art/lighting/normalLayer';
import { shadePixels } from '../iso/art/lighting/shadeCanvas';
import { sunAt } from '../iso/art/lighting/sun';
import { trimLitArt } from '../iso/art/trimArt';
import type { CivId } from '../types';

/**
 * A civ's setup-card picture: its age-1 town centre, lit, plus a separate
 * window-glow layer that the card flickers (PNG data URLs). Empty strings
 * mean the paint failed (the card shows a static placeholder).
 */
export interface CivPreview {
  readonly art: string;
  readonly glow: string;
}

/** Preview width in canvas px (shown at about half that, so it stays crisp on HiDPI). */
const PREVIEW_W = 248;
/** Late afternoon: warm low sun with the windows just lit (see SKY_KEYS). */
const PREVIEW_PHASE = MENU_PHASE + 0.1;
/** Window glow sprite diameter relative to the window size (as WindowGlows). */
const GLOW_SPREAD = 2.6;
const FAILED: CivPreview = { art: '', glow: '' };

const previews = new Map<CivId, CivPreview>();
/** A civ whose town centre is painted, waiting for its picture (the next call). */
let pending: { readonly civ: CivId; readonly art: LitArt } | null = null;

/** The painted preview of a civ, if it is ready. */
export function civPreview(civ: CivId): CivPreview | undefined {
  return previews.get(civ);
}

/**
 * Does the next step of the next missing preview of a playable civ and
 * returns that civ, or null once all are ready. Two calls per civ, so
 * callers that call once a frame spread the work: the first paints the
 * town centre (in player 1's colour, with its normal map), the second
 * trims, lights and encodes it. Only the data URLs are kept (M4 review
 * M6), and no texture is created: the menu and setup animations keep
 * running while the eight previews paint (M5 Task 15 frame trace).
 */
export function paintNextCivPreview(): CivId | null {
  if (pending) {
    const { civ, art } = pending;
    pending = null;
    previews.set(civ, guarded(civ, () => paintPreview(trimLitArt(art).art)));
    return civ;
  }
  const civ = AVAILABLE_CIVS.find((c) => !previews.has(c));
  if (!civ) return null;
  try {
    // A half-written civ painter throws here; the card then shows its placeholder.
    pending = { civ, art: paintBuilding('town_center', PLAYER_COLORS[0] ?? 0xffffff, artAgeFor('town_center', 1), civ) };
  } catch (err) {
    console.warn(`civ preview failed (${civ})`, err);
    // A failed paint still counts as done, so it is not retried every frame.
    previews.set(civ, FAILED);
  }
  return civ;
}

/** Runs one preview step; a throw is logged once and gives the placeholder (never thrown out). */
function guarded(civ: CivId, step: () => CivPreview | null): CivPreview {
  try {
    return step() ?? FAILED;
  } catch (err) {
    console.warn(`civ preview failed (${civ})`, err);
    return FAILED;
  }
}

function paintPreview(art: LitArt): CivPreview | null {
  const src = art.canvas;
  if (src.width === 0 || src.height === 0) return null;
  const scale = PREVIEW_W / src.width;
  const w = PREVIEW_W;
  const h = Math.max(1, Math.round(src.height * scale));
  const albedo = drawScaled(src, w, h);
  const normals = art.normal ? drawScaled(art.normal, w, h) : null;
  if (!albedo) return null;
  const sun = sunAt(PREVIEW_PHASE);
  const lit = albedo.ctx.getImageData(0, 0, w, h);
  const shaded = shadePixels(lit.data, normals ? normals.ctx.getImageData(0, 0, w, h).data : new Uint8ClampedArray(lit.data.length), sun);
  lit.data.set(shaded);
  albedo.ctx.putImageData(lit, 0, 0);

  const glow = document.createElement('canvas');
  glow.width = w;
  glow.height = h;
  const g = glow.getContext('2d');
  if (g) {
    g.globalCompositeOperation = 'lighter';
    for (const p of art.glows) {
      const x = p.x * scale;
      const y = p.y * scale;
      const r = Math.max(2, (p.r * GLOW_SPREAD * scale) / 2);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,214,140,0.95)');
      grad.addColorStop(0.3, 'rgba(255,170,80,0.5)');
      grad.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  return { art: albedo.canvas.toDataURL('image/png'), glow: glow.toDataURL('image/png') };
}

function drawScaled(src: CanvasImageSource, w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return { canvas, ctx };
}
