import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AgeId, BuildingType } from '../../../../types';
import { paintBuilding } from '../../buildings';
import { IsoPainter } from '../../isoPainter';
import { installRecordingCanvas } from '../../testing/recordingCanvas.testkit';

type Pt = readonly [number, number];

/*
 * Occluded glows (Task 13 review I1 / m8): a lit window that a later
 * solid paints over still glows at dusk, floating on the wall or roof in
 * front of it. Painting runs back to front, so a glow is hidden exactly
 * when its centre falls inside an opaque face polygon painted after it.
 * The painter is spied on: each window / addGlow call is a glow event,
 * each fillPoly an opaque face (fully transparent clip fills aside).
 */

const TEAM = 0x3b6fd6;
const TYPES: readonly BuildingType[] = ['town_center', 'house', 'blacksmith', 'foundry', 'wonder'];

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
function occluded(paint: () => { glows: ReadonlyArray<{ x: number; y: number }> }): string[] {
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
    const later = events.slice(i + 1).some((f) => !f.glow && inside([glow.x, glow.y], f.pts));
    if (later) out.push(`glow ${g - 1} at (${glow.x.toFixed(0)}, ${glow.y.toFixed(0)})`);
  });
  return out;
}

describe('Finnish glows show (no lit window behind a later solid)', () => {
  beforeAll(() => installRecordingCanvas());
  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const age of [1, 2, 3] as const satisfies readonly AgeId[]) {
    it.each(TYPES)(`%s, age ${age}`, (type) => {
      expect(occluded(() => paintBuilding(type, TEAM, age, 'finnish', false))).toEqual([]);
    });
  }

  it('catches a window painted over by a later face', () => {
    expect(occluded(() => {
      const p = new IsoPainter(1, 1, 60, 1);
      p.leftFace(0.2, 0.8, 0.8, 0, () => p.window(10, -20, 6, 8), 30);
      p.box(0.1, 0.9, 0.9, 1, 0, 40, { color: 0x806040 });
      return p.result(false);
    })).toHaveLength(1);
  });
});
