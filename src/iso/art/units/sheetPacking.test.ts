import { describe, expect, it } from 'vitest';
import { UNIT_SHADOW_DOWNSCALE } from '../../../config/visual';
import type { CivId } from '../../../types';
import { UNIT_TYPES } from '../testing/unitPins.testkit';
import { frameContent } from './layout';
import { contactShadow, unitLook } from './looks';
import { FrameRaster } from './raster';
import { buildFigure } from './rig';
import { frameBox, frameRect, sheetGeometry } from './sheet';

/*
 * Per-frame packed unit sheets (M5 Task 1, lever 3): every frame keeps
 * only its own content rectangle; the logical box (sprite size, origin,
 * feet line) is restored with Frame.setTrim.
 */

const LOOKS: readonly CivId[] = ['hungarian', 'english'];
const S = UNIT_SHADOW_DOWNSCALE;

/** M4 sheet area: one block per animation, every frame and heading at the animation's full box. */
function m4BlockArea(type: (typeof UNIT_TYPES)[number], civ: CivId): number {
  const g = sheetGeometry(type, civ);
  let area = 0;
  for (let k = 0; k < g.layout.frameCount; k++) {
    const b = frameBox(g, k);
    area += b.w * b.h;
  }
  return area;
}

describe.each(LOOKS)('%s unit sheets, packed per frame', (civ) => {
  it.each(UNIT_TYPES)('%s: rects are aligned, inside the sheet and the logical box, and never overlap', (type) => {
    const g = sheetGeometry(type, civ);
    expect(g.frames).toHaveLength(g.layout.frameCount);
    for (let k = 0; k < g.frames.length; k++) {
      const r = frameRect(g, k);
      const b = frameBox(g, k);
      for (const v of [r.x, r.y, r.w, r.h, r.ox, r.oy]) expect(v % S).toBe(0);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
      expect(r.x + r.w).toBeLessThanOrEqual(g.width);
      expect(r.y + r.h).toBeLessThanOrEqual(g.height);
      expect(r.ox + r.w).toBeLessThanOrEqual(b.w);
      expect(r.oy + r.h).toBeLessThanOrEqual(b.h);
      for (let j = 0; j < k; j++) {
        const o = frameRect(g, j);
        const apart = r.x >= o.x + o.w || o.x >= r.x + r.w || r.y >= o.y + o.h || o.y >= r.y + r.h;
        expect(apart, `frames ${j} and ${k} overlap`).toBe(true);
      }
    }
  });

  it.each(UNIT_TYPES)('%s: every painted pixel of each frame lies inside its rect', (type) => {
    const g = sheetGeometry(type, civ);
    const shadow = contactShadow(unitLook(type, civ));
    for (let k = 0; k < g.layout.frameCount; k++) {
      const { slot, anim, i } = frameContent(g.layout, k);
      const b = frameBox(g, k);
      const r = frameRect(g, k);
      const fig = buildFigure(type, civ, slot, anim, i);
      const px = new FrameRaster(b.w, b.h, b.w / 2, b.feetY).paint(fig.prims, fig.mats.list, shadow);
      let outside = 0;
      for (let y = 0; y < b.h; y++) {
        for (let x = 0; x < b.w; x++) {
          if (x >= r.ox && x < r.ox + r.w && y >= r.oy && y < r.oy + r.h) continue;
          const o = y * b.w + x;
          if ((px.albedo[o * 4 + 3] ?? 0) > 0 || (px.mask[o * 4 + 3] ?? 0) > 0 || (px.coverage[o] ?? 0) > 0) outside++;
        }
      }
      expect(outside, `frame ${k}`).toBe(0);
    }
  });

  it('stores at most 0.6 x the M4 block area for every type', () => {
    const ratios: Record<string, number> = {};
    for (const type of UNIT_TYPES) {
      const g = sheetGeometry(type, civ);
      ratios[type] = +((g.width * g.height) / m4BlockArea(type, civ)).toFixed(3);
    }
    console.log(`${civ} packed sheet / M4 block area:`, JSON.stringify(ratios));
    for (const ratio of Object.values(ratios)) expect(ratio).toBeLessThanOrEqual(0.6);
  });
});
