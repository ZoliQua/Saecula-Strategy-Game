import { describe, expect, it } from 'vitest';
import { CIV_DEFS, CIV_IDS } from '../../../config/civs';
import { baseUnitType, civUnitTypes } from '../../../game/civUnits';
import type { CivId, UnitType } from '../../../types';
import { ANIM_FRAMES, PAINTED_HEADINGS } from './layout';
import { BASE_UNIT_LOOKS, contactShadow, LOOK_OVERRIDES, unitLook, type UnitLook } from './looks';
import { FrameRaster } from './raster';
import { buildFigure } from './rig';
import { sheetGeometry } from './sheet';

/*
 * Unique unit art (M8 Tasks 5 and 5b): every civ's unique unit wears its own
 * look, posed like the base unit it replaces (same kind), reads apart
 * from the civ's other units by its headgear, keeps team colour as the
 * owner mark, and its sheet stays within +15 % of the base unit's.
 */

const uniqueOf = (civ: CivId): UnitType => CIV_DEFS[civ].uniqueUnit;

function human(look: UnitLook) {
  if (look.kind === 'cannon') throw new Error('not a human');
  return look.human;
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

const sheetArea = (type: UnitType, civ: CivId): number => {
  const g = sheetGeometry(type, civ);
  return g.width * g.height;
};

describe('unique unit looks', () => {
  it.each(CIV_IDS)('%s: the unique unit has its own look, of the base unit’s kind', (civ) => {
    const type = uniqueOf(civ);
    const look = LOOK_OVERRIDES[CIV_DEFS[civ].unitLook][type];
    expect(look).toBeDefined();
    expect(look?.kind).toBe(BASE_UNIT_LOOKS[baseUnitType(type)].kind);
    expect(unitLook(type, civ)).toBe(look);
  });

  it.each(CIV_IDS)('%s: the unique unit’s headgear is worn by none of the civ’s other units', (civ) => {
    const type = uniqueOf(civ);
    const hat = human(unitLook(type, civ)).hat;
    for (const other of civUnitTypes(civ)) {
      if (other === type || other === 'cannon') continue;
      expect(human(unitLook(other, civ)).hat, `${type} vs ${other}`).not.toBe(hat);
    }
  });

  it.each(CIV_IDS)('%s: keeps team colour the owner mark (vs the base unit it replaces)', (civ) => {
    const type = uniqueOf(civ);
    expect(teamCoverage(type, civ)).toBeGreaterThanOrEqual(teamCoverage(baseUnitType(type), civ) * 0.8);
  });

  it.each(CIV_IDS)('%s: the sheet stays within +15 %% of the base unit it replaces', (civ) => {
    const type = uniqueOf(civ);
    expect(sheetArea(type, civ)).toBeLessThanOrEqual(sheetArea(baseUnitType(type), civ) * 1.15);
  });

  it.each(CIV_IDS)('%s: rasterizes in all painted headings', (civ) => {
    const type = uniqueOf(civ);
    for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
      const px = idlePixels(type, civ, slot);
      let cov = 0;
      for (const c of px.coverage) cov += Math.min(1, c);
      expect(cov, `heading ${slot}`).toBeGreaterThan(150);
    }
  });
});
