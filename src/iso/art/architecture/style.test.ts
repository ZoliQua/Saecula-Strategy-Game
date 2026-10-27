import { beforeAll, describe, expect, it } from 'vitest';
import type { BuildingType } from '../../../types';
import { buildingSeed } from '../buildings';
import { IsoPainter } from '../isoPainter';
import { hashPainting, installRecordingCanvas } from '../recordingCanvas';
import { HUNGARIAN_BAROQUE, HUNGARIAN_MEDIEVAL, HUNGARIAN_ROMAN } from './hungarianStyles';
import { ARCH_FAMILIES } from './registry';
import { roofOf, type ArchStyle, type Ornaments, type RoofProfile } from './style';
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
});
