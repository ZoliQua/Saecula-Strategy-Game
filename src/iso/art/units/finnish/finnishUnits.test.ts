import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UNIT_BALANCE } from '../../../../config/balance';
import { CIV_DEFS, CIV_IDS } from '../../../../config/civs';
import type { AgeId, CivId, UnitType } from '../../../../types';
import { ANIM_FRAMES, PAINTED_HEADINGS } from '../layout';
import { BASE_UNIT_LOOKS, contactShadow, unitLook, type UnitLook } from '../looks';
import { FrameRaster } from '../raster';
import { buildFigure } from '../rig';
import { sheetGeometry } from '../sheet';
import { FINNISH_M } from './finnishMaterials';

const TYPES: readonly UnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** One civ per other registered unit look (Hungarian, English and the other M5 civs). */
const OTHER_LOOK_CIVS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  for (const civ of CIV_IDS) {
    const look = CIV_DEFS[civ].unitLook;
    if (look !== CIV_DEFS.finnish.unitLook && !seen.has(look)) seen.set(look, civ);
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

describe('Finnish unit looks', () => {
  it('compares against every other registered look', () => {
    expect(OTHER_LOOK_CIVS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian']));
    expect(OTHER_LOOK_CIVS).toHaveLength(7);
  });

  it('overrides every unit type with its own look', () => {
    for (const type of TYPES) {
      expect(unitLook(type, 'finnish')).not.toBe(BASE_UNIT_LOOKS[type]);
      for (const civ of OTHER_LOOK_CIVS) expect(figureHash(type, 'finnish'), `${type} vs ${civ}`).not.toBe(figureHash(type, civ));
    }
  });

  it.each([1, 2, 3] as AgeId[])('age %s: a unit of the age carries a silhouette cue no other look has', (age) => {
    const own = TYPES.filter((type) => UNIT_BALANCE[type].age === age).filter((type) => {
      const own_ = cues(unitLook(type, 'finnish'));
      return own_.some((cue, k) => cue !== undefined && OTHER_LOOK_CIVS.every((civ) => cues(unitLook(type, civ))[k] !== cue));
    });
    expect(own.length).toBeGreaterThan(0);
  });

  it('carries the brief’s cues: fur cap and round shield (age 1), nasal helm and cross shield (age 2), lobster-pot and karvalakki (age 3)', () => {
    const human = (type: UnitType) => {
      const look = unitLook(type, 'finnish');
      if (look.kind === 'cannon') throw new Error('not a human');
      return look.human;
    };
    expect(human('swordsman').hat).toBe('furCap');
    expect(human('swordsman').shield).toBe('limeShield');
    expect(human('scout').hat).toBe('furCap');
    expect(human('pikeman').hat).toBe('nasalHelm');
    expect(human('knight').hat).toBe('nasalHelm');
    expect(human('knight').shield).toBe('crossShield');
    expect(human('cavalry').hat).toBe('lobsterPot');
    expect(human('musketeer').hat).toBe('karvalakki');
  });

  it('no other look wears the Finnish hats or carries the Finnish shields', () => {
    const own = new Set<unknown>(['furCap', 'nasalHelm', 'lobsterPot', 'karvalakki', 'limeShield', 'crossShield']);
    for (const civ of OTHER_LOOK_CIVS) {
      for (const type of TYPES) {
        const look = unitLook(type, civ);
        if (look.kind !== 'cannon') expect(own.has(look.human.hat) || own.has(look.human.shield), `${civ} ${type}`).toBe(false);
      }
    }
  });

  it.each(TYPES)('keeps team colour the dominant ownership cue: %s', (type) => {
    expect(teamCoverage(type, 'finnish')).toBeGreaterThanOrEqual(teamCoverage(type, 'hungarian') * 0.8);
  });

  it.each(TYPES)('rasterizes in all painted headings: %s', (type) => {
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const px = idlePixels(type, 'finnish', slot);
      let cov = 0;
      for (const c of px.coverage) cov += Math.min(1, c);
      expect(cov, `${type} heading ${slot}`).toBeGreaterThan(150);
    }
  });

  it('outlines the Nordic cross field dark on the knight’s shield', () => {
    const charge = FINNISH_M.crossShield.charge;
    expect(charge?.edge).toBe(FINNISH_M.crossEdge.color);
    expect(charge?.edgeWidth ?? 0).toBeGreaterThan(0);
    expect(charge?.front ?? 0).toBeGreaterThan(0.5);
    const fig = buildFigure('knight', 'finnish', 0, 'idle', 0);
    expect(fig.mats.list).toContain(FINNISH_M.crossShield);
  });

  it('paints deterministically', () => {
    expect(figureHash('pikeman', 'finnish')).toBe(figureHash('pikeman', 'finnish'));
  });

  it('casts the Finnish gun in its own iron', () => {
    const look = unitLook('cannon', 'finnish');
    expect(look.kind === 'cannon' && look.barrel).toBe(FINNISH_M.barrel);
  });
});
