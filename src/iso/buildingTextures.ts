import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../ecs/archetypes/building';
import { PLAYER_COLORS } from '../game/Player';
import type { AgeId, BuildingType, CivId } from '../types';
import { AGE_STYLED_BUILDINGS, artAgeFor } from './art/architecture/ageStyle';
import {
  ageArtKey,
  parseBuildingArtKey,
  parseWallPieceKey,
  parseWonderStageKey,
  teamArtKey,
  wallPieceKey,
  wonderStageKey,
  type BuildingArtKey,
} from './art/artKeys';
import { paintBuilding, paintWonderStage } from './art/buildings';
import { paintWallPiece } from './art/walls/paintWall';
import { cropCanvas, trimLitArt, type TrimRect } from './art/trimArt';
import { registerCanvas } from './art/canvas';
import { attachNormalMap, halfNormalCanvas, shareNormalMap } from './art/lighting/litTextures';
import type { GlowPoint, LitArt } from './art/lighting/normalLayer';
import type { AnchoredLight } from './art/lighting/buildingLights';
import type { VolumePoint } from './art/lighting/shadowGeometry';

/**
 * Civ-dependent building art: lazily painted textures per (type, age
 * style, civ) plus team variants, wall pieces and Wonder stages, and
 * their eviction (texture memory budget). Keys: art/artKeys.ts.
 */

/** Lighting data of one building texture (shared by its team variants). */
export interface BuildingLightInfo {
  /** Shadow volume + window glows, texture px. */
  readonly volume: readonly VolumePoint[];
  readonly glows: readonly GlowPoint[];
  /** Painter-recorded torches / forges / lanterns and chimney tops (front-corner relative, world px). */
  readonly lights: readonly AnchoredLight[];
  readonly smoke: ReadonlyArray<readonly [number, number]>;
}

/** Per building texture key (age style, civ and team variants included). */
export const BUILDING_LIGHT = new Map<string, BuildingLightInfo>();

type TextureHost = Pick<Phaser.Scene, 'textures'>;

function teamColor(playerId: number): number {
  return PLAYER_COLORS[(playerId - 1) % PLAYER_COLORS.length] ?? 0xffffff;
}

/**
 * Texture key of a building in a civ's age style and a player's colour,
 * painting it on first need: the (type, age, civ) base once with its
 * normal map, each other team as an albedo-only variant sharing the map
 * of its own civ's base. Textures stay cached until
 * releaseStaleBuildingArt frees age styles nobody shows; it detaches a
 * variant's shared normal source before removing it, and removes a base
 * only after all its variants.
 */
export function buildingTexture(host: TextureHost, type: BuildingType, age: AgeId, playerId: number, civ: CivId): string {
  const ageKey = ageArtKey(BUILDING_SPECS[type].textureKey, type, age, civ);
  const artAge = artAgeFor(type, age);
  if (!host.textures.exists(ageKey)) registerLitArt(host, ageKey, paintBuilding(type, teamColor(1), artAge, civ));
  const key = teamArtKey(ageKey, playerId);
  if (key === ageKey || host.textures.exists(key)) return key;
  // Same crop as the base, so the variant lines up with the normal map it shares.
  const variant = paintBuilding(type, teamColor(playerId), artAge, civ, false).canvas;
  const rect = TRIMS.get(ageKey);
  registerCanvas(host, key, rect ? cropCanvas(variant, rect) : variant);
  shareNormalMap(host, ageKey, key);
  const info = BUILDING_LIGHT.get(ageKey);
  if (info) BUILDING_LIGHT.set(key, info);
  return key;
}

/**
 * Texture key of a wall piece (wallPiece) in a civ's age style, painting
 * it on first need. Walls carry no team colour in the texture (banners
 * are a tinted overlay), so one texture per (piece, age, civ) serves
 * every player of that civ.
 */
export function wallTexture(host: TextureHost, piece: number, age: AgeId, civ: CivId): string {
  const key = wallPieceKey(piece, age, civ);
  if (!host.textures.exists(key)) registerLitArt(host, key, paintWallPiece(piece, age, civ));
  return key;
}

/** Texture key of a civ's Wonder at a scaffolding stage (wonderStage), painted on first need. */
export function wonderStageTexture(host: TextureHost, stage: number, civ: CivId): string {
  const key = wonderStageKey(stage, civ);
  if (!host.textures.exists(key)) registerLitArt(host, key, paintWonderStage(stage, civ));
  return key;
}

/** True for a Wonder scaffolding stage key (any civ). */
export function isWonderStageKey(key: string): boolean {
  return parseWonderStageKey(key) !== undefined;
}

