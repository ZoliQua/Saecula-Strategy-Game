import type Phaser from 'phaser';
import { MENU_CIV } from '../config/civs';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { buildingTexture, registerLitArt } from './buildingTextures';
import { paintConstructionSite } from './art/buildings';
import { paintWallBanner } from './art/walls/wallBanner';
import { ART_SCALE, makeCanvas, registerCanvas, registerStrip } from './art/canvas';
import {
  paintArrow,
  paintBolt,
  paintBulletStreak,
  paintCannonball,
  paintDebris,
  paintGlow,
  paintGunSmoke,
  paintMuzzleFlash,
  paintScorch,
  paintSoftShadow,
  paintTrail,
} from './art/combatFx';
import { generateDamageArt } from './damageTextures';
import { EXPLOSION_FRAMES, EXPLOSION_SIZE, paintExplosionStrip } from './art/explosionArt';
import {
  BUSH_VARIANTS,
  paintBerryBush,
  paintGoldRocks,
  paintStump,
  ROCK_VARIANTS,
  type DecorArt,
} from './art/decor';
import { paintTreeAtlas } from './art/trees';
import { attachNormalMap, registerShadowSilhouette } from './art/lighting/litTextures';
import { FOLIAGE_DERIVE, normalMapFor, ROCK_DERIVE } from './art/lighting/normalLayer';
import { hash2 } from './art/palette';

/** Decor texture keys + per-key origin Y, filled by generateArt. */
export const DECOR_ORIGIN_Y = new Map<string, number>();

export const decorKeys = {
  /** Atlas of every tree frame (see art/trees.ts TREE_FRAMES). */
  trees: 'decor_trees',
  gold: (i: number) => `decor_gold_${i}`,
  bush: (i: number) => `decor_bush_${i}`,
  stump: 'decor_stump',
} as const;

export const FX_KEYS = {
  clouds: 'fx_clouds',
  smoke: 'fx_smoke',
  spark: 'fx_spark',
  mote: 'fx_mote',
  dust: 'fx_dust',
  arrow: 'fx_arrow',
  bolt: 'fx_bolt',
  bullet: 'fx_bullet',
  cannonball: 'fx_cannonball',
  trail: 'fx_trail',
  shotShadow: 'fx_shot_shadow',
  muzzle: 'fx_muzzle',
  gunSmoke: 'fx_gun_smoke',
  scorch: 'fx_scorch',
  debris: 'fx_debris',
  glow: 'fx_glow',
  explosion: 'fx_explosion',
  wallBanner: 'fx_wall_banner',
} as const;

export function constructionKey(size: number): string {
  return `construction_${size}`;
}

/**
 * Generates every texture the game draws. All art is painted
 * procedurally onto canvases (see src/iso/art) so the repo carries
 * no binary sprite assets. Base keys are painted in player 1's colour;
 * other players get lazily painted variants via buildingTexture().
 * Units are painted lazily per type (art/units/UnitArt.ts) and get their
 * team colour from a tinted mask overlay instead.
 */
export function generateArt(scene: Phaser.Scene): void {
  // Age-1 art for every building up front; later age styles paint on first need.
  // MENU_CIV is the menu's civ; GameScene pre-paints the civs in play while loading.
  for (const spec of Object.values(BUILDING_SPECS)) buildingTexture(scene, spec.type, 1, 1, MENU_CIV);
  for (const size of [1, 2, 3, 4]) {
    if (!scene.textures.exists(constructionKey(size))) {
      registerLitArt(scene, constructionKey(size), paintConstructionSite(size));
    }
  }
  const decor = (key: string, art: DecorArt, foliage: boolean, casts: boolean): void => {
    DECOR_ORIGIN_Y.set(key, art.originY);
    if (scene.textures.exists(key)) return;
    registerCanvas(scene, key, art.canvas);
    attachNormalMap(scene, key, normalMapFor(art.canvas, null, foliage ? FOLIAGE_DERIVE : ROCK_DERIVE));
    if (casts) registerShadowSilhouette(scene, key);
  };
  if (!scene.textures.exists(decorKeys.trees)) {
    const atlas = paintTreeAtlas();
    DECOR_ORIGIN_Y.set(decorKeys.trees, atlas.originY);
    registerCanvas(scene, decorKeys.trees, atlas.canvas);
    const tex = scene.textures.get(decorKeys.trees);
    atlas.frames.forEach((f, i) => tex.add(i, 0, f.x, f.y, f.w, f.h));
    attachNormalMap(scene, decorKeys.trees, normalMapFor(atlas.canvas, null, FOLIAGE_DERIVE));
    registerShadowSilhouette(scene, decorKeys.trees);
  }
  for (let i = 0; i < ROCK_VARIANTS; i++) decor(decorKeys.gold(i), paintGoldRocks(i), false, false);
  for (let i = 0; i < BUSH_VARIANTS; i++) decor(decorKeys.bush(i), paintBerryBush(i), true, false);
  decor(decorKeys.stump, paintStump(), false, false);
  generateFx(scene);
}

