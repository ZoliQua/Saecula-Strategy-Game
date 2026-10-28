import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_DEFS, CIV_IDS } from '../../../../config/civs';
import { ART_SCALE, BUILDING_BOTTOM_PAD } from '../../canvas';
import type { AgeId, BuildingType, CivId } from '../../../../types';
import { paintBuilding, paintWonderStage } from '../../buildings';
import type { LitArt } from '../../lighting/normalLayer';
import { css } from '../../palette';
import { canonicalColor, hashPainting, installRecordingCanvas, type RecordedCanvas } from '../../testing/recordingCanvas.testkit';
import { trimLitArt } from '../../trimArt';
import { CHARGES } from '../charges';
import { ARCH_FAMILIES, ARCH_STYLES } from '../registry';
import { WONDER_STAGES } from '../wonder';
import { RUSSIAN_GORD, RUSSIAN_MUSCOVY, RUSSIAN_PETRINE } from './russianStyles';

const CIV: CivId = 'russian';
const TEAM = 0x3b6fd6;
const AGES: readonly AgeId[] = [1, 2, 3];
const TYPES: readonly BuildingType[] = [
  'town_center', 'house', 'farm', 'lumber_camp', 'mining_camp', 'barracks', 'archery_range',
  'stable', 'blacksmith', 'foundry', 'tower', 'wall', 'wonder',
];

/**
 * The other civs with architecture of their own (from CIV_DEFS, not a
 * hand-written list): one civ per distinct age-style set, so the civs
 * still on the Hungarian stub count once, as Hungarian.
 */
const OTHERS: readonly CivId[] = (() => {
  const seen = new Set<string>();
  return CIV_IDS.filter((civ) => {
    const key = JSON.stringify(CIV_DEFS[civ].architecture);
    if (civ === CIV || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();

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

describe('Russian architecture (log gorod, Muscovy, Petrine, St Basil)', () => {
  beforeAll(() => installRecordingCanvas());

  it('compares against every other civ with its own architecture', () => {
    expect(OTHERS).toEqual(expect.arrayContaining(['hungarian', 'english', 'german', 'french', 'spanish', 'italian']));
  });

  it('registers the three Russian styles on their families', () => {
    expect(ARCH_STYLES.rus_gord).toBe(RUSSIAN_GORD);
    expect(ARCH_STYLES.muscovy).toBe(RUSSIAN_MUSCOVY);
    expect(ARCH_STYLES.petrine).toBe(RUSSIAN_PETRINE);
    expect(RUSSIAN_GORD.family).toBe('izba');
    expect(RUSSIAN_MUSCOVY.family).toBe('izba');
    expect(RUSSIAN_PETRINE.family).toBe('petrine');
    for (const s of [RUSSIAN_GORD, RUSSIAN_MUSCOVY, RUSSIAN_PETRINE]) {
      expect(s.seedSalt, s.id).not.toBe(0);
      expect(s.charge).toBe('saltire');
      expect(Object.keys(ARCH_FAMILIES)).toContain(s.family);
    }
    expect(CHARGES.saltire).toBeTypeOf('function');
    expect(CIV_DEFS.russian.architecture).toEqual({ 1: 'rus_gord', 2: 'muscovy', 3: 'petrine' });
  });

  it('seed salts are unique across every registered style', () => {
    const salts = Object.values(ARCH_STYLES).map((s) => s.seedSalt).filter((x) => x !== 0);
    expect(new Set(salts).size).toBe(salts.length);
  });

  describe.each(AGES)('age %s', (age) => {
    it.each(TYPES)('%s paints, fits its canvas and keeps its anchors inside after the trim', (type) => {
      const art = paintBuilding(type, TEAM, age, CIV, false);
      expect(art.volume.length).toBeGreaterThan(0);
      expect(strays(art)).toEqual([]);
    });

    // Walls carry the team as a banner overlay on their posts (paintWall.ts), not in the texture.
    it.each(TYPES.filter((t) => t !== 'wall'))('%s shows the team colour', (type) => {
      const { canvases } = recorded(() => paintBuilding(type, TEAM, age, CIV, false));
      const fills = canvases.flatMap((c) => c.log).filter((l) => l.startsWith('set fillStyle(') || l.includes('.stop('));
      expect(fills.some(isTeamFill), type).toBe(true);
    });

    it('lights the town centre and the house at dusk', () => {
      for (const type of ['town_center', 'house'] as const) expect(paintBuilding(type, TEAM, age, CIV, false).glows.length, type).toBeGreaterThan(0);
    });
  });

  it('every Wonder stage and the finished cathedral paint, rise in turn and stay inside the trimmed canvas', () => {
    const stages = Array.from({ length: WONDER_STAGES }, (_, i) => paintWonderStage(i + 1, CIV));
    const done = paintBuilding('wonder', TEAM, 3, CIV, false);
    const top = (a: LitArt) => Math.max(...a.volume.map((v) => v.z));
    for (const a of [...stages, done]) expect(strays(a)).toEqual([]);
    for (let i = 1; i < stages.length; i++) expect(top(stages[i]!)).toBeGreaterThan(top(stages[i - 1]!));
    expect(top(done)).toBeGreaterThanOrEqual(top(stages[stages.length - 1]!));
    expect(new Set([...stages, done].map((a) => hashPainting(() => a.volume))).size).toBe(WONDER_STAGES + 1);
    expect(done.glows.length).toBeGreaterThan(10);
  });

  // Glows are lit windows that show: windows behind later blocks, porch roofs or parapets record none (Task 3 I3, Task 5 I1).
  it.each(AGES)('no type glows more than 1.3x the busiest other-civ building of its type in age %s', (age) => {
    const over: string[] = [];
    for (const type of TYPES.filter((t) => t !== 'wall')) {
      const rus = paintBuilding(type, TEAM, age, CIV, false).glows.length;
      const ref = Math.max(...OTHERS.map((civ) => paintBuilding(type, TEAM, age, civ, false).glows.length));
      const cap = Math.max(3, Math.round(ref * 1.3));
      if (rus > cap) over.push(`${type}: ${rus} > ${cap}`);
    }
    expect(over).toEqual([]);
  });

  it('is no other civ’s art in any age (every type, by shadow volume)', () => {
    for (const age of AGES) {
      for (const type of TYPES.filter((t) => t !== 'wall')) {
        const rus = hashPainting(() => paintBuilding(type, TEAM, age, CIV, false).volume);
        for (const civ of OTHERS) {
          expect(rus, `${type} age ${age} vs ${civ}`).not.toBe(hashPainting(() => paintBuilding(type, TEAM, age, civ, false).volume));
        }
      }
    }
  });

  it('every age reads differently from the one before (town centre, house, tower by shadow volume)', () => {
    for (const type of ['town_center', 'house', 'tower', 'barracks'] as const) {
      const hashes = AGES.map((age) => hashPainting(() => paintBuilding(type, TEAM, age, CIV, false).volume));
      expect(new Set(hashes).size, type).toBe(3);
    }
  });
});
