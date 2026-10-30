import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UNIT_BALANCE } from '../../../../config/balance';
import { CIV_DEFS, CIV_IDS } from '../../../../config/civs';
import type { AgeId, CivId, BaseUnitType, UnitType } from '../../../../types';
import { ANIM_FRAMES, PAINTED_HEADINGS } from '../layout';
import { BASE_UNIT_LOOKS, contactShadow, unitLook, type UnitLook } from '../looks';
import { FrameRaster } from '../raster';
import { buildFigure } from '../rig';
import { sheetGeometry } from '../sheet';
import { SPANISH_M } from './spanishMaterials';

const TYPES: readonly BaseUnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** One civ per other registered unit look (Hungarian, English, earlier M5 civs). */
const OTHER_LOOK_CIVS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  for (const civ of CIV_IDS) {
    const look = CIV_DEFS[civ].unitLook;
    if (look !== CIV_DEFS.spanish.unitLook && !seen.has(look)) seen.set(look, civ);
  }
  return [...seen.values()];
})();

function figureHash(type: UnitType, civ: CivId): string {
  const h = createHash('sha256');
  for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
    const fig = buildFigure(type, civ, slot, 'idle', 0);
    h.update(JSON.stringify(fig.prims));
    h.update(JSON.stringify(fig.mats.list));
  }
  return h.digest('hex');
}

function idlePixels(type: UnitType, civ: CivId, slot: number, i = 0) {
  const b = sheetGeometry(type, civ).blocks.idle;
  if (!b) throw new Error('no idle block');
  const fig = buildFigure(type, civ, slot, 'idle', i);
  return new FrameRaster(b.w, b.h, b.w / 2, b.feetY).paint(fig.prims, fig.mats.list, contactShadow(unitLook(type, civ)));
}

/** Team-mask coverage summed over every idle frame of every painted heading. */
function teamCoverage(type: UnitType, civ: CivId): number {
  let team = 0;
  for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
    for (let i = 0; i < ANIM_FRAMES.idle; i++) {
      const px = idlePixels(type, civ, slot, i);
      for (let k = 0; k < px.coverage.length; k++) team += (px.mask[k * 4 + 3] ?? 0) / 255;
    }
  }
  return team;
}

/** The silhouette cues of a look: headgear, shield and weapon style. */
function cues(look: UnitLook): readonly unknown[] {
  return look.kind === 'cannon' ? [] : [look.human.hat, look.human.shield, look.human.weaponStyle];
}

/** Opaque non-team albedo pixels that read as gold (the castle, gilt trim). */
function goldPixels(type: UnitType, civ: CivId): number {
  const px = idlePixels(type, civ, 0);
  let n = 0;
  for (let i = 0; i < px.coverage.length; i++) {
    const k = i * 4;
    const [r, g, b] = [px.albedo[k] ?? 0, px.albedo[k + 1] ?? 0, px.albedo[k + 2] ?? 0];
    if ((px.mask[k + 3] ?? 0) === 0 && (px.albedo[k + 3] ?? 0) > 200 && r > 150 && g > 110 && b < 110 && r - b > 80) n++;
  }
  return n;
}

describe('Spanish unit looks', () => {
  it('compares against every other registered look', () => {
    expect(OTHER_LOOK_CIVS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french']));
  });

  it('overrides every unit type with its own look', () => {
    for (const type of TYPES) {
      expect(unitLook(type, 'spanish')).not.toBe(BASE_UNIT_LOOKS[type]);
      for (const civ of OTHER_LOOK_CIVS) expect(figureHash(type, 'spanish'), `${type} vs ${civ}`).not.toBe(figureHash(type, civ));
    }
  });

  it.each([1, 2, 3] as AgeId[])('age %s: a unit of the age carries a silhouette cue no other look has', (age) => {
    const own = TYPES.filter((type) => UNIT_BALANCE[type].age === age).filter((type) => {
      const es = cues(unitLook(type, 'spanish'));
      return es.some((cue, k) => cue !== undefined && OTHER_LOOK_CIVS.every((civ) => cues(unitLook(type, civ))[k] !== cue));
    });
    expect(own.length).toBeGreaterThan(0);
  });

  it('carries the brief’s cues: caetra and falcata (age 1), heart-shaped adarga (age 2), crested morion (age 3)', () => {
    const human = (type: UnitType) => {
      const look = unitLook(type, 'spanish');
      if (look.kind === 'cannon') throw new Error('not a human');
      return look.human;
    };
    expect(human('swordsman').shield).toBe('caetra');
    expect(human('swordsman').weaponStyle).toBe('falcata');
    expect(human('knight').shield).toBe('adarga');
    expect(human('pikeman').shield).toBe('adarga');
    expect(human('musketeer').hat).toBe('morion');
    expect(human('pikeman').hat).toBe('morion');
  });

  it.each(TYPES)('keeps team colour the dominant ownership cue: %s', (type) => {
    expect(teamCoverage(type, 'spanish')).toBeGreaterThanOrEqual(teamCoverage(type, 'hungarian') * 0.8);
  });

  it.each(TYPES)('rasterizes in all painted headings: %s', (type) => {
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const px = idlePixels(type, 'spanish', slot);
      let cov = 0;
      for (const c of px.coverage) cov += Math.min(1, c);
      expect(cov, `${type} heading ${slot}`).toBeGreaterThan(150);
    }
  });

  it('bears the gold castle of Castile, outlined dark, on the knight’s adarga (outside the team mask)', () => {
    const fig = buildFigure('knight', 'spanish', 0, 'idle', 0);
    const gold = fig.mats.list.indexOf(SPANISH_M.castle);
    const edge = fig.mats.list.indexOf(SPANISH_M.castleEdge);
    expect(fig.prims.filter((prim) => prim.mat === gold).length).toBeGreaterThanOrEqual(4);
    expect(fig.prims.filter((prim) => prim.mat === edge).length).toBe(fig.prims.filter((prim) => prim.mat === gold).length);
    expect(goldPixels('knight', 'spanish')).toBeGreaterThan(goldPixels('knight', 'english') + 5);
  });

  it('paints deterministically', () => {
    expect(figureHash('pikeman', 'spanish')).toBe(figureHash('pikeman', 'spanish'));
  });

  it('casts the Spanish gun in its own bronze', () => {
    const look = unitLook('cannon', 'spanish');
    expect(look.kind === 'cannon' && look.barrel).toBe(SPANISH_M.barrel);
  });
});
