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
import { OTTOMAN_M } from './ottomanMaterials';

const TYPES: readonly BaseUnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** One civ per other registered unit look (Hungarian, English and the M5 civs). */
const OTHER_LOOK_CIVS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  for (const civ of CIV_IDS) {
    const look = CIV_DEFS[civ].unitLook;
    if (look !== CIV_DEFS.ottoman.unitLook && !seen.has(look)) seen.set(look, civ);
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
  return look.kind === 'cannon' || look.kind === 'ship' || look.kind === 'wagon' ? [] : [look.human.hat, look.human.shield, look.human.weaponStyle];
}

describe('Ottoman unit looks', () => {
  it('compares against every other registered look', () => {
    expect(OTHER_LOOK_CIVS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish', 'polish']));
    expect(OTHER_LOOK_CIVS).toHaveLength(9);
  });

  it('overrides every unit type with its own look', () => {
    for (const type of TYPES) {
      expect(unitLook(type, 'ottoman')).not.toBe(BASE_UNIT_LOOKS[type]);
      for (const civ of OTHER_LOOK_CIVS) expect(figureHash(type, 'ottoman'), `${type} vs ${civ}`).not.toBe(figureHash(type, civ));
    }
  });

  it.each([1, 2, 3] as AgeId[])('age %s: a unit of the age carries a silhouette cue no other look has', (age) => {
    const own = TYPES.filter((type) => UNIT_BALANCE[type].age === age).filter((type) => {
      const own_ = cues(unitLook(type, 'ottoman'));
      return own_.some((cue, k) => cue !== undefined && OTHER_LOOK_CIVS.every((civ) => cues(unitLook(type, civ))[k] !== cue));
    });
    expect(own.length).toBeGreaterThan(0);
  });

  it('carries the brief’s cues: kranos and oval shield (age 1), turbaned spiked helm on knight and pikeman (age 2), börk on the musketeer (age 3), plumed börk and recurve bow on the janissary', () => {
    const human = (type: UnitType) => {
      const look = unitLook(type, 'ottoman');
      if (look.kind === 'cannon' || look.kind === 'ship' || look.kind === 'wagon') throw new Error('not a human');
      return look.human;
    };
    expect(human('swordsman').hat).toBe('kranos');
    expect(human('swordsman').shield).toBe('ovalShield');
    expect(human('knight').hat).toBe('turbanHelm');
    expect(human('pikeman').hat).toBe('turbanHelm');
    expect(human('musketeer').hat).toBe('bork');
    expect(human('janissary').hat).toBe('borkPlume');
    expect(human('janissary').weapon).toBe('bow');
    expect(human('janissary').weaponStyle).toBe('recurve');
    // On the archer's rig (a bow and a quiver), not the crossbowman's.
    expect(human('janissary').back).toBe(human('archer').back);
  });

  it('no other look wears the Ottoman hats, carries the oval shield or the recurve bow', () => {
    const own = new Set<unknown>(['kranos', 'turbanHelm', 'bork', 'borkPlume', 'takke', 'ovalShield', 'recurve']);
    for (const civ of OTHER_LOOK_CIVS) {
      for (const type of [...TYPES, CIV_DEFS[civ].uniqueUnit]) {
        const look = unitLook(type, civ);
        if (look.kind !== 'cannon' && look.kind !== 'ship' && look.kind !== 'wagon') expect(own.has(look.human.hat) || own.has(look.human.shield) || own.has(look.human.weaponStyle), `${civ} ${type}`).toBe(false);
      }
    }
  });

  it.each(TYPES)('keeps team colour the dominant ownership cue: %s', (type) => {
    expect(teamCoverage(type, 'ottoman')).toBeGreaterThanOrEqual(teamCoverage(type, 'hungarian') * 0.8);
  });

  it('the janissary keeps team colour the owner mark: the börk does not drown it (vs the Ottoman archer and crossbowman)', () => {
    const own = teamCoverage('janissary', 'ottoman');
    expect(own).toBeGreaterThanOrEqual(teamCoverage('archer', 'ottoman') * 0.8);
    expect(own).toBeGreaterThanOrEqual(teamCoverage('crossbowman', 'ottoman') * 0.8);
  });

  it.each(TYPES)('rasterizes in all painted headings: %s', (type) => {
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const px = idlePixels(type, 'ottoman', slot);
      let cov = 0;
      for (const c of px.coverage) cov += Math.min(1, c);
      expect(cov, `${type} heading ${slot}`).toBeGreaterThan(150);
    }
  });

  it('paints deterministically', () => {
    expect(figureHash('pikeman', 'ottoman')).toBe(figureHash('pikeman', 'ottoman'));
    expect(figureHash('janissary', 'ottoman')).toBe(figureHash('janissary', 'ottoman'));
  });

  it('casts the Ottoman gun in its own bronze', () => {
    const look = unitLook('cannon', 'ottoman');
    expect(look.kind === 'cannon' && look.barrel).toBe(OTTOMAN_M.barrel);
  });
});
