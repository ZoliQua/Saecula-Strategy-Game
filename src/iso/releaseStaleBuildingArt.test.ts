import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import type { AgeId, CivId } from '../types';
import { BUILDING_LIGHT, releaseStaleBuildingArt, releaseUnusedWallPieces, releaseWonderStages } from './buildingTextures';

/** Minimal stand-in for Phaser's TextureManager: textures with a (shared) dataSource array. */
interface FakeTexture {
  dataSource: object[];
}

/**
 * Bases own a normal-map source array; a team variant (`…@pN`) shares
 * the array of its own base (like shareNormalMap).
 */
function fakeHost(keys: string[]) {
  const map = new Map<string, FakeTexture>();
  const normals = new Map<string, object>();
  for (const k of keys.filter((key) => !key.includes('@p'))) {
    const normal = { normalOf: k };
    normals.set(k, normal);
    map.set(k, { dataSource: [normal] });
  }
  for (const k of keys.filter((key) => key.includes('@p'))) {
    const base = map.get(k.slice(0, k.lastIndexOf('@p')));
    map.set(k, { dataSource: base ? base.dataSource : [] });
  }
  const destroyed: object[] = [];
  const textures = {
    exists: (k: string) => map.has(k),
    get: (k: string) => map.get(k)!,
    remove: (k: string) => {
      const t = map.get(k);
      // Phaser destroys every dataSource of a removed texture.
      if (t) destroyed.push(...t.dataSource);
      map.delete(k);
    },
    getTextureKeys: () => [...map.keys()],
  };
  const host = { textures } as unknown as Pick<Phaser.Scene, 'textures'>;
  return { host, map, normals, destroyed };
}

const ages = (table: Record<number, AgeId>) => (id: number): AgeId | undefined => table[id];
const mins = (table: Partial<Record<CivId, AgeId>>) => (civ: CivId): AgeId | undefined => table[civ];
const HU = mins({ hungarian: 1 });

