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
import { POLISH_M } from './polishMaterials';

const TYPES: readonly BaseUnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** One civ per other registered unit look (Hungarian, English and the M5 civs). */
const OTHER_LOOK_CIVS: readonly CivId[] = (() => {
  const seen = new Map<string, CivId>();
  for (const civ of CIV_IDS) {
    const look = CIV_DEFS[civ].unitLook;
    if (look !== CIV_DEFS.polish.unitLook && !seen.has(look)) seen.set(look, civ);
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

describe('Polish unit looks', () => {
  it('compares against every other registered look', () => {
    expect(OTHER_LOOK_CIVS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian', 'russian', 'finnish']));
    expect(OTHER_LOOK_CIVS).toHaveLength(8);
  });

  it('overrides every unit type with its own look', () => {
    for (const type of TYPES) {
      expect(unitLook(type, 'polish')).not.toBe(BASE_UNIT_LOOKS[type]);
      for (const civ of OTHER_LOOK_CIVS) expect(figureHash(type, 'polish'), `${type} vs ${civ}`).not.toBe(figureHash(type, civ));
    }
  });

  it.each([1, 2, 3] as AgeId[])('age %s: a unit of the age carries a silhouette cue no other look has', (age) => {
    const own = TYPES.filter((type) => UNIT_BALANCE[type].age === age).filter((type) => {
      const own_ = cues(unitLook(type, 'polish'));
      return own_.some((cue, k) => cue !== undefined && OTHER_LOOK_CIVS.every((civ) => cues(unitLook(type, civ))[k] !== cue));
    });
    expect(own.length).toBeGreaterThan(0);
  });

  it('carries the brief’s cues: Slavic helm and round shield (age 1), kapalin and eagle shield (age 2), szyszak and magierka (age 3)', () => {
    const human = (type: UnitType) => {
      const look = unitLook(type, 'polish');
      if (look.kind === 'cannon' || look.kind === 'ship' || look.kind === 'wagon') throw new Error('not a human');
      return look.human;
    };
    expect(human('swordsman').hat).toBe('slavHelm');
    expect(human('swordsman').shield).toBe('slavShield');
    expect(human('pikeman').hat).toBe('kapalin');
    expect(human('crossbowman').hat).toBe('kapalin');
    expect(human('knight').shield).toBe('eagleHeater');
    expect(human('cavalry').hat).toBe('szyszak');
    expect(human('musketeer').hat).toBe('magierka');
    expect(human('winged_hussar').hat).toBe('szyszak');
    expect(human('winged_hussar').back).toBe('hussarWings');
  });

  it('no other look wears the Polish hats, carries the Polish shields or the hussar wings', () => {
    const own = new Set<unknown>(['slavHelm', 'kapalin', 'szyszak', 'magierka', 'slavShield', 'eagleHeater', 'hussarWings']);
    for (const civ of OTHER_LOOK_CIVS) {
      for (const type of [...TYPES, CIV_DEFS[civ].uniqueUnit]) {
        const look = unitLook(type, civ);
        if (look.kind !== 'cannon' && look.kind !== 'ship' && look.kind !== 'wagon') expect(own.has(look.human.hat) || own.has(look.human.shield) || own.has(look.human.back), `${civ} ${type}`).toBe(false);
      }
    }
  });

  it.each(TYPES)('keeps team colour the dominant ownership cue: %s', (type) => {
    expect(teamCoverage(type, 'polish')).toBeGreaterThanOrEqual(teamCoverage(type, 'hungarian') * 0.8);
  });

  it.each(TYPES)('rasterizes in all painted headings: %s', (type) => {
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const px = idlePixels(type, 'polish', slot);
      let cov = 0;
      for (const c of px.coverage) cov += Math.min(1, c);
      expect(cov, `${type} heading ${slot}`).toBeGreaterThan(150);
    }
  });

  it('paints deterministically', () => {
    expect(figureHash('pikeman', 'polish')).toBe(figureHash('pikeman', 'polish'));
    expect(figureHash('winged_hussar', 'polish')).toBe(figureHash('winged_hussar', 'polish'));
  });

  it('casts the Polish gun in its own bronze', () => {
    const look = unitLook('cannon', 'polish');
    expect(look.kind === 'cannon' && look.barrel).toBe(POLISH_M.barrel);
  });
});

describe('Winged hussar wings', () => {
  /** Topmost painted row of the idle frame (pixels from the block top), over every painted heading. */
  function topRow(type: UnitType): number {
    let top = Infinity;
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const px = idlePixels(type, 'polish', slot);
      const w = sheetGeometry(type, 'polish').blocks.idle!.w;
      for (let k = 0; k < px.coverage.length; k++) if ((px.coverage[k] ?? 0) > 0.5) top = Math.min(top, Math.floor(k / w) - sheetGeometry(type, 'polish').blocks.idle!.feetY);
    }
    return top;
  }

  it('rise well above the szyszak of a plain cavalryman (the silhouette cue)', () => {
    expect(topRow('winged_hussar')).toBeLessThan(topRow('cavalry') - 5);
  });

  it('are painted in the wings’ own materials in every heading', () => {
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const fig = buildFigure('winged_hussar', 'polish', slot, 'idle', 0);
      expect(fig.mats.list).toContain(POLISH_M.wingFeather);
      expect(fig.mats.list).toContain(POLISH_M.wingFrame);
    }
  });
});
