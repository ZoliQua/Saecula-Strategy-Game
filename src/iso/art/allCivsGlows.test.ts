import { beforeAll, describe, expect, it } from 'vitest';
import { CIV_DEFS, CIV_IDS } from '../../config/civs';
import type { AgeId, CivId } from '../../types';
import { IsoPainter } from './isoPainter';
import { GlowCover } from './lighting/glowCover';
import { occludedGlows } from './testing/occludedGlows.testkit';
import { PIN_TEAM, PINNED_BUILDING_TYPES } from './testing/pinnedArt.testkit';
import { installRecordingCanvas } from './testing/recordingCanvas.testkit';

/*
 * Hidden window glows, every civ (M5 final review I1): a lit window that
 * a later opaque face paints over must not glow at dusk on that face.
 * occludedGlows (the Finnish Task 13 checker, centre + 4 corners) runs
 * over every building type × age and every Wonder stage of every civ.
 *  - Styles with dropHiddenGlows (every M5 civ) drop each glow whose
 *    centre or half its window a later face covers (lighting/glowCover.ts),
 *    so what the checker still finds there is a window an eave or roof
 *    edge grazes (under half covered, centre visible): it keeps its glow.
 *  - The ceilings below hold today's counts; they may only shrink. The
 *    Hungarian and English art is pin-locked and predates the guard, so
 *    its hidden glows (inherited by no M5 civ: those styles drop theirs)
 *    stay listed until that art is next touched.
 */

const AGES: readonly AgeId[] = [1, 2, 3];
const STAGES = [1, 2, 3] as const;

/** Hungarian / English hidden glows (5-probe hits) when the guard landed: pin-locked art, ceilings. */
const PRE_M5_CEILINGS: Readonly<Record<string, number>> = {
  'hungarian town_center@1': 2,
  'hungarian house@1': 1,
  'hungarian barracks@1': 5,
  'hungarian foundry@1': 4,
  'hungarian wonder@1': 14,
  'hungarian town_center@2': 4,
  'hungarian house@2': 2,
  'hungarian barracks@2': 1,
  'hungarian blacksmith@2': 1,
  'hungarian foundry@2': 4,
  'hungarian wonder@2': 14,
  'hungarian town_center@3': 7,
  'hungarian foundry@3': 4,
  'hungarian wonder@3': 14,
  'hungarian wonder~s3': 13,
  'english town_center@1': 1,
  'english barracks@1': 2,
  'english stable@1': 1,
  'english foundry@1': 4,
  'english tower@1': 1,
  'english wonder@1': 12,
  'english town_center@2': 6,
  'english house@2': 4,
  'english lumber_camp@2': 1,
  'english barracks@2': 7,
  'english archery_range@2': 3,
  'english blacksmith@2': 2,
  'english foundry@2': 4,
  'english wonder@2': 12,
  'english town_center@3': 5,
  'english house@3': 1,
  'english lumber_camp@3': 1,
  'english barracks@3': 12,
  'english archery_range@3': 1,
  'english blacksmith@3': 1,
  'english foundry@3': 4,
  'english wonder@3': 12,
  'english wonder~s3': 12,
};

/**
 * M5 windows a later eave, cornice or roof edge grazes (centre visible,
 * under half covered: checked at dusk, shots/final-fix/), ceilings.
 */
const GRAZED_CEILINGS: Readonly<Record<string, number>> = {
  'german barracks@1': 5,
  'german foundry@1': 1,
  'german wonder@1': 3,
  'german town_center@2': 6,
  'german house@2': 3,
  'german lumber_camp@2': 1,
  'german barracks@2': 5,
  'german blacksmith@2': 1,
  'german foundry@2': 1,
  'german wonder@2': 3,
  'german town_center@3': 1,
  'german house@3': 1,
  'german barracks@3': 4,
  'german foundry@3': 1,
  'german wonder@3': 3,
  'french barracks@1': 5,
  'french foundry@1': 2,
  'french wonder@1': 2,
  'french town_center@2': 15,
  'french foundry@2': 2,
  'french wonder@2': 2,
  'french foundry@3': 2,
  'french tower@3': 1,
  'french wonder@3': 2,
  'french wonder~s3': 2,
  'spanish barracks@2': 1,
  'russian blacksmith@1': 1,
  'russian foundry@1': 1,
  'russian wonder@1': 2,
  'russian town_center@2': 1,
  'russian foundry@2': 1,
  'russian wonder@2': 2,
  'russian foundry@3': 1,
  'russian wonder@3': 2,
};

let buildings: typeof import('./buildings');
let styles: typeof import('./architecture/registry');

/** Whether every age style of `civ` drops its hidden glows. */
const dropsHidden = (civ: CivId): boolean => AGES.every((age) => styles.ARCH_STYLES[CIV_DEFS[civ].architecture[age]].dropHiddenGlows === true);

