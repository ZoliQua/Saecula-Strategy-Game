import type Phaser from 'phaser';
import { PLAYER_COLORS } from '../game/Player';
import { paintPortrait } from '../iso/art/units/sheet';
import { buildingTexture } from '../iso/buildingTextures';
import type { AgeId, BuildingType, CivId, UnitType } from '../types';

const cache = new Map<string, string>();

/**
 * Renders a texture (or one frame of it) to a PNG data URL cropped to
 * its opaque pixels, for use as an <img> in the DOM UI.
 */
export function thumbnail(textures: Phaser.Textures.TextureManager, key: string, frame?: number): string {
  const id = `${key}#${frame ?? ''}`;
  const hit = cache.get(id);
  if (hit) return hit;
  if (!textures.exists(key)) return '';
  const f = textures.getFrame(key, frame);
  const src = f.source.image as CanvasImageSource;
  const canvas = document.createElement('canvas');
  canvas.width = f.cutWidth;
  canvas.height = f.cutHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(src, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
  const url = cropToContent(canvas, ctx).toDataURL('image/png');
  cache.set(id, url);
  return url;
}

/** HUD picture of a building in a civ's age style (painted on first need), in the human player's colour. */
export function buildingThumbnail(textures: Phaser.Textures.TextureManager, type: BuildingType, age: AgeId, civ: CivId): string {
  return thumbnail(textures, buildingTexture({ textures }, type, age, 1, civ));
}

/** HUD portrait of a unit type (front idle pose, in the human player's colour). */
export function unitThumbnail(type: UnitType): string {
  const id = `unit:${type}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = paintPortrait(type, PLAYER_COLORS[0] ?? 0xffffff);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const url = cropToContent(canvas, ctx).toDataURL('image/png');
  cache.set(id, url);
  return url;
}

function cropToContent(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Ignore the faint drop shadow so the subject fills the frame.
      if ((data[(y * width + x) * 4 + 3] ?? 0) < 120) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) return canvas;
  const pad = 2;
  const w = x1 - x0 + 1 + pad * 2;
  const h = y1 - y0 + 1 + pad * 2;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')?.drawImage(canvas, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
  return out;
}
