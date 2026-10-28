import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { BUILDING_BALANCE } from '../../../../config/balance';
import type { AgeId, BuildingType } from '../../../../types';
import { paintBuilding, paintWonderStage } from '../../buildings';
import { IsoPainter } from '../../isoPainter';
import { installRecordingCanvas } from '../../testing/recordingCanvas.testkit';

type Pt = readonly [number, number];

/*
 * Occluded glows (Task 13 review I1 / m8): a lit window that a later
 * solid paints over still glows at dusk, floating on the wall or roof in
 * front of it. Painting runs back to front, so a glow is hidden exactly
 * when its centre or any corner of the square inscribed in its r-wide
 * disc falls inside an opaque face polygon painted after it, so a
 * half-covered window fails too (the inscribed square keeps the probes
 * on the opening on a sheared face, where the screen-space bounding
 * square would reach past it). The painter is spied on: each window / addGlow call is a glow
 * event, each fillPoly an opaque face (fully transparent clip fills
 * aside). The types tested are every building type whose Finnish art
 * records a glow in some age (Task 13 re-review N1), not a fixed list.
 */

const TEAM = 0x3b6fd6;
const ALL_TYPES = Object.keys(BUILDING_BALANCE) as BuildingType[];
const AGES = [1, 2, 3] as const satisfies readonly AgeId[];
/** Types known to glow (town centre, houses, smithy, foundry, Wonder): the derived list must keep them. */
const KNOWN_GLOWING: readonly BuildingType[] = ['town_center', 'house', 'blacksmith', 'foundry', 'wonder'];

function inside([x, y]: Pt, pts: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const transparent = (c: unknown): boolean => typeof c === 'string' && /,\s*0(\.0+)?\)$/.test(c.replace(/\s/g, ''));

/** Glows of a painting that a later opaque face covers. */
function occluded(paint: () => { glows: ReadonlyArray<{ x: number; y: number; r: number }> }): string[] {
  const events: Array<{ glow: true } | { glow: false; pts: Pt[] }> = [];
  const fill = IsoPainter.prototype.fillPoly;
  const win = IsoPainter.prototype.window;
  const add = IsoPainter.prototype.addGlow;
  vi.spyOn(IsoPainter.prototype, 'fillPoly').mockImplementation(function (this: IsoPainter, pts, color) {
    if (!transparent(color)) events.push({ glow: false, pts: [...pts] });
    fill.call(this, pts, color);
  });
  vi.spyOn(IsoPainter.prototype, 'window').mockImplementation(function (this: IsoPainter, ...a) {
    events.push({ glow: true });
    win.apply(this, a);
  });
  vi.spyOn(IsoPainter.prototype, 'addGlow').mockImplementation(function (this: IsoPainter, ...a) {
    events.push({ glow: true });
    add.apply(this, a);
  });
  const art = paint();
  const out: string[] = [];
  let g = 0;
  events.forEach((e, i) => {
    if (!e.glow) return;
    const glow = art.glows[g++];
    if (!glow) return;
    const k = glow.r / (2 * Math.SQRT2);
    const probes: Pt[] = [[glow.x, glow.y], [glow.x - k, glow.y - k], [glow.x + k, glow.y - k], [glow.x - k, glow.y + k], [glow.x + k, glow.y + k]];
    const later = events.slice(i + 1).some((f) => !f.glow && probes.some((q) => inside(q, f.pts)));
    if (later) out.push(`glow ${g - 1} at (${glow.x.toFixed(0)}, ${glow.y.toFixed(0)})`);
  });
  return out;
}

describe('Finnish glows show (no lit window behind a later solid)', () => {
  beforeAll(() => installRecordingCanvas());
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives the glowing types from the art', () => {
    const glowing = ALL_TYPES.filter((type) => AGES.some((age) => paintBuilding(type, TEAM, age, 'finnish', false).glows.length > 0));
    expect(glowing).toEqual(expect.arrayContaining([...KNOWN_GLOWING]));
  });

  it.each(AGES)('age %s: no glowing type hides a lit window behind a later solid', (age) => {
    for (const type of ALL_TYPES) {
      if (paintBuilding(type, TEAM, age, 'finnish', false).glows.length === 0) continue;
      expect(occluded(() => paintBuilding(type, TEAM, age, 'finnish', false)), `${type}@${age}`).toEqual([]);
    }
  });

  it.each([1, 2, 3] as const)('Wonder stage %s hides no lit window', (stage) => {
    expect(occluded(() => paintWonderStage(stage, 'finnish'))).toEqual([]);
  });

  it('catches a window half covered by a later face (a corner, not the centre)', () => {
    expect(occluded(() => {
      const p = new IsoPainter(1, 1, 60, 1);
      p.addGlow(40, 40, 8);
      p.fillPoly([[42, 42], [60, 42], [60, 60], [42, 60]], '#806040');
      return p.result(false);
    })).toHaveLength(1);
  });

  it('catches a window painted over by a later face', () => {
    expect(occluded(() => {
      const p = new IsoPainter(1, 1, 60, 1);
      p.leftFace(0.2, 0.8, 0.8, 0, () => p.window(10, -20, 6, 8), 30);
      p.box(0.1, 0.9, 0.9, 1, 0, 40, { color: 0x806040 });
      return p.result(false);
    })).toHaveLength(1);
  });
});
