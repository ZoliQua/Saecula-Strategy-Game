import type Phaser from 'phaser';
import { LIGHTING_ENABLED, SHADOW } from '../../../config/visual';
import { boxBlur } from './deriveNormals';
import { encodeNormal, N_UP } from './viewSpace';

/** Texture key of a caster's blurred shadow silhouette (same frames). */
export function shadowKey(baseKey: string): string {
  return `${baseKey}#shadow`;
}

/** Attaches a normal map to a registered texture (Light2D reads dataSource[0]). */
export function attachNormalMap(scene: Pick<Phaser.Scene, 'textures'>, key: string, normal: HTMLCanvasElement | null): void {
  if (!normal || !scene.textures.exists(key)) return;
  scene.textures.get(key).setDataSource(normal);
}

/**
 * Team-colour variants share geometry, so they reuse the base texture's
 * normal map source (one GPU texture for all players). Neither texture
 * is ever removed while the game runs, so the shared source is safe.
 */
export function shareNormalMap(scene: Pick<Phaser.Scene, 'textures'>, fromKey: string, toKey: string): void {
  if (!scene.textures.exists(fromKey) || !scene.textures.exists(toKey)) return;
  const from = scene.textures.get(fromKey);
  if (from.dataSource.length === 0) return;
  scene.textures.get(toKey).dataSource = from.dataSource;
}

let flatNormal: HTMLCanvasElement | null = null;

/** Tiny uniform "facing up" normal map for flat ground (terrain chunks). */
export function flatGroundNormal(): HTMLCanvasElement {
  if (flatNormal) return flatNormal;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  const ctx = c.getContext('2d');
  if (ctx) {
    const [r, g, b] = encodeNormal(N_UP);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 4, 4);
  }
  flatNormal = c;
  return c;
}

/**
 * Registers the blurred black silhouette of `baseKey` (all frames kept
 * at the same positions) as `shadowKey(baseKey)`. Soft baked contact
 * shadows (low alpha) are excluded, only the solid caster remains.
 */
export function registerShadowSilhouette(scene: Phaser.Scene, baseKey: string): void {
  if (!LIGHTING_ENABLED || !scene.textures.exists(baseKey)) return;
  const key = shadowKey(baseKey);
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.get(baseKey);
  const src = tex.getSourceImage() as HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  const sctx = src.getContext('2d');
  if (!sctx) return;
  const data = sctx.getImageData(0, 0, w, h).data;
  const mask = new Float32Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = (data[i * 4 + 3] ?? 0) >= 140 ? 1 : 0;
  const soft = boxBlur(boxBlur(mask, w, h, SHADOW.blur), w, h, SHADOW.blur);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  if (!octx) return;
  const img = octx.createImageData(w, h);
  for (let i = 0; i < soft.length; i++) {
    img.data[i * 4] = 6;
    img.data[i * 4 + 1] = 10;
    img.data[i * 4 + 2] = 16;
    img.data[i * 4 + 3] = Math.round(Math.min(1, soft[i] ?? 0) * 255);
  }
  octx.putImageData(img, 0, 0);
  scene.textures.addCanvas(key, out);
  const shadow = scene.textures.get(key);
  for (const name of tex.getFrameNames()) {
    const f = tex.get(name);
    shadow.add(name, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
}
