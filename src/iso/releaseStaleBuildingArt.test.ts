import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import type { AgeId } from '../types';
import { BUILDING_LIGHT, releaseStaleBuildingArt, releaseUnusedWallPieces } from './textures';

/** Minimal stand-in for Phaser's TextureManager: textures with a (shared) dataSource array. */
interface FakeTexture {
  dataSource: object[];
  destroyedSources: object[];
}

function fakeHost(keys: string[]) {
  const normal = { kind: 'normal-map' };
  const map = new Map<string, FakeTexture>();
  const shared: object[] = [normal];
  for (const k of keys) {
    // Bases own the source array; variants share the same array object (like shareNormalMap).
    map.set(k, { dataSource: shared, destroyedSources: [] });
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
  return { host, map, normal, destroyed };
}

const ages = (table: Record<number, AgeId>) => (id: number): AgeId | undefined => table[id];

describe('releaseStaleBuildingArt', () => {
  it('drops a past-age team variant without destroying the shared normal map', () => {
    const { host, map, normal, destroyed } = fakeHost(['building_house', 'building_house@p2']);
    BUILDING_LIGHT.set('building_house@p2', { volume: [], glows: [], lights: [], smoke: [] });
    const n = releaseStaleBuildingArt(host, ages({ 1: 1, 2: 2 }), 1, new Set());
    expect(n).toBe(1);
    expect(map.has('building_house@p2')).toBe(false);
    expect(BUILDING_LIGHT.has('building_house@p2')).toBe(false);
    expect(destroyed).not.toContain(normal);
    expect(map.get('building_house')?.dataSource).toEqual([normal]);
  });

  it('keeps the base while minAge has not passed it', () => {
    const { host, map } = fakeHost(['building_house']);
    expect(releaseStaleBuildingArt(host, ages({ 1: 1, 2: 3 }), 1, new Set())).toBe(0);
    expect(map.has('building_house')).toBe(true);
  });

  it('keeps the base while a variant or an in-use key remains', () => {
    const a = fakeHost(['building_house', 'building_house@p2']);
    releaseStaleBuildingArt(a.host, ages({ 1: 2, 2: 2 }), 2, new Set(['building_house@p2']));
    expect(a.map.has('building_house@p2')).toBe(true);
    expect(a.map.has('building_house')).toBe(true);

    const b = fakeHost(['building_house']);
    releaseStaleBuildingArt(b.host, ages({ 1: 2 }), 2, new Set(['building_house']));
    expect(b.map.has('building_house')).toBe(true);
  });

  it('removes the base last, once every player is past it and no variant is left', () => {
    const { host, map } = fakeHost(['building_house', 'building_house@p2', 'building_house@p3']);
    expect(releaseStaleBuildingArt(host, ages({ 1: 2, 2: 3, 3: 2 }), 2, new Set())).toBe(3);
    expect(map.size).toBe(0);
  });

  it('drops unused variants of players that left the game (undefined age)', () => {
    const { host, map } = fakeHost(['building_barracks', 'building_barracks@p4']);
    releaseStaleBuildingArt(host, ages({ 1: 1 }), 1, new Set());
    expect(map.has('building_barracks@p4')).toBe(false);
    expect(map.has('building_barracks')).toBe(true);
  });

  it('never touches the current top age or single-style buildings', () => {
    const keys = ['building_house~a3', 'building_house~a3@p2', 'building_foundry', 'building_wonder@p2', 'building_wall~j256~a3'];
    const { host, map } = fakeHost(keys);
    expect(releaseStaleBuildingArt(host, ages({ 1: 3, 2: 3, 3: 3 }), 3, new Set())).toBe(0);
    expect([...map.keys()].sort()).toEqual([...keys].sort());
  });

  it('matches variants per age: ~a2@p keys are not age-1 variants', () => {
    // Player 2 is past age 1 but still in age 2: the age-2 variant must stay.
    const { host, map } = fakeHost(['building_house', 'building_house~a2', 'building_house~a2@p2']);
    releaseStaleBuildingArt(host, ages({ 1: 1, 2: 2 }), 1, new Set());
    expect(map.has('building_house~a2@p2')).toBe(true);
    expect(map.has('building_house~a2')).toBe(true);
    expect(map.has('building_house')).toBe(true);
  });

  it('drops wall pieces of ages every player has left, unless shown', () => {
    const { host, map } = fakeHost(['building_wall~j10~a1', 'building_wall~j266~a1', 'building_wall~j10~a2', 'building_wall~j10~a3']);
    releaseStaleBuildingArt(host, ages({ 1: 3, 2: 2 }), 2, new Set(['building_wall~j266~a1']));
    expect([...map.keys()].sort()).toEqual(['building_wall~j10~a2', 'building_wall~j10~a3', 'building_wall~j266~a1']);
  });
});

describe('releaseUnusedWallPieces', () => {
  it('drops wall pieces no game object shows, in any age, and leaves everything else', () => {
    const { host, map } = fakeHost(['building_wall~j3~a1', 'building_wall~j5~a1', 'building_wall~j5~a2', 'building_house', 'building_wall']);
    BUILDING_LIGHT.set('building_wall~j3~a1', { volume: [], glows: [], lights: [], smoke: [] });
    const n = releaseUnusedWallPieces(host, new Set(['building_wall~j5~a1']));
    expect(n).toBe(2);
    expect([...map.keys()].sort()).toEqual(['building_house', 'building_wall', 'building_wall~j5~a1']);
    expect(BUILDING_LIGHT.has('building_wall~j3~a1')).toBe(false);
  });
});
