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
import { RUSSIAN_M } from './russianMaterials';

const TYPES: readonly UnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** One civ per other registered unit look (Hungarian, English, earlier M5 civs). */
const OTHER_LOOK_CIVS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  for (const civ of CIV_IDS) {
    const look = CIV_DEFS[civ].unitLook;
    if (look !== CIV_DEFS.russian.unitLook && !seen.has(look)) seen.set(look, civ);
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

describe('Russian unit looks', () => {
  it('compares against every other registered look', () => {
    expect(OTHER_LOOK_CIVS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian']));
  });

  it('overrides every unit type with its own look', () => {
    for (const type of TYPES) {
      expect(unitLook(type, 'russian')).not.toBe(BASE_UNIT_LOOKS[type]);
      for (const civ of OTHER_LOOK_CIVS) expect(figureHash(type, 'russian'), `${type} vs ${civ}`).not.toBe(figureHash(type, civ));
    }
  });

  it.each([1, 2, 3] as AgeId[])('age %s: a unit of the age carries a silhouette cue no other look has', (age) => {
    const own = TYPES.filter((type) => UNIT_BALANCE[type].age === age).filter((type) => {
      const own_ = cues(unitLook(type, 'russian'));
      return own_.some((cue, k) => cue !== undefined && OTHER_LOOK_CIVS.every((civ) => cues(unitLook(type, civ))[k] !== cue));
    });
    expect(own.length).toBeGreaterThan(0);
  });

  it('carries the brief’s cues: shelom (age 1), shishak and teardrop shield (age 2), kolpak and berdysh (age 3)', () => {
    const human = (type: UnitType) => {
      const look = unitLook(type, 'russian');
      if (look.kind === 'cannon') throw new Error('not a human');
      return look.human;
    };
    expect(human('swordsman').hat).toBe('shelom');
    expect(human('scout').hat).toBe('shelom');
    expect(human('knight').hat).toBe('shishak');
    expect(human('pikeman').hat).toBe('shishak');
    expect(human('knight').shield).toBe('teardropShield');
    expect(human('musketeer').hat).toBe('kolpak');
    expect(human('musketeer').back).toBe('berdysh');
    expect(human('cavalry').hat).toBe('kolpak');
  });

  it('gives the Streltsy musketeer a long kaftan skirt', () => {
    const look = unitLook('musketeer', 'russian');
    const base = BASE_UNIT_LOOKS.musketeer;
    if (look.kind === 'cannon' || base.kind === 'cannon') throw new Error('not a human');
    expect(look.human.skirt?.length ?? 0).toBeGreaterThan(base.human.skirt?.length ?? 0);
  });

  it('no other look carries the berdysh', () => {
    for (const civ of OTHER_LOOK_CIVS) {
      for (const type of TYPES) {
        const look = unitLook(type, civ);
        if (look.kind !== 'cannon') expect(look.human.back, `${civ} ${type}`).not.toBe('berdysh');
      }
    }
  });

  it.each(TYPES)('keeps team colour the dominant ownership cue: %s', (type) => {
    expect(teamCoverage(type, 'russian')).toBeGreaterThanOrEqual(teamCoverage(type, 'hungarian') * 0.8);
  });

  it.each(TYPES)('rasterizes in all painted headings: %s', (type) => {
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const px = idlePixels(type, 'russian', slot);
      let cov = 0;
      for (const c of px.coverage) cov += Math.min(1, c);
      expect(cov, `${type} heading ${slot}`).toBeGreaterThan(150);
    }
  });

  it.each(['knight', 'swordsman'] as const)('outlines the saltire badge dark on the %s', (type) => {
    const fig = buildFigure(type, 'russian', 0, 'idle', 0);
    const count = (mat: (typeof RUSSIAN_M)[keyof typeof RUSSIAN_M]) => fig.prims.filter((prim) => prim.mat === fig.mats.list.indexOf(mat)).length;
    expect(count(RUSSIAN_M.saltireEdge)).toBe(1);
    expect(count(RUSSIAN_M.saltireWhite)).toBe(1);
    expect(count(RUSSIAN_M.saltireBlue)).toBe(2);
  });

  it('paints deterministically', () => {
    expect(figureHash('pikeman', 'russian')).toBe(figureHash('pikeman', 'russian'));
  });

  it('casts the Russian gun in its own bronze', () => {
    const look = unitLook('cannon', 'russian');
    expect(look.kind === 'cannon' && look.barrel).toBe(RUSSIAN_M.barrel);
  });
});
