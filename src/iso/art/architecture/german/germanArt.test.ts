import { beforeAll, describe, expect, it } from 'vitest';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../canvas';
import type { AgeId, BuildingType } from '../../../../types';
import { paintBuilding, paintWonderStage } from '../../buildings';
import type { LitArt } from '../../lighting/normalLayer';
import { css } from '../../palette';
import { canonicalColor, hashPainting, installRecordingCanvas, type RecordedCanvas } from '../../testing/recordingCanvas.testkit';
import { trimLitArt } from '../../trimArt';
import { CHARGES } from '../charges';
import { ARCH_FAMILIES, ARCH_STYLES } from '../registry';
import { WONDER_STAGES } from '../wonder';
import { GERMAN_BACKSTEIN, GERMAN_FACHWERK, GERMAN_LIMES } from './germanStyles';

const TEAM = 0x3b6fd6;
const AGES: readonly AgeId[] = [1, 2, 3];
const TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range',
  'stable', 'blacksmith', 'foundry', 'tower', 'wall', 'wonder',
];

/** Canvases created while `paint` runs (their draw logs), plus its result. */
function recorded<T>(paint: () => T): { out: T; canvases: RecordedCanvas[] } {
  const doc = (globalThis as { document: { createElement: (tag: string) => unknown } }).document;
  const make = doc.createElement;
  const canvases: RecordedCanvas[] = [];
  doc.createElement = (tag: string) => {
    const el = make(tag);
    if (tag === 'canvas') canvases.push(el as RecordedCanvas);
    return el;
  };
  try {
    return { out: paint(), canvases };
  } finally {
    doc.createElement = make;
  }
}

const [TR, TG, TB] = [(TEAM >> 16) & 255, (TEAM >> 8) & 255, TEAM & 255];

/** A logged fill (fillStyle or gradient stop) in the team css or a shade of it (palette shade() scales the channels). */
function isTeamFill(line: string): boolean {
  if (line.includes(`"${canonicalColor(css(TEAM))}"`)) return true;
  const m = /"rgba?\((\d+),(\d+),(\d+)/.exec(line);
  if (!m) return false;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return b > 40 && Math.abs(r / b - TR / TB) < 0.025 && Math.abs(g / b - TG / TB) < 0.025;
}

/** Every glow, volume top and smoke anchor of trimmed art, in canvas px; out-of-canvas ones are reported. */
function strays(art: LitArt): string[] {
  const { art: t, rect } = trimLitArt(art);
  const w = rect.width;
  const h = rect.height;
  const cx = art.canvas.width / 2 - rect.left;
  const by = art.canvas.height - BUILDING_BOTTOM_PAD - rect.top;
  const out: string[] = [];
  const check = (what: string, x: number, y: number) => {
    if (!(x >= 0 && x <= w && y >= 0 && y <= h)) out.push(`${what} (${x.toFixed(1)}, ${y.toFixed(1)}) outside ${w}x${h}`);
  };
  for (const g of t.glows) check('glow', g.x, g.y);
  for (const v of t.volume) check('volume', v.gx, v.gy - v.z);
  for (const [dx, dy] of t.smoke) check('smoke', cx + dx * ART_SCALE, by + dy * ART_SCALE);
  // Anchors sit on the painted art: none above the tallest solid.
  const top = Math.min(...t.volume.map((v) => v.gy - v.z));
  for (const g of t.glows) if (g.y < top - 2) out.push(`glow above the art at ${g.y.toFixed(1)}`);
  return out;
}

describe('German architecture (Limes, Fachwerk, Backstein, Kaiserdom)', () => {
  beforeAll(() => installRecordingCanvas());

  it('registers the three German styles on their families', () => {
    expect(ARCH_STYLES.limes).toBe(GERMAN_LIMES);
    expect(ARCH_STYLES.fachwerk).toBe(GERMAN_FACHWERK);
    expect(ARCH_STYLES.backstein).toBe(GERMAN_BACKSTEIN);
    for (const s of [GERMAN_LIMES, GERMAN_FACHWERK, GERMAN_BACKSTEIN]) {
      expect(s.seedSalt, s.id).not.toBe(0);
      expect(s.charge).toBe('eagle');
      expect(Object.keys(ARCH_FAMILIES)).toContain(s.family);
    }
    expect(CHARGES.eagle).toBeTypeOf('function');
  });

  it('seed salts are unique across every registered style', () => {
    const salts = Object.values(ARCH_STYLES).map((s) => s.seedSalt).filter((x) => x !== 0);
    expect(new Set(salts).size).toBe(salts.length);
  });

  describe.each(AGES)('age %s', (age) => {
    it.each(TYPES)('%s paints, fits its canvas and keeps its anchors inside after the trim', (type) => {
      const art = paintBuilding(type, TEAM, age, 'german', false);
      // The Roman family's farm is a flat field (no solid, no cast shadow).
      if (!(type === 'farm' && age === 1)) expect(art.volume.length).toBeGreaterThan(0);
      expect(strays(art)).toEqual([]);
    });

    // Walls carry the team as a banner overlay on their posts (paintWall.ts), not in the texture.
    it.each(TYPES.filter((t) => t !== 'wall'))('%s shows the team colour', (type) => {
      const { canvases } = recorded(() => paintBuilding(type, TEAM, age, 'german', false));
      const fills = canvases.flatMap((c) => c.log).filter((l) => l.startsWith('set fillStyle(') || l.includes('.stop('));
      expect(fills.some(isTeamFill), type).toBe(true);
    });

    it('lights the town centre and the house at dusk', () => {
      for (const type of ['town_center', 'house'] as const) expect(paintBuilding(type, TEAM, age, 'german', false).glows.length, type).toBeGreaterThan(0);
    });
  });

  it('every Wonder stage and the finished Kaiserdom paint, rise in turn and stay inside the trimmed canvas', () => {
    const stages = Array.from({ length: WONDER_STAGES }, (_, i) => paintWonderStage(i + 1, 'german'));
    const done = paintBuilding('wonder', TEAM, 3, 'german', false);
    const top = (a: LitArt) => Math.max(...a.volume.map((v) => v.z));
    for (const a of [...stages, done]) expect(strays(a)).toEqual([]);
    for (let i = 1; i < stages.length; i++) expect(top(stages[i]!)).toBeGreaterThan(top(stages[i - 1]!));
    expect(top(done)).toBeGreaterThan(top(stages[stages.length - 1]!));
    expect(new Set([...stages, done].map((a) => hashPainting(() => a.volume))).size).toBe(WONDER_STAGES + 1);
    expect(done.glows.length).toBeGreaterThan(10);
  });

  it('the finished Kaiserdom glows no more than the English cathedral does (no glows on windows hidden behind later blocks)', () => {
    const de = paintBuilding('wonder', TEAM, 3, 'german', false).glows.length;
    const en = paintBuilding('wonder', TEAM, 3, 'english', false).glows.length;
    expect(de).toBeLessThanOrEqual(Math.round(en * 1.3));
  });

  it('is not the Hungarian or the English art in any age (town centre and house)', () => {
    for (const age of AGES) {
      for (const type of ['town_center', 'house'] as const) {
        const de = hashPainting(() => paintBuilding(type, TEAM, age, 'german', false).volume);
        for (const civ of ['hungarian', 'english'] as const) {
          expect(de, `${type} age ${age} vs ${civ}`).not.toBe(hashPainting(() => paintBuilding(type, TEAM, age, civ, false).volume));
        }
      }
    }
  });
});
