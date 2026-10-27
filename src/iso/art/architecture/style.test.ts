import { beforeAll, describe, expect, it } from 'vitest';
import type { BuildingType } from '../../../types';
import { buildingSeed } from '../buildings';
import { IsoPainter } from '../isoPainter';
import { hashPainting, installRecordingCanvas } from '../testing/recordingCanvas';
import { HUNGARIAN_BAROQUE, HUNGARIAN_MEDIEVAL, HUNGARIAN_ROMAN } from './hungarianStyles';
import { ARCH_FAMILIES, ARCH_STYLES } from './registry';
import { roofOf, type ArchStyle, type Ornaments, type RoofProfile } from './style';
import { styledGable } from './styledRoofs';
import type { BuildingArt } from './types';

const TEAM = 0x3b6fd6;
const STYLES: readonly ArchStyle[] = [HUNGARIAN_ROMAN, HUNGARIAN_MEDIEVAL, HUNGARIAN_BAROQUE];

function withRoof(s: ArchStyle, roof: Partial<RoofProfile>): ArchStyle {
  return { ...s, roof: { ...s.roof, ...roof } };
}

function without(s: ArchStyle, ornament: keyof Ornaments): ArchStyle {
  return { ...s, ornaments: { ...s.ornaments, [ornament]: false } };
}

function artOf(s: ArchStyle, type: BuildingType): BuildingArt {
  const art = ARCH_FAMILIES[s.family](s)[type];
  if (!art) throw new Error(`${s.id} has no ${type}`);
  return art;
}

function paint(s: ArchStyle, type: BuildingType): { hash: string; painter: IsoPainter } {
  const art = artOf(s, type);
  let painter: IsoPainter | null = null;
  const hash = hashPainting(() => {
    painter = new IsoPainter(art.size, art.size, art.maxHeight, 7);
    painter.windowLook = s.palette.window;
    art.paint(painter, TEAM);
    const r = painter.result(false);
    return { volume: r.volume, glows: r.glows, lights: r.lights, smoke: r.smoke };
  });
  if (!painter) throw new Error('not painted');
  return { hash, painter };
}

function result(s: ArchStyle, type: BuildingType) {
  return paint(s, type).painter.result(false);
}

type Pt = readonly [number, number];

/** Painter that also notes every roof (footprint area, top z) and every smoke anchor's z. */
class RoofProbe extends IsoPainter {
  readonly roofs: Array<{ area: number; top: number }> = [];
  readonly smokeZ: number[] = [];
  override recordRoof(u0: number, v0: number, u1: number, v1: number, eave: number, peaks: Pt[], top: number): void {
    this.roofs.push({ area: (u1 - u0) * (v1 - v0), top });
    super.recordRoof(u0, v0, u1, v1, eave, peaks, top);
  }
  override addSmoke(u: number, v: number, z: number): void {
    this.smokeZ.push(z);
    super.addSmoke(u, v, z);
  }
  painterVolumeZ(): number[] {
    return this.result(false).volume.map((v) => v.z);
  }
  /** Highest top of the main roof: roofs at least half the largest's footprint (a mansard's curb and upper hip). */
  mainRidge(): number {
    const largest = Math.max(...this.roofs.map((r) => r.area));
    if (!Number.isFinite(largest)) throw new Error('no roof');
    return Math.max(...this.roofs.filter((r) => r.area >= largest / 2).map((r) => r.top));
  }
}

function probe(s: ArchStyle, type: BuildingType): RoofProbe {
  const art = artOf(s, type);
  const p = new RoofProbe(art.size, art.size, art.maxHeight, 7);
  art.paint(p, TEAM);
  return p;
}