function generateFx(scene: Phaser.Scene): void {
  if (!scene.textures.exists(FX_KEYS.clouds)) registerCanvas(scene, FX_KEYS.clouds, paintClouds(512));
  const radial = (key: string, size: number, stops: Array<[number, string]>): void => {
    if (scene.textures.exists(key)) return;
    const { canvas, ctx } = makeCanvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    registerCanvas(scene, key, canvas);
  };
  radial(FX_KEYS.smoke, 48, [[0, 'rgba(225,222,215,.85)'], [0.5, 'rgba(200,196,188,.45)'], [1, 'rgba(180,176,170,0)']]);
  radial(FX_KEYS.dust, 32, [[0, 'rgba(214,190,140,.8)'], [1, 'rgba(214,190,140,0)']]);
  radial(FX_KEYS.spark, 16, [[0, 'rgba(255,250,220,1)'], [0.4, 'rgba(255,200,90,.9)'], [1, 'rgba(255,140,40,0)']]);
  radial(FX_KEYS.mote, 12, [[0, 'rgba(255,248,210,.95)'], [1, 'rgba(255,248,210,0)']]);
  generateCombatFx(scene);
  generateDamageArt(scene);
}

/** Combat VFX (projectiles, muzzle flash, blasts); see art/combatFx.ts. */
function generateCombatFx(scene: Phaser.Scene): void {
  const once = (key: string, paint: () => HTMLCanvasElement, lit = false): void => {
    if (scene.textures.exists(key)) return;
    const canvas = paint();
    registerCanvas(scene, key, canvas);
    // Solid shots are lit world props (dark at night like everything else); glows and smoke stay unlit.
    if (lit) attachNormalMap(scene, key, normalMapFor(canvas, null, ROCK_DERIVE));
  };
  once(FX_KEYS.arrow, paintArrow, true);
  once(FX_KEYS.bolt, paintBolt, true);
  once(FX_KEYS.bullet, paintBulletStreak);
  once(FX_KEYS.cannonball, paintCannonball, true);
  once(FX_KEYS.trail, paintTrail);
  once(FX_KEYS.shotShadow, paintSoftShadow);
  once(FX_KEYS.muzzle, paintMuzzleFlash);
  once(FX_KEYS.gunSmoke, paintGunSmoke);
  once(FX_KEYS.scorch, paintScorch);
  once(FX_KEYS.debris, paintDebris);
  once(FX_KEYS.glow, paintGlow);
  if (!scene.textures.exists(FX_KEYS.wallBanner)) {
    const banner = paintWallBanner();
    registerCanvas(scene, FX_KEYS.wallBanner, banner);
    attachNormalMap(scene, FX_KEYS.wallBanner, normalMapFor(banner, null, FOLIAGE_DERIVE));
  }
  if (!scene.textures.exists(FX_KEYS.explosion)) {
    registerStrip(scene, FX_KEYS.explosion, paintExplosionStrip(), EXPLOSION_SIZE * ART_SCALE, EXPLOSION_FRAMES);
  }
}

/** Tileable soft cloud-shadow mask (black with varying alpha). */
function paintClouds(size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const period = 8;
  const noise = (x: number, y: number, p: number, seed: number): number => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const h = (a: number, b: number) => hash2(((a % p) + p) % p, ((b % p) + p) % p, seed);
    const a = h(x0, y0);
    const b = h(x0 + 1, y0);
    const c = h(x0, y0 + 1);
    const d = h(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * period;
      const v = (y / size) * period;
      const n =
        noise(u, v, period, 1) * 0.6 +
        noise(u * 2, v * 2, period * 2, 2) * 0.28 +
        noise(u * 4, v * 4, period * 4, 3) * 0.12;
      const a = Math.max(0, (n - 0.52) / 0.48);
      const o = (y * size + x) * 4;
      img.data[o] = 8;
      img.data[o + 1] = 14;
      img.data[o + 2] = 20;
      img.data[o + 3] = Math.round(Math.min(1, a * 1.8) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
