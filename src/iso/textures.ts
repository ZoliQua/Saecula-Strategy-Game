import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import { PLAYER_COLORS } from '../game/Player';
import type { BuildingType, UnitType } from '../types';
import { paintBuilding, paintConstructionSite } from './art/buildings';
import { makeCanvas, registerCanvas, registerStrip } from './art/canvas';
import {
  BUSH_VARIANTS,
  paintBerryBush,
  paintGoldRocks,
  paintStump,
  paintTree,
  ROCK_VARIANTS,
  TREE_VARIANTS,
  type DecorArt,
} from './art/decor';
import { attachNormalMap, registerShadowSilhouette, shareNormalMap } from './art/lighting/litTextures';
import {
  FOLIAGE_DERIVE,
  normalMapFor,
  ROCK_DERIVE,
  UNIT_DERIVE,
  type GlowPoint,
  type LitArt,
} from './art/lighting/normalLayer';
import type { VolumePoint } from './art/lighting/shadowGeometry';
import { hash2 } from './art/palette';
import { paintUnitStrip, UNIT_FRAME_W } from './art/units';

/** Decor texture keys + per-key origin Y, filled by generateArt. */
export const DECOR_ORIGIN_Y = new Map<string, number>();

export const decorKeys = {
  tree: (i: number) => `decor_tree_${i}`,
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
} as const;

export function constructionKey(size: number): string {
  return `construction_${size}`;
}

/** Per base texture key: building shadow volume + window glows (texture px). */
export const BUILDING_LIGHT = new Map<string, { volume: readonly VolumePoint[]; glows: readonly GlowPoint[] }>();

const unitByKey = new Map<string, UnitType>();
const buildingByKey = new Map<string, BuildingType>();

function teamColor(playerId: number): number {
  return PLAYER_COLORS[(playerId - 1) % PLAYER_COLORS.length] ?? 0xffffff;
}

/**
 * Generates every texture the game draws. All art is painted
 * procedurally onto canvases (see src/iso/art) so the repo carries
 * no binary sprite assets. Base keys are painted in player 1's colour;
 * other players get lazily painted variants via teamTextureKey().
 */
export function generateArt(scene: Phaser.Scene): void {
  const p1 = teamColor(1);
  for (const spec of Object.values(UNIT_SPECS)) {
    unitByKey.set(spec.textureKey, spec.type);
    if (!scene.textures.exists(spec.textureKey)) {
      const strip = paintUnitStrip(spec.type, p1);
      registerStrip(scene, spec.textureKey, strip, UNIT_FRAME_W, 4);
      attachNormalMap(scene, spec.textureKey, normalMapFor(strip, null, UNIT_DERIVE));
      registerShadowSilhouette(scene, spec.textureKey);
    }
  }
  for (const spec of Object.values(BUILDING_SPECS)) {
    buildingByKey.set(spec.textureKey, spec.type);
    if (!scene.textures.exists(spec.textureKey)) {
      registerLitArt(scene, spec.textureKey, paintBuilding(spec.type, p1));
    }
  }
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
  for (let i = 0; i < TREE_VARIANTS; i++) decor(decorKeys.tree(i), paintTree(i), true, true);
  for (let i = 0; i < ROCK_VARIANTS; i++) decor(decorKeys.gold(i), paintGoldRocks(i), false, false);
  for (let i = 0; i < BUSH_VARIANTS; i++) decor(decorKeys.bush(i), paintBerryBush(i), true, false);
  decor(decorKeys.stump, paintStump(), false, false);
  generateFx(scene);
}

/** Returns (and lazily paints) the texture for `baseKey` in a player's colour. */
export function teamTextureKey(scene: Phaser.Scene, baseKey: string, playerId: number): string {
  if (playerId <= 1) return baseKey;
  const key = `${baseKey}@p${playerId}`;
  if (scene.textures.exists(key)) return key;
  const unit = unitByKey.get(baseKey);
  const building = buildingByKey.get(baseKey);
  if (unit) {
    registerStrip(scene, key, paintUnitStrip(unit, teamColor(playerId)), UNIT_FRAME_W, 4);
  } else if (building) {
    registerCanvas(scene, key, paintBuilding(building, teamColor(playerId), false).canvas);
  } else {
    return baseKey;
  }
  shareNormalMap(scene, baseKey, key);
  return key;
}

/** Registers painted art with its normal map and remembers its lighting data. */
function registerLitArt(scene: Phaser.Scene, key: string, art: LitArt): void {
  registerCanvas(scene, key, art.canvas);
  attachNormalMap(scene, key, art.normal);
  BUILDING_LIGHT.set(key, { volume: art.volume, glows: art.glows });
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
