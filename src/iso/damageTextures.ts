import type Phaser from 'phaser';
import { ART_SCALE, registerCanvas, registerStrip } from './art/canvas';
import { DAMAGE_OVERLAY_FRAMES, paintDamageOverlay } from './art/damageOverlayArt';
import { FLAME_FRAMES, FLAME_W, paintFlameStrip, paintRubble, RUBBLE_VARIANTS } from './art/fireArt';
import { attachNormalMap } from './art/lighting/litTextures';
import { normalMapFor, ROCK_DERIVE } from './art/lighting/normalLayer';
import type { VolumePoint } from './art/lighting/shadowGeometry';
import { hash2 } from './art/palette';

export const DAMAGE_KEYS = {
  flame: 'fx_flame',
  rubble: (i: number) => `fx_rubble_${i}`,
} as const;

/** Damage overlays kept at most (one per building silhouette; least recently used dropped first). */
const MAX_OVERLAYS = 24;

type TextureHost = Pick<Phaser.Scene, 'textures'>;

/** Flame strip and rubble decals (shared by every building). */
export function generateDamageArt(scene: TextureHost): void {
  if (!scene.textures.exists(DAMAGE_KEYS.flame)) {
    registerStrip(scene as Phaser.Scene, DAMAGE_KEYS.flame, paintFlameStrip(), FLAME_W * ART_SCALE, FLAME_FRAMES);
  }
  for (let i = 0; i < RUBBLE_VARIANTS; i++) {
    const key = DAMAGE_KEYS.rubble(i);
    if (scene.textures.exists(key)) continue;
    const canvas = paintRubble(i);
    registerCanvas(scene, key, canvas);
    attachNormalMap(scene, key, normalMapFor(canvas, null, ROCK_DERIVE));
  }
}

/** Overlay keys, least recently used first. */
const overlays = new Set<string>();

/** The silhouette a building texture shares with its team variants. */
export function silhouetteKey(textureKey: string): string {
  return textureKey.replace(/@p\d+$/, '');
}

/**
 * Texture key of the crack / soot overlay for a building texture
 * (frames 0 = smoking, 1 = burning), painted on first need from the
 * texture's own alpha, cracks on the walls of its painted `volume`. Team variants share their base's overlay.
 * Overlays whose source texture has been freed, and the least recently
 * used beyond MAX_OVERLAYS, are dropped (texture memory budget); `inUse`
 * keys are never dropped. Returns null when the source isn't a canvas.
 */
export function damageOverlayTexture(
  scene: TextureHost,
  textureKey: string,
  volume: readonly VolumePoint[],
  inUse: ReadonlySet<string>,
): string | null {
  const base = silhouetteKey(textureKey);
  const key = `dmg~${base}`;
  if (overlays.has(key) && scene.textures.exists(key)) {
    overlays.delete(key);
    overlays.add(key);
    return key;
  }
  const src = scene.textures.exists(base) ? scene.textures.get(base).getSourceImage() : null;
  if (!(src instanceof HTMLCanvasElement) && !(src instanceof HTMLImageElement)) return null;
  let seed = 0;
  for (let i = 0; i < base.length; i++) seed = hash2(seed, base.charCodeAt(i), 3) & 0xffff;
  const { canvas, frameWidth } = paintDamageOverlay(src, volume, seed);
  registerStrip(scene as Phaser.Scene, key, canvas, frameWidth, DAMAGE_OVERLAY_FRAMES);
  overlays.add(key);
  pruneOverlays(scene, inUse, key);
  return key;
}

function pruneOverlays(scene: TextureHost, inUse: ReadonlySet<string>, keep: string): void {
  for (const key of [...overlays]) {
    const sourceGone = !scene.textures.exists(key.slice(4));
    if (!sourceGone && overlays.size <= MAX_OVERLAYS) continue;
    if (key === keep || inUse.has(key)) continue;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    overlays.delete(key);
  }
}

/**
 * True when `img` already draws the texture now registered under `key`.
 * Compares the Texture objects: a key that was removed and repainted
 * names a new texture, which a stale image would not show.
 */
export function showsTexture(img: { readonly texture: unknown }, textures: { get(key: string): unknown }, key: string): boolean {
  return img.texture === textures.get(key);
}
