import { CIV_IDS } from '../../config/civs';
import type { AgeId, BuildingType, CivId } from '../../types';
import { artAgeFor } from './architecture/ageStyle';

/**
 * Texture keys of civ-dependent art (M4 design decision 7). Every such
 * key carries a `~c<civ>` segment, Hungarian included, so each civ in a
 * match has its own textures and eviction can free them per civ.
 * Civ-independent art (terrain, decor, FX, construction sites) keeps
 * its plain key.
 *
 *   building  `building_house~chungarian`, `building_house~a2~cenglish@p3`
 *   wall      `building_wall~j266~a1~chungarian`
 *   wonder    `building_wonder~s2~cenglish`
 *   unit      `unit_villager~chungarian` (+ `#team`, `#shadow`)
 */

const civ = (id: CivId): string => `~c${id}`;

function asCiv(s: string | undefined): CivId | undefined {
  return CIV_IDS.find((id) => id === s);
}

/** Texture key of a building's base art (in its civ's base owner's colour) in an age style for a civ. */
export function ageArtKey(baseKey: string, type: BuildingType, age: AgeId, civId: CivId): string {
  const a = artAgeFor(type, age);
  return a === 1 ? `${baseKey}${civ(civId)}` : `${baseKey}~a${a}${civ(civId)}`;
}

/**
 * Texture key of a player's team colour: the painted base itself for the
 * player it was painted for (`baseOwner`, its civ's base owner), else a
 * variant `@p<id>` (player 1 included).
 */
export function teamArtKey(key: string, playerId: number, baseOwner = 1): string {
  return playerId === baseOwner ? key : `${key}@p${playerId}`;
}

export interface BuildingArtKey {
  /** The building type's plain key (BUILDING_SPECS textureKey). */
  readonly baseKey: string;
  readonly age: AgeId;
  readonly civ: CivId;
  /** The base texture (no team suffix): owns the normal map variants share. */
  readonly ageKey: string;
  /** Set on team variants only. */
  readonly playerId?: number;
}

const BUILDING_KEY = /^(building_[a-z_]+)(?:~a([23]))?~c([a-z]+)(?:@p(\d+))?$/;

/** Parts of a building art key (ageArtKey / teamArtKey), or undefined for any other key. */
export function parseBuildingArtKey(key: string): BuildingArtKey | undefined {
  const m = BUILDING_KEY.exec(key);
  const civId = asCiv(m?.[3]);
  if (!m || !m[1] || !civId) return undefined;
  const age = (m[2] ? Number(m[2]) : 1) as AgeId;
  const ageKey = m[4] ? key.slice(0, key.lastIndexOf('@p')) : key;
  const parsed: BuildingArtKey = { baseKey: m[1], age, civ: civId, ageKey };
  return m[4] ? { ...parsed, playerId: Number(m[4]) } : parsed;
}

/** Texture key of one wall piece (wallPiece value) in an age style for a civ. */
export function wallPieceKey(piece: number, age: AgeId, civId: CivId): string {
  return `building_wall~j${piece}~a${age}${civ(civId)}`;
}

/** Age and civ of a wall piece key, or undefined for other keys. */
export function parseWallPieceKey(key: string): { age: AgeId; civ: CivId } | undefined {
  const m = /^building_wall~j\d+~a([123])~c([a-z]+)$/.exec(key);
  const civId = asCiv(m?.[2]);
  return m && civId ? { age: Number(m[1]) as AgeId, civ: civId } : undefined;
}

/** Texture key of the Wonder at a scaffolding stage for a civ. */
export function wonderStageKey(stage: number, civId: CivId): string {
  return `building_wonder~s${stage}${civ(civId)}`;
}

/** Stage and civ of a Wonder stage key, or undefined for other keys. */
export function parseWonderStageKey(key: string): { stage: number; civ: CivId } | undefined {
  const m = /^building_wonder~s(\d+)~c([a-z]+)$/.exec(key);
  const civId = asCiv(m?.[2]);
  return m && civId ? { stage: Number(m[1]), civ: civId } : undefined;
}

/** Texture key of a unit type's sheet for a civ (`baseKey`: UNIT_SPECS textureKey). */
export function unitArtKey(baseKey: string, civId: CivId): string {
  return `${baseKey}${civ(civId)}`;
}

/** A civ-qualified texture and the group it belongs to (base + team variants / mask / shadow). */
export interface CivArtKey {
  readonly civ: CivId;
  /** The group's own key (building age key, unit sheet albedo, wall piece, Wonder stage). */
  readonly group: string;
  /** Team variants and unit masks borrow the group key's normal map. */
  readonly sharesNormals: boolean;
}

/** Civ and group of any civ-qualified key (see the table above), or undefined for civ-independent art. */
export function parseCivArtKey(key: string): CivArtKey | undefined {
  const m = /^(.+~c([a-z]+))(@p\d+|#team|#shadow)?$/.exec(key);
  const civId = asCiv(m?.[2]);
  if (!m || !m[1] || !civId) return undefined;
  return { civ: civId, group: m[1], sharesNormals: m[3] !== undefined && m[3] !== '#shadow' };
}

/**
 * Groups (parseCivArtKey) with at least one texture in `inUse`: the one
 * in-use rule of every civ-art eviction (texture groups and the unit-art
 * cache), so a group shown only by, say, its unit shadow stays whole.
 */
export function civArtGroupsInUse(inUse: Iterable<string>): Set<string> {
  const groups = new Set<string>();
  for (const key of inUse) {
    const art = parseCivArtKey(key);
    if (art) groups.add(art.group);
  }
  return groups;
}