describe('releaseStaleBuildingArt', () => {
  it('drops a past-age team variant without destroying the shared normal map', () => {
    const { host, map, normals, destroyed } = fakeHost(['building_house~chungarian', 'building_house~chungarian@p2']);
    BUILDING_LIGHT.set('building_house~chungarian@p2', { volume: [], glows: [], lights: [], smoke: [] });
    const n = releaseStaleBuildingArt(host, ages({ 1: 1, 2: 2 }), HU, new Set());
    expect(n).toBe(1);
    expect(map.has('building_house~chungarian@p2')).toBe(false);
    expect(BUILDING_LIGHT.has('building_house~chungarian@p2')).toBe(false);
    const normal = normals.get('building_house~chungarian')!;
    expect(destroyed).not.toContain(normal);
    expect(map.get('building_house~chungarian')?.dataSource).toEqual([normal]);
  });

  it('keeps the base while its civ has a player in that age', () => {
    const { host, map } = fakeHost(['building_house~chungarian']);
    expect(releaseStaleBuildingArt(host, ages({ 1: 1, 2: 3 }), HU, new Set())).toBe(0);
    expect(map.has('building_house~chungarian')).toBe(true);
  });

  it('keeps the base while a variant or an in-use key remains', () => {
    const a = fakeHost(['building_house~chungarian', 'building_house~chungarian@p2']);
    releaseStaleBuildingArt(a.host, ages({ 1: 2, 2: 2 }), mins({ hungarian: 2 }), new Set(['building_house~chungarian@p2']));
    expect(a.map.has('building_house~chungarian@p2')).toBe(true);
    expect(a.map.has('building_house~chungarian')).toBe(true);

    const b = fakeHost(['building_house~chungarian']);
    releaseStaleBuildingArt(b.host, ages({ 1: 2 }), mins({ hungarian: 2 }), new Set(['building_house~chungarian']));
    expect(b.map.has('building_house~chungarian')).toBe(true);
  });

  it('removes the base last, once every player of its civ is past it and no variant is left', () => {
    const { host, map } = fakeHost(['building_house~chungarian', 'building_house~chungarian@p2', 'building_house~chungarian@p3']);
    expect(releaseStaleBuildingArt(host, ages({ 1: 2, 2: 3, 3: 2 }), mins({ hungarian: 2 }), new Set())).toBe(3);
    expect(map.size).toBe(0);
  });

  it('frees and keeps per civ: each civ follows its own players', () => {
    // Hungarians (p1, p3) are all in age 2; the English (p2) still in age 1.
    const keys = [
      'building_house~chungarian',
      'building_house~chungarian@p3',
      'building_house~cenglish',
      'building_house~cenglish@p2',
      'building_house~a2~chungarian',
    ];
    const { host, map, normals, destroyed } = fakeHost(keys);
    const n = releaseStaleBuildingArt(host, ages({ 1: 2, 2: 1, 3: 2 }), mins({ hungarian: 2, english: 1 }), new Set());
    expect(n).toBe(2);
    expect([...map.keys()].sort()).toEqual(['building_house~a2~chungarian', 'building_house~cenglish', 'building_house~cenglish@p2']);
    // The English variant still borrows the English base's own normal map.
    expect(map.get('building_house~cenglish@p2')?.dataSource).toEqual([normals.get('building_house~cenglish')]);
    expect(destroyed).not.toContain(normals.get('building_house~cenglish'));
  });

  it('frees a civ nobody plays any more (no active player of it)', () => {
    const { host, map } = fakeHost(['building_house~cenglish', 'building_house~a2~cenglish', 'building_house~chungarian']);
    releaseStaleBuildingArt(host, ages({ 1: 1 }), HU, new Set());
    expect([...map.keys()].sort()).toEqual(['building_house~chungarian']);
  });

  it('drops unused variants of players that left the game (undefined age)', () => {
    const { host, map } = fakeHost(['building_barracks~chungarian', 'building_barracks~chungarian@p4']);
    releaseStaleBuildingArt(host, ages({ 1: 1 }), HU, new Set());
    expect(map.has('building_barracks~chungarian@p4')).toBe(false);
    expect(map.has('building_barracks~chungarian')).toBe(true);
  });

  it('never touches the top age, single-style buildings or untagged keys', () => {
    const keys = [
      'building_house~a3~chungarian',
      'building_house~a3~chungarian@p2',
      'building_foundry~chungarian',
      'building_wonder~chungarian@p2',
      'building_wall~j256~a3~chungarian',
      'building_house',
      'construction_3',
    ];
    const { host, map } = fakeHost(keys);
    expect(releaseStaleBuildingArt(host, ages({ 1: 3, 2: 3 }), mins({ hungarian: 3 }), new Set())).toBe(0);
    expect([...map.keys()].sort()).toEqual([...keys].sort());
  });

  it('matches variants per age: ~a2 variants are not age-1 variants', () => {
    // Player 2 is past age 1 but still in age 2: the age-2 variant must stay.
    const { host, map } = fakeHost(['building_house~chungarian', 'building_house~a2~chungarian', 'building_house~a2~chungarian@p2']);
    releaseStaleBuildingArt(host, ages({ 1: 1, 2: 2 }), HU, new Set());
    expect(map.has('building_house~a2~chungarian@p2')).toBe(true);
    expect(map.has('building_house~a2~chungarian')).toBe(true);
    expect(map.has('building_house~chungarian')).toBe(true);
  });

  it('drops wall pieces of ages every player of the civ has left, unless shown', () => {
    const { host, map } = fakeHost([
      'building_wall~j10~a1~chungarian',
      'building_wall~j266~a1~chungarian',
      'building_wall~j10~a2~chungarian',
      'building_wall~j10~a1~cenglish',
    ]);
    releaseStaleBuildingArt(host, ages({ 1: 3, 2: 1 }), mins({ hungarian: 2, english: 1 }), new Set(['building_wall~j266~a1~chungarian']));
    expect([...map.keys()].sort()).toEqual([
      'building_wall~j10~a1~cenglish',
      'building_wall~j10~a2~chungarian',
      'building_wall~j266~a1~chungarian',
    ]);
  });
});

describe('releaseUnusedWallPieces', () => {
  it('drops wall pieces no game object shows, in any age and civ, and leaves everything else', () => {
    const { host, map } = fakeHost([
      'building_wall~j3~a1~chungarian',
      'building_wall~j5~a1~chungarian',
      'building_wall~j5~a2~cenglish',
      'building_house~chungarian',
      'building_wall~chungarian',
    ]);
    BUILDING_LIGHT.set('building_wall~j3~a1~chungarian', { volume: [], glows: [], lights: [], smoke: [] });
    const n = releaseUnusedWallPieces(host, new Set(['building_wall~j5~a1~chungarian']));
    expect(n).toBe(2);
    expect([...map.keys()].sort()).toEqual(['building_house~chungarian', 'building_wall~chungarian', 'building_wall~j5~a1~chungarian']);
    expect(BUILDING_LIGHT.has('building_wall~j3~a1~chungarian')).toBe(false);
  });
});

describe('releaseWonderStages', () => {
  it('frees a civ’s stages once none of them is shown, keeping another civ’s in use', () => {
    const { host, map } = fakeHost([
      'building_wonder~s1~chungarian',
      'building_wonder~s2~chungarian',
      'building_wonder~s1~cenglish',
      'building_wonder~s2~cenglish',
      'building_wonder~chungarian',
    ]);
    releaseWonderStages(host, new Set(['building_wonder~s2~cenglish']));
    expect([...map.keys()].sort()).toEqual(['building_wonder~chungarian', 'building_wonder~s1~cenglish', 'building_wonder~s2~cenglish']);
  });
});