/** Frees each civ's Wonder scaffolding stages once no sprite shows one of them (they are large). */
export function releaseWonderStages(host: TextureHost, inUse: ReadonlySet<string>): void {
  const byCiv = new Map<CivId, string[]>();
  for (const key of host.textures.getTextureKeys()) {
    const stage = parseWonderStageKey(key);
    if (stage) byCiv.set(stage.civ, [...(byCiv.get(stage.civ) ?? []), key]);
  }
  for (const keys of byCiv.values()) {
    if (keys.some((key) => inUse.has(key))) continue;
    for (const key of keys) {
      host.textures.remove(key);
      BUILDING_LIGHT.delete(key);
    }
  }
}

/** Plain keys of the building types painted per age (only these have stale ages). */
const AGE_STYLED_KEYS = new Set(AGE_STYLED_BUILDINGS.map((type) => BUILDING_SPECS[type].textureKey));

/**
 * Frees age styles nobody needs any more (texture memory budget), per
 * civ: a team variant once its player has moved past that age, the
 * (type, age, civ) base — which owns the shared normal map — once every
 * active player of that civ has (or none is left) and its variants are
 * gone; wall pieces likewise. Nothing listed in `inUse` (keys on live
 * sprites) is touched, nor the top age. `ageOf` returns undefined for
 * players no longer in the game, `minAgeOf` the lowest age of a civ's
 * active players (undefined: nobody plays it). Returns the number removed.
 */
export function releaseStaleBuildingArt(
  host: TextureHost,
  ageOf: (playerId: number) => AgeId | undefined,
  minAgeOf: (civ: CivId) => AgeId | undefined,
  inUse: ReadonlySet<string>,
): number {
  let removed = 0;
  const drop = (key: string, shared: boolean): void => {
    // Variants borrow their base's normal source: detach it so removing them leaves it intact.
    if (shared) host.textures.get(key).dataSource = [];
    host.textures.remove(key);
    BUILDING_LIGHT.delete(key);
    removed++;
  };
  const stale = (civ: CivId, age: AgeId): boolean => {
    const min = minAgeOf(civ);
    return min === undefined || min > age;
  };
  const bases: BuildingArtKey[] = [];
  const keptVariantOf = new Set<string>();
  for (const key of host.textures.getTextureKeys()) {
    const wall = parseWallPieceKey(key);
    if (wall) {
      // Wall pieces own their normal maps (no team variants).
      if (wall.age < 3 && stale(wall.civ, wall.age) && !inUse.has(key)) drop(key, false);
      continue;
    }
    const art = parseBuildingArtKey(key);
    if (!art || art.age === 3 || !AGE_STYLED_KEYS.has(art.baseKey)) continue;
    if (art.playerId === undefined) {
      bases.push(art);
      continue;
    }
    const current = ageOf(art.playerId);
    if ((current === undefined || current > art.age) && !inUse.has(key)) drop(key, true);
    else keptVariantOf.add(art.ageKey);
  }
  for (const base of bases) {
    if (stale(base.civ, base.age) && !keptVariantOf.has(base.ageKey) && !inUse.has(base.ageKey)) drop(base.ageKey, false);
  }
  return removed;
}

/**
 * Frees wall pieces (any age or civ) that no game object shows: joins
 * change as walls are built and razed, so a long game would otherwise
 * keep every shape it ever saw. `inUse` must hold the texture key of
 * every game object, visible or not (placement ghosts too). Returns the
 * number removed.
 */
export function releaseUnusedWallPieces(host: TextureHost, inUse: ReadonlySet<string>): number {
  let removed = 0;
  for (const key of host.textures.getTextureKeys()) {
    if (parseWallPieceKey(key) === undefined || inUse.has(key)) continue;
    host.textures.remove(key);
    BUILDING_LIGHT.delete(key);
    removed++;
  }
  return removed;
}

/** Crop applied to each registered lit art, by its (civ-qualified) key; team variants reuse their base's. */
const TRIMS = new Map<string, TrimRect>();

/** Registers painted art (trimmed to its content) with its normal map and remembers its lighting data. */
export function registerLitArt(host: TextureHost, key: string, painted: LitArt): void {
  const { art, rect } = trimLitArt(painted);
  TRIMS.set(key, rect);
  registerCanvas(host, key, art.canvas);
  // Buildings, wall pieces and Wonder stages keep a half-size normal map (memory budget).
  attachNormalMap(host, key, art.normal && halfNormalCanvas(art.normal, art.canvas));
  BUILDING_LIGHT.set(key, { volume: art.volume, glows: art.glows, lights: art.lights, smoke: art.smoke });
}
