import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { CivId, BaseUnitType, UnitType } from '../../../../types';
import { Figure } from '../figure';
import { PAINTED_HEADINGS } from '../layout';
import { BASE_UNIT_LOOKS, contactShadow, unitLook } from '../looks';
import { FrameRaster } from '../raster';
import { buildFigure } from '../rig';
import { IDENTITY } from '../rigMath';
import { sheetGeometry } from '../sheet';
import { ENGLISH_M } from './englishMaterials';

const TYPES: readonly BaseUnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

function figureHash(type: UnitType, civ: CivId): string {
  const h = createHash('sha256');
  for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
    const fig = buildFigure(type, civ, slot, 'idle', 0);
    h.update(JSON.stringify(fig.prims));
    h.update(JSON.stringify(fig.mats.list));
  }
  return h.digest('hex');
}

function idlePixels(type: UnitType, civ: CivId, slot: number) {
  const b = sheetGeometry(type, civ).blocks.idle;
  if (!b) throw new Error('no idle block');
  const fig = buildFigure(type, civ, slot, 'idle', 0);
  return new FrameRaster(b.w, b.h, b.w / 2, b.feetY).paint(fig.prims, fig.mats.list, contactShadow(unitLook(type, civ)));
}

/** Share of the figure's coverage painted into the team mask, averaged over the painted headings. */
function teamShare(type: UnitType, civ: CivId): number {
  let sum = 0;
  for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
    const px = idlePixels(type, civ, slot);
    let cov = 0;
    let team = 0;
    for (let i = 0; i < px.coverage.length; i++) {
      cov += Math.min(1, px.coverage[i] ?? 0);
      team += (px.mask[i * 4 + 3] ?? 0) / 255;
    }
    sum += team / cov;
  }
  return sum / PAINTED_HEADINGS.length;
}

/** Opaque, non-team albedo pixels that read as St George red (strong red, little green / blue). */
function crossRedPixels(type: UnitType, civ: CivId): number {
  const px = idlePixels(type, civ, 0);
  let n = 0;
  for (let i = 0; i < px.coverage.length; i++) {
    const k = i * 4;
    const [r, g, b] = [px.albedo[k] ?? 0, px.albedo[k + 1] ?? 0, px.albedo[k + 2] ?? 0];
    if ((px.mask[k + 3] ?? 0) === 0 && (px.albedo[k + 3] ?? 0) > 200 && r > 120 && g < 60 && b < 60) n++;
  }
  return n;
}

describe('English unit looks', () => {
  it('overrides every unit type with its own look', () => {
    for (const type of TYPES) {
      expect(unitLook(type, 'english')).not.toBe(BASE_UNIT_LOOKS[type]);
      expect(figureHash(type, 'english')).not.toBe(figureHash(type, 'hungarian'));
    }
  });

  it('keeps the Hungarian (base) look for Hungarian units', () => {
    for (const type of TYPES) expect(unitLook(type, 'hungarian')).toBe(BASE_UNIT_LOOKS[type]);
  });

  it('paints deterministically', () => {
    expect(figureHash('knight', 'english')).toBe(figureHash('knight', 'english'));
  });

  it.each(TYPES)('keeps team colour the dominant ownership cue: %s', (type) => {
    const en = teamShare(type, 'english');
    const hu = teamShare(type, 'hungarian');
    expect(en).toBeGreaterThan(0.09);
    expect(en).toBeGreaterThanOrEqual(hu * 0.8);
  });

  it('bears St George red on the surcoats and shields (outside the team mask)', () => {
    for (const type of ['swordsman', 'pikeman', 'knight'] as const) {
      expect(crossRedPixels(type, 'english')).toBeGreaterThan(crossRedPixels(type, 'hungarian') + 4);
    }
  });

  it('gives the English archer a taller bow (visual only)', () => {
    const tall = (civ: CivId) => sheetGeometry('archer', civ).blocks.attack?.h ?? 0;
    expect(tall('english')).toBeGreaterThan(tall('hungarian'));
  });

  it('casts the English gun barrel in iron', () => {
    const look = unitLook('cannon', 'english');
    expect(look.kind === 'cannon' && look.barrel).toBe(ENGLISH_M.ironBarrel);
  });
});

describe('heraldic charge on an ellipsoid', () => {
  // A 20-px disc facing the viewer: local x (front) towards +z view, y across, z up.
  function paintDisc(material = ENGLISH_M.stGeorgeShield) {
    const fig = new Figure({ x: [0, 0, 1], y: [1, 0, 0], z: [0, 1, 0], t: [0, 0, 0] }, 1);
    fig.place(IDENTITY);
    fig.ellipsoid([0, 0, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [3, 20, 20], material);
    return new FrameRaster(60, 60, 30, 30).paint(fig.prims, fig.mats.list, { rx: 0, ry: 0, alpha: 0 });
  }
  const at = (px: ReturnType<typeof paintDisc>, x: number, y: number) => {
    const k = (y * 60 + x) * 4;
    return { r: px.albedo[k] ?? 0, g: px.albedo[k + 1] ?? 0, mask: px.mask[k + 3] ?? 0 };
  };

  it('paints the cross, the field and a team rim', () => {
    const px = paintDisc();
    // Cross arm (u = 0.62 → 4.8 px above the centre) and the upright through the centre.
    const arm = at(px, 22, 25);
    expect(arm.mask).toBe(0);
    expect(arm.r).toBeGreaterThan(arm.g * 2);
    // Field: off the cross, near the centre: light and not team.
    const field = at(px, 38, 38);
    expect(field.mask).toBe(0);
    expect(field.g).toBeGreaterThan(150);
    // Rim near the edge stays in the team mask.
    expect(at(px, 30, 48).mask).toBeGreaterThan(200);
  });

  it('frames the field with a dark edge just outside it (on the team rim), so the cross reads on a red team', () => {
    const px = paintDisc();
    // Field border at radius ≈ 15.7 px; the edge band lies outside it, before the team rim (radius 18).
    const edge = at(px, 30, 46);
    expect(edge.mask).toBe(0);
    expect(edge.r).toBeLessThan(90);
    expect(edge.g).toBeLessThan(90);
    // Inside the field the upright is still cross-red right up to the border.
    const upright = at(px, 30, 44);
    expect(upright.r).toBeGreaterThan(upright.g * 2);
  });

  it('keeps the surcoat chest a full "+": the edge never eats the field or the arm', () => {
    const px = paintDisc(ENGLISH_M.surcoat);
    // Arm (u = 0.72, ≈ 9 px above the centre), off the upright: cross-red, not team.
    const arm = at(px, 35, 21);
    expect(arm.mask).toBe(0);
    expect(arm.r).toBeGreaterThan(arm.g * 2);
    // Field just inside the panel border (across 0.35 of 0.4): white, not dark.
    const field = at(px, 37, 30);
    expect(field.mask).toBe(0);
    expect(field.g).toBeGreaterThan(150);
    // Just outside the panel (the first pixel past across 0.4): the dark edge on what was team cloth.
    const edge = at(px, 38, 30);
    expect(edge.mask).toBe(0);
    expect(edge.g).toBeLessThan(90);
    // Further out the cloth is team colour again.
    expect(at(px, 40, 30).mask).toBeGreaterThan(200);
  });
});