function paintings(civ: CivId): Array<[string, () => { glows: readonly unknown[] }]> {
  const out: Array<[string, () => { glows: readonly unknown[] }]> = [];
  for (const age of AGES) for (const type of PINNED_BUILDING_TYPES) out.push([`${type}@${age}`, () => buildings.paintBuilding(type, PIN_TEAM, age, civ, false)]);
  for (const stage of STAGES) out.push([`wonder~s${stage}`, () => buildings.paintWonderStage(stage, civ)]);
  return out;
}

describe('no lit window glows behind a later solid', () => {
  beforeAll(async () => {
    installRecordingCanvas();
    buildings = await import('./buildings');
    styles = await import('./architecture/registry');
  });

  it('every M5 civ drops hidden glows; the pin-locked Hungarian and English styles keep theirs', () => {
    expect(CIV_IDS.filter((civ) => !dropsHidden(civ))).toEqual(['hungarian', 'english']);
  });

  it.each(CIV_IDS)('%s: no hidden glow beyond its ceiling, and none hidden at its centre where the style drops them', (civ) => {
    const ceilings = dropsHidden(civ) ? GRAZED_CEILINGS : PRE_M5_CEILINGS;
    for (const [key, paint] of paintings(civ)) {
      const hits = occludedGlows(paint);
      expect(hits.length, `${civ} ${key}`).toBeLessThanOrEqual(ceilings[`${civ} ${key}`] ?? 0);
      if (!dropsHidden(civ)) continue;
      for (const h of hits) {
        expect(h.centre, `${civ} ${key} glow ${h.index}`).toBe(false);
        expect(h.coverage, `${civ} ${key} glow ${h.index}`).toBeLessThan(0.5);
      }
    }
  });

  it.each(CIV_IDS.filter((civ) => civ !== 'hungarian' && civ !== 'english'))('%s: GlowCover drops only glows the checker finds hidden (no visible window goes dark)', (civ) => {
    const civStyles = AGES.map((age) => styles.ARCH_STYLES[CIV_DEFS[civ].architecture[age]] as { dropHiddenGlows?: boolean });
    const key = (g: unknown): string => {
      const { x, y } = g as { x: number; y: number };
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };
    for (const [name, paint] of paintings(civ)) {
      const shown = new Set(paint().glows.map(key));
      for (const st of civStyles) st.dropHiddenGlows = false;
      let all: readonly unknown[];
      let hidden: ReturnType<typeof occludedGlows>;
      try {
        all = paint().glows;
        hidden = occludedGlows(paint);
      } finally {
        for (const st of civStyles) st.dropHiddenGlows = true;
      }
      const hiddenAt = new Map(hidden.map((h) => [key(h), h]));
      for (const g of all.filter((glow) => !shown.has(key(glow)))) {
        const h = hiddenAt.get(key(g));
        expect(h !== undefined && (h.centre || h.coverage >= 0.5), `${civ} ${name} dropped a visible glow at ${key(g)}`).toBe(true);
      }
    }
  });

  it('lists no ceiling for a painting that hides no glow (they only shrink)', () => {
    const stale = Object.entries({ ...PRE_M5_CEILINGS, ...GRAZED_CEILINGS }).filter(([name, ceiling]) => {
      const [civ, key] = name.split(' ') as [CivId, string];
      const paint = paintings(civ).find(([k]) => k === key)?.[1];
      return !paint || occludedGlows(paint).length < ceiling;
    });
    expect(stale.map(([name]) => name)).toEqual([]);
  });

  it('catches a window half covered by a later face (a corner, not the centre)', () => {
    const hits = occludedGlows(() => {
      const p = new IsoPainter(1, 1, 60, 1);
      p.addGlow(40, 40, 8);
      p.fillPoly([[42, 42], [60, 42], [60, 60], [42, 60]], '#806040');
      return p.result(false);
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.centre).toBe(false);
  });

  it('catches a window painted over by a later face, and ignores a thin glaze over it', () => {
    const paint = (glaze: boolean) => () => {
      const p = new IsoPainter(1, 1, 60, 1);
      p.leftFace(0.2, 0.8, 0.8, 0, () => p.window(10, -20, 6, 8), 30);
      if (glaze) p.leftFace(0.2, 0.8, 0.8, 0, (w, h) => p.fillPoly([[0, 0], [w, 0], [w, -h], [0, -h]], 'rgba(20,10,5,0.3)'), 30);
      else p.box(0.1, 0.9, 0.9, 1, 0, 40, { color: 0x806040 });
      return p.result(false);
    };
    expect(occludedGlows(paint(false))).toHaveLength(1);
    expect(occludedGlows(paint(true))).toEqual([]);
  });

  it('GlowCover drops a glow a later face hides at its centre, and keeps one an edge only grazes', () => {
    const p = new IsoPainter(1, 1, 60, 1);
    p.glowCover = new GlowCover();
    p.addGlow(20, 20, 8);
    p.addGlow(40, 40, 8);
    p.fillPoly([[10, 10], [30, 10], [30, 30], [10, 30]], '#806040');
    p.fillPoly([[42, 42], [60, 42], [60, 60], [42, 60]], '#806040');
    expect(p.result(false).glows.map((g) => g.x)).toEqual([40]);
  });
});
