import type Phaser from 'phaser';
import { AVAILABLE_CIVS } from '../config/civs';
import { MENU_PHASE } from '../config/visual';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { ageArtKey, teamArtKey } from '../iso/art/artKeys';
import { shadePixels } from '../iso/art/lighting/shadeCanvas';
import { sunAt } from '../iso/art/lighting/sun';
import { BUILDING_LIGHT, buildingTexture, releaseBuildingTexture } from '../iso/buildingTextures';
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

const previews = new Map<CivId, CivPreview>();

/** The painted preview of a civ, if it is ready. */
export function civPreview(civ: CivId): CivPreview | undefined {
  return previews.get(civ);
}

/**
 * Paints the next missing preview of a playable civ and returns that
 * civ, or null once all are ready. One per call: callers spread the
 * work over frames so the menu and setup animations keep running.
 * Only the data URLs are kept (M4 review M6): the town-centre texture
 * painted for the picture is freed again, unless it existed before the
 * call (the menu diorama or a match shows it).
 */
export function paintNextCivPreview(textures: Phaser.Textures.TextureManager): CivId | null {
  const civ = AVAILABLE_CIVS.find((c) => !previews.has(c));
  if (!civ) return null;
  const ageKey = ageArtKey(BUILDING_SPECS.town_center.textureKey, 'town_center', 1, civ);
  // Player 1's variant of the base, should player 1 not be this civ's base owner (in a match).
  const variantKey = teamArtKey(ageKey, 1, 0);
  const had = { base: textures.exists(ageKey), variant: textures.exists(variantKey) };
  const key = buildingTexture({ textures }, 'town_center', 1, 1, civ);
  let preview: CivPreview | null = null;
  try {
    preview = paintPreview(textures, ageKey);
  } catch (err) {
    // A broken paint must not throw every frame: the card shows its placeholder instead.
    console.warn(`civ preview failed (${civ})`, err);
  } finally {
    // A team variant (player 1 is not this civ's base owner) goes before its base.
    if (key !== ageKey && !had.variant) releaseBuildingTexture({ textures }, key);
    if (!had.base) releaseBuildingTexture({ textures }, ageKey);
  }
  // A failed paint (no canvas) still counts as done, so it is not retried every frame.
  previews.set(civ, preview ?? { art: '', glow: '' });
  return civ;
}

function paintPreview(textures: Phaser.Textures.TextureManager, key: string): CivPreview | null {
  if (!textures.exists(key)) return null;
  const tex = textures.get(key);
  const src = tex.getSourceImage() as HTMLCanvasElement;
  const scale = PREVIEW_W / src.width;
  const w = PREVIEW_W;
  const h = Math.max(1, Math.round(src.height * scale));
  const albedo = drawScaled(src, w, h);
  const normalSrc = tex.dataSource[0]?.image as HTMLCanvasElement | undefined;
  const normals = normalSrc ? drawScaled(normalSrc, w, h) : null;
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
    for (const p of BUILDING_LIGHT.get(key)?.glows ?? []) {
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
