import { describe, expect, it } from 'vitest';
import {
  ageArtKey,
  civArtGroupsInUse,
  parseBuildingArtKey,
  parseCivArtKey,
  parseWallPieceKey,
  parseWonderStageKey,
  teamArtKey,
  unitArtKey,
  wallPieceKey,
  wonderStageKey,
} from './artKeys';

describe('building art keys', () => {
  it('qualify every age with the civ (Hungarian included)', () => {
    expect(ageArtKey('building_house', 'house', 1, 'hungarian')).toBe('building_house~chungarian');
    expect(ageArtKey('building_house', 'house', 2, 'english')).toBe('building_house~a2~cenglish');
    expect(ageArtKey('building_town_center', 'town_center', 3, 'hungarian')).toBe('building_town_center~a3~chungarian');
  });

  it('use the age-1 key for single-style buildings', () => {
    expect(ageArtKey('building_wonder', 'wonder', 3, 'english')).toBe('building_wonder~cenglish');
    expect(ageArtKey('building_foundry', 'foundry', 3, 'hungarian')).toBe('building_foundry~chungarian');
  });

  it('style towers and wall icons per age', () => {
    expect(ageArtKey('building_tower', 'tower', 2, 'english')).toBe('building_tower~a2~cenglish');
    expect(ageArtKey('building_wall', 'wall', 3, 'hungarian')).toBe('building_wall~a3~chungarian');
  });

  it('add the team suffix last (player 1 uses the base)', () => {
    expect(teamArtKey('building_house~a2~cenglish', 1)).toBe('building_house~a2~cenglish');
    expect(teamArtKey('building_house~a2~cenglish', 3)).toBe('building_house~a2~cenglish@p3');
  });

  it("use the civ's base owner's key unsuffixed (anyone else, player 1 included, gets @p<id>)", () => {
    expect(teamArtKey('k', 3, 3)).toBe('k');
    expect(teamArtKey('k', 1, 3)).toBe('k@p1');
    const base = ageArtKey('building_house', 'house', 2, 'english');
    expect(parseBuildingArtKey(teamArtKey(base, 3, 3))).toEqual({ baseKey: 'building_house', age: 2, civ: 'english', ageKey: base });
    expect(parseBuildingArtKey(teamArtKey(base, 1, 3))).toEqual({ baseKey: 'building_house', age: 2, civ: 'english', ageKey: base, playerId: 1 });
  });

  it('round-trip through the parser', () => {
    for (const civ of ['hungarian', 'english'] as const) {
      for (const age of [1, 2, 3] as const) {
        const base = ageArtKey('building_lumber_camp', 'lumber_camp', age, civ);
        expect(parseBuildingArtKey(base)).toEqual({ baseKey: 'building_lumber_camp', age, civ, ageKey: base });
        expect(parseBuildingArtKey(teamArtKey(base, 4))).toEqual({
          baseKey: 'building_lumber_camp',
          age,
          civ,
          ageKey: base,
          playerId: 4,
        });
      }
    }
  });

  it('parser rejects other keys', () => {
    for (const key of [
      'building_house',
      'building_house~a2',
      'building_house~a2@p3',
      'building_house~cmartian',
      wallPieceKey(5, 1, 'hungarian'),
      wonderStageKey(2, 'english'),
      'unit_villager~chungarian',
      'construction_3',
    ]) {
      expect(parseBuildingArtKey(key)).toBeUndefined();
    }
  });
});

describe('wall piece keys', () => {
  it('carry piece, age and civ', () => {
    expect(wallPieceKey(266, 1, 'hungarian')).toBe('building_wall~j266~a1~chungarian');
    expect(wallPieceKey(5, 3, 'english')).toBe('building_wall~j5~a3~cenglish');
  });

  it('round-trip through the parser', () => {
    expect(parseWallPieceKey(wallPieceKey(266, 2, 'english'))).toEqual({ age: 2, civ: 'english' });
    expect(parseWallPieceKey(wallPieceKey(0, 1, 'hungarian'))).toEqual({ age: 1, civ: 'hungarian' });
  });

  it('parser rejects other keys', () => {
    for (const key of ['building_wall~j5~a1', 'building_wall~a2~chungarian', 'building_wall~j5~a4~chungarian', 'building_wall~j5~a1~cfoo']) {
      expect(parseWallPieceKey(key)).toBeUndefined();
    }
  });
});

describe('wonder stage keys', () => {
  it('carry stage and civ, and round-trip', () => {
    expect(wonderStageKey(2, 'english')).toBe('building_wonder~s2~cenglish');
    expect(parseWonderStageKey(wonderStageKey(3, 'hungarian'))).toEqual({ stage: 3, civ: 'hungarian' });
    expect(parseWonderStageKey('building_wonder~s2')).toBeUndefined();
    expect(parseWonderStageKey('building_wonder~cenglish')).toBeUndefined();
  });
});

describe('unit art keys', () => {
  it('qualify the unit sheet with the civ', () => {
    expect(unitArtKey('unit_villager', 'hungarian')).toBe('unit_villager~chungarian');
    expect(unitArtKey('unit_knight', 'english')).toBe('unit_knight~cenglish');
  });
});

describe('parseCivArtKey', () => {
  it('finds the civ and group of every civ-qualified key', () => {
    expect(parseCivArtKey('building_house~a2~cenglish@p3')).toEqual({ civ: 'english', group: 'building_house~a2~cenglish', sharesNormals: true });
    expect(parseCivArtKey('unit_knight~chungarian#team')).toEqual({ civ: 'hungarian', group: 'unit_knight~chungarian', sharesNormals: true });
    expect(parseCivArtKey('unit_knight~chungarian#shadow')).toEqual({ civ: 'hungarian', group: 'unit_knight~chungarian', sharesNormals: false });
    expect(parseCivArtKey(wallPieceKey(5, 3, 'english'))).toEqual({ civ: 'english', group: wallPieceKey(5, 3, 'english'), sharesNormals: false });
    expect(parseCivArtKey(wonderStageKey(1, 'hungarian'))?.civ).toBe('hungarian');
  });

  it('ignores civ-independent and unknown-civ keys', () => {
    for (const key of ['building_house', 'construction_3', 'decor_trees', 'fx_glow', 'unit_knight~cmartian']) {
      expect(parseCivArtKey(key)).toBeUndefined();
    }
  });
});

describe('civArtGroupsInUse', () => {
  it('marks a whole group in use when any member is (albedo, team variant, mask or shadow alone)', () => {
    const groups = civArtGroupsInUse(['unit_knight~chungarian#shadow', 'building_house~a2~cenglish@p3', 'decor_trees']);
    expect(groups).toEqual(new Set(['unit_knight~chungarian', 'building_house~a2~cenglish']));
  });
});
