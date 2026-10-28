import { describe, expect, it } from 'vitest';
import type { Entity } from '../../ecs/components';
import { wonderStage } from '../../iso/art/architecture/wonder';
import type { AgeId, BuildingType, CivId } from '../../types';
import { restoredBuildingArt } from './restoredArt';

const AGES = new Map<number, AgeId>([[1, 1], [2, 3], [3, 2]]);
const CIVS = new Map<number, CivId>([[1, 'hungarian'], [2, 'english'], [3, 'english']]);
const ageOf = (id: number): AgeId => AGES.get(id) ?? 1;
const civOf = (id: number): CivId => CIVS.get(id) ?? 'hungarian';

function building(type: BuildingType, owner: number, extra: Partial<Entity> = {}): Entity {
  return { building: { type, footprint: { width: 2, height: 2 } }, owner: { playerId: owner }, position: { tx: 0, ty: 0 }, ...extra } as Entity;
}

describe('restoredBuildingArt', () => {
  it('one job per distinct (type, owner age style, owner, civ) of standing buildings and sites', () => {
    const jobs = restoredBuildingArt(
      [
        building('house', 2),
        building('house', 2),
        building('house', 3),
        building('barracks', 1, { underConstruction: { totalTime: 30, elapsed: 3 } }),
        building('town_center', 1),
      ],
      ageOf,
      civOf,
    );
    expect(jobs).toEqual([
      { kind: 'building', type: 'house', age: 3, owner: 2, civ: 'english' },
      { kind: 'building', type: 'house', age: 2, owner: 3, civ: 'english' },
      { kind: 'building', type: 'barracks', age: 1, owner: 1, civ: 'hungarian' },
      { kind: 'building', type: 'town_center', age: 1, owner: 1, civ: 'hungarian' },
    ]);
  });

  it('skips walls (the wall plan paints them), dying buildings and non-buildings', () => {
    const jobs = restoredBuildingArt(
      [building('wall', 2), building('house', 2, { dying: { ttlMs: 500 } }), { position: { tx: 1, ty: 1 }, owner: { playerId: 2 } } as Entity],
      ageOf,
      civOf,
    );
    expect(jobs).toEqual([]);
  });

  it('a Wonder under construction needs its scaffolding stage; a finished one its age style', () => {
    const uc = { totalTime: 100, elapsed: 60 };
    const jobs = restoredBuildingArt([building('wonder', 2, { underConstruction: uc }), building('wonder', 3)], ageOf, civOf);
    expect(jobs).toEqual([
      { kind: 'wonderStage', stage: wonderStage(0.6), civ: 'english' },
      { kind: 'building', type: 'wonder', age: 2, owner: 3, civ: 'english' },
    ]);
  });

  it('a building with a minimum style age shows at least that age', () => {
    const jobs = restoredBuildingArt([building('house', 1, { building: { type: 'house', footprint: { width: 2, height: 2 }, minStyleAge: 2 } } as Partial<Entity>)], ageOf, civOf);
    expect(jobs).toEqual([{ kind: 'building', type: 'house', age: 2, owner: 1, civ: 'hungarian' }]);
  });
});