describe('ArchStyle', () => {
  beforeAll(() => installRecordingCanvas());

  it('paints every type of every family with forced roof forms, steep pitch and no ornaments', () => {
    for (const base of STYLES) {
      const bare = (Object.keys(base.ornaments) as Array<keyof Ornaments>).reduce(without, base);
      for (const form of ['hip', 'gable'] as const) {
        const s = withRoof({ ...bare, headroom: 60 }, { form, pitch: 1.6, eave: 1.5, material: 'slate' });
        const set = ARCH_FAMILIES[s.family](s);
        for (const [type, art] of Object.entries(set)) {
          expect(art.maxHeight, `${s.id} ${type}`).toBe(artOf(base, type as BuildingType).maxHeight + 60);
          expect(() => paint(s, type as BuildingType), `${s.id} ${type} ${form}`).not.toThrow();
        }
      }
    }
  });

  it('pitch raises the main roofs', () => {
    const top = (s: ArchStyle) => Math.max(...result(s, 'house').volume.map((v) => v.z));
    for (const base of STYLES) expect(top(withRoof(base, { pitch: 1.5 }))).toBeGreaterThan(top(base));
  });

  it('forcing a roof form changes the painting', () => {
    expect(paint(withRoof(HUNGARIAN_ROMAN, { form: 'hip' }), 'house').hash).not.toBe(paint(HUNGARIAN_ROMAN, 'house').hash);
    expect(paint(withRoof(HUNGARIAN_BAROQUE, { form: 'gable' }), 'house').hash).not.toBe(paint(HUNGARIAN_BAROQUE, 'house').hash);
  });

  it('chimneys off drops the domestic chimney smoke but keeps the forge stack', () => {
    expect(result(HUNGARIAN_ROMAN, 'house').smoke.length).toBe(1);
    expect(result(without(HUNGARIAN_ROMAN, 'chimneys'), 'house').smoke.length).toBe(0);
    expect(result(without(HUNGARIAN_ROMAN, 'chimneys'), 'blacksmith').smoke.length).toBe(1);
  });

  it('dormers off drops the dormer windows', () => {
    const glows = (s: ArchStyle) => result(s, 'town_center').glows.length;
    expect(glows(without(HUNGARIAN_BAROQUE, 'dormers'))).toBe(glows(HUNGARIAN_BAROQUE) - 5);
  });

  it('each ornament toggle changes the buildings that carry it', () => {
    const cases: Array<[ArchStyle, keyof Ornaments, BuildingType]> = [
      [HUNGARIAN_MEDIEVAL, 'halfTimber', 'town_center'],
      [HUNGARIAN_MEDIEVAL, 'boardedGables', 'house'],
      [HUNGARIAN_BAROQUE, 'pilasters', 'house'],
      [HUNGARIAN_BAROQUE, 'quoins', 'tower'],
      [HUNGARIAN_BAROQUE, 'quoins', 'foundry'],
    ];
    for (const [s, ornament, type] of cases) {
      expect(paint(without(s, ornament), type).hash, `${ornament} ${type}`).not.toBe(paint(s, type).hash);
    }
  });

  it('palette slots and the window look reach the painting', () => {
    const recoloured: ArchStyle = { ...HUNGARIAN_MEDIEVAL, palette: { ...HUNGARIAN_MEDIEVAL.palette, timber: 0x101010 } };
    expect(paint(recoloured, 'house').hash).not.toBe(paint(HUNGARIAN_MEDIEVAL, 'house').hash);
    const glazed: ArchStyle = {
      ...HUNGARIAN_ROMAN,
      palette: { ...HUNGARIAN_ROMAN.palette, window: { ...HUNGARIAN_ROMAN.palette.window, frame: 0xf2f2f2 } },
    };
    expect(paint(glazed, 'house').hash).not.toBe(paint(HUNGARIAN_ROMAN, 'house').hash);
  });

  it('roofOf uses the per-type roof, else the main roof', () => {
    expect(roofOf(HUNGARIAN_ROMAN, 'barracks')).toBe(0x9c3b28);
    expect(roofOf(HUNGARIAN_ROMAN, 'house')).toBe(HUNGARIAN_ROMAN.palette.roof);
  });

  it('the seed salt shifts the painter seed; Hungarian styles keep the M3 seed', () => {
    for (const s of STYLES) {
      expect(s.seedSalt).toBe(0);
      expect(buildingSeed('house', 2, s)).toBe('house'.length * 977 + 131);
    }
    expect(buildingSeed('house', 2, { ...HUNGARIAN_MEDIEVAL, seedSalt: 4099 })).toBe('house'.length * 977 + 131 + 4099);
  });

  it('chimney tops and smoke anchors clear the main ridge on steep roofs', () => {
    const cases: Array<[ArchStyle, BuildingType]> = [
      [HUNGARIAN_ROMAN, 'house'],
      [HUNGARIAN_ROMAN, 'blacksmith'],
      [HUNGARIAN_MEDIEVAL, 'house'],
      [HUNGARIAN_MEDIEVAL, 'blacksmith'],
      [HUNGARIAN_BAROQUE, 'town_center'],
      [HUNGARIAN_BAROQUE, 'house'],
      [HUNGARIAN_BAROQUE, 'blacksmith'],
      [HUNGARIAN_BAROQUE, 'foundry'],
    ];
    for (const pitch of [1, 1.6]) {
      for (const [base, type] of cases) {
        const p = probe(withRoof(base, { pitch }), type);
        expect(p.smokeZ.length, `${base.id} ${type}`).toBeGreaterThan(0);
        for (const z of p.smokeZ) expect(z, `${base.id} ${type} @${pitch}`).toBeGreaterThan(p.mainRidge());
      }
    }
  });

  it('roof-mounted extras ride on the roof: the stable cupola keeps its clearance at any pitch', () => {
    const clearance = (pitch: number) => {
      const p = probe(withRoof(HUNGARIAN_BAROQUE, { pitch }), 'stable');
      return Math.max(...p.painterVolumeZ()) - p.mainRidge();
    };
    expect(clearance(1.6)).toBeCloseTo(clearance(1), 6);
  });

  it('every registered style fits its canvas (headroom matches the pitch)', () => {
    for (const s of Object.values(ARCH_STYLES)) {
      for (const [type, art] of Object.entries(ARCH_FAMILIES[s.family](s))) {
        const top = Math.max(0, ...probe(s, type as BuildingType).painterVolumeZ());
        expect(top, `${s.id} ${type}`).toBeLessThanOrEqual(art.maxHeight);
      }
    }
  });

  it("a style's roof material covers only the wrapped roof (no leak into later roofs)", () => {
    const p = new IsoPainter(2, 2, 100, 1);
    p.material = 'shingle';
    styledGable(p, withRoof(HUNGARIAN_MEDIEVAL, { material: 'copper' }), 0.2, 0.2, 1.8, 1.8, 30, 30, 0x777777, 0xdddddd, 'u');
    expect(p.material).toBe('shingle');
  });
});
