import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import type { AgeId, CivId } from '../types';
import {
  BASE_OWNER,
  BUILDING_LIGHT,
  rebaseCivArt,
  releaseAbsentCivArt,
  releaseStaleBuildingArt,
  releaseUnusedWallPieces,
  releaseWonderStages,
} from './buildingTextures';

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

describe('releaseAbsentCivArt', () => {
  /** A unit sheet's albedo, its team mask (shares the albedo's normal map) and its shadow. */
  const unitKeys = (civ: string) => [`villager_placeholder~c${civ}`, `villager_placeholder~c${civ}#team`, `villager_placeholder~c${civ}#shadow`];

  it('frees every art of a civ nobody plays: all ages, single-style buildings, walls, stages and unit sheets', () => {
    const hungarian = [
      'building_house~chungarian',
      'building_house~a3~chungarian',
      'building_town_center~a3~chungarian@p2',
      'building_town_center~a3~chungarian',
      'building_wonder~chungarian',
      'building_foundry~chungarian',
      'building_wall~j5~a3~chungarian',
      'building_wonder~s2~chungarian',
      ...unitKeys('hungarian'),
    ];
    const kept = ['building_house~a3~cenglish', ...unitKeys('english'), 'construction_3', 'decor_trees', 'building_house'];
    const { host, map, destroyed } = fakeHost([...hungarian, ...kept]);
    // Phaser shares the mask's normal source with the albedo: model it like a team variant.
    map.get('villager_placeholder~chungarian#team')!.dataSource = map.get('villager_placeholder~chungarian')!.dataSource;
    const n = releaseAbsentCivArt(host, new Set(['english']), new Set());
    expect(n).toBe(hungarian.length);
    expect([...map.keys()].sort()).toEqual([...kept].sort());
    // Each shared normal source is destroyed once, by its owner, never through a sharer.
    expect(new Set(destroyed).size).toBe(destroyed.length);
  });

  it('keeps a group (base, team variants, mask, shadow) while any of its textures is shown', () => {
    const keys = ['building_wonder~chungarian', 'building_wonder~chungarian@p3', ...unitKeys('hungarian'), 'building_house~a2~chungarian'];
    const { host, map } = fakeHost(keys);
    releaseAbsentCivArt(host, new Set(['english']), new Set(['building_wonder~chungarian@p3', 'villager_placeholder~chungarian']));
    expect([...map.keys()].sort()).toEqual(['building_wonder~chungarian', 'building_wonder~chungarian@p3', ...unitKeys('hungarian')].sort());
  });

  it('keeps a unit sheet whose shadow alone is shown (same rule as forgetUnitArt, civArtGroupsInUse)', () => {
    const { host, map } = fakeHost(unitKeys('hungarian'));
    releaseAbsentCivArt(host, new Set(['english']), new Set(['villager_placeholder~chungarian#shadow']));
    expect([...map.keys()].sort()).toEqual(unitKeys('hungarian').sort());
  });

  it('leaves the civs in play alone', () => {
    const keys = ['building_house~a3~chungarian', 'building_wonder~chungarian', ...unitKeys('hungarian')];
    const { host, map } = fakeHost(keys);
    expect(releaseAbsentCivArt(host, new Set(['hungarian', 'english']), new Set())).toBe(0);
    expect(map.size).toBe(keys.length);
  });
});

describe('shared civ whose base owner is gone (M5 Task 1, Review Focus 2)', () => {
  it('keeps the base (and so the variant’s normal map) when base owner 3 is defeated but player 5’s variant is shown', () => {
    const { host, map, normals, destroyed } = fakeHost(['building_house~cenglish', 'building_house~cenglish@p5']);
    BASE_OWNER.set('building_house~cenglish', 3);
    // Player 3 is out (undefined age); player 5 is the civ's last active player, still in age 1.
    releaseStaleBuildingArt(host, ages({ 5: 1 }), mins({ english: 1 }), new Set(['building_house~cenglish@p5']));
    rebaseCivArt(host, new Map([['english', 3]]), new Set(['building_house~cenglish@p5']));
    expect(map.has('building_house~cenglish')).toBe(true);
    const normal = normals.get('building_house~cenglish')!;
    expect(map.get('building_house~cenglish@p5')?.dataSource).toEqual([normal]);
    expect(destroyed).not.toContain(normal);
  });

  it('keeps the age-1 base for player 5 when base owner 3 ages up first', () => {
    const { host, map, normals } = fakeHost(['building_house~cenglish', 'building_house~cenglish@p5', 'building_house~a2~cenglish']);
    BASE_OWNER.set('building_house~cenglish', 3);
    BASE_OWNER.set('building_house~a2~cenglish', 3);
    releaseStaleBuildingArt(host, ages({ 3: 2, 5: 1 }), mins({ english: 1 }), new Set());
    expect([...map.keys()].sort()).toEqual(['building_house~a2~cenglish', 'building_house~cenglish', 'building_house~cenglish@p5']);
    expect(map.get('building_house~cenglish@p5')?.dataSource).toEqual([normals.get('building_house~cenglish')]);
  });
});

describe('rebaseCivArt', () => {
  it('frees a base painted for a player who is not its civ’s base owner, variants first (normal map destroyed once)', () => {
    const { host, map, normals, destroyed } = fakeHost([
      'building_house~cenglish',
      'building_house~cenglish@p3',
      'building_house~chungarian',
      'building_town_center~cenglish',
    ]);
    BASE_OWNER.set('building_house~cenglish', 1);
    BASE_OWNER.set('building_house~chungarian', 1);
    BASE_OWNER.set('building_town_center~cenglish', 3);
    BUILDING_LIGHT.set('building_house~cenglish', { volume: [], glows: [], lights: [], smoke: [] });
    const n = rebaseCivArt(host, new Map([['hungarian', 1], ['english', 3]]), new Set());
    expect(n).toBe(2);
    expect([...map.keys()].sort()).toEqual(['building_house~chungarian', 'building_town_center~cenglish']);
    expect(destroyed.filter((d) => d === normals.get('building_house~cenglish'))).toHaveLength(1);
    expect(BASE_OWNER.has('building_house~cenglish')).toBe(false);
    expect(BUILDING_LIGHT.has('building_house~cenglish')).toBe(false);
  });

  it('treats a base without a record as painted for player 1 (menu art)', () => {
    const { host, map } = fakeHost(['building_farm~cenglish']);
    BASE_OWNER.delete('building_farm~cenglish');
    expect(rebaseCivArt(host, new Map([['english', 2]]), new Set())).toBe(1);
    expect(map.size).toBe(0);
  });

  it('leaves a mismatched base alone while it or a variant is in use, and civs outside the match', () => {
    const { host, map } = fakeHost(['building_house~cenglish', 'building_house~cenglish@p2', 'building_house~chungarian']);
    BASE_OWNER.set('building_house~cenglish', 1);
    BASE_OWNER.set('building_house~chungarian', 1);
    expect(rebaseCivArt(host, new Map([['english', 3]]), new Set(['building_house~cenglish@p2']))).toBe(0);
    expect(map.size).toBe(3);
  });
});
