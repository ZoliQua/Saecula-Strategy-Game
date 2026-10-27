import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { UnitType } from '../../../../types';
import { ANIM_FRAMES, frameContent, PAINTED_HEADINGS } from '../layout';
import { contactShadow, unitLook } from '../looks';
import { FrameRaster } from '../raster';
import { buildFigure } from '../rig';
import { sheetGeometry } from '../sheet';

/*
 * Pixel-identity guard for the English unit art (M4 final review M1): every
 * English unit type's sheet geometry, the posed figure (primitives and
 * materials) of every frame, and the rasterized pixels (albedo, team
 * mask, normals, coverage) of every frame are hashed and compared to
 * pinned hashes so shared-gear refactors cannot change English units. The rasterizer is pure JS, so the
 * pixels themselves are hashed (no canvas shim needed).
 */

const TYPES: readonly UnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** Recorded at 39e00c4 (end of M4). */
const EXPECTED: Record<string, string> = {
  villager: 'cb5bb8b4ffa265df',
  swordsman: 'b21893a4d04e58d1',
  archer: '4731a1ff8b0aacfa',
  pikeman: '0c9409f2c9f28594',
  crossbowman: '086af4c3f3c40ba8',
  musketeer: '00808ee83d6cfafb',
  scout: '5a23e8f705af34df',
  knight: 'cde8ba2a15b2e04f',
  cavalry: '029226fb4c25a1c9',
  cannon: 'ae5eaa71f901d9c9',
};

function hashUnit(type: UnitType): string {
  const h = createHash('sha256');
  const g = sheetGeometry(type, 'english');
  h.update(JSON.stringify({ w: g.width, h: g.height, blocks: g.blocks, layout: g.layout }));
  const shadow = contactShadow(unitLook(type, 'english'));
  for (let k = 0; k < g.layout.frameCount; k++) {
    const { slot, anim, i } = frameContent(g.layout, k);
    const fig = buildFigure(type, 'english', slot, anim, i);
    h.update(JSON.stringify(fig.prims));
    h.update(JSON.stringify(fig.mats.list));
    const b = g.blocks[anim];
    if (!b) continue;
    const px = new FrameRaster(b.w, b.h, b.w / 2, b.feetY).paint(fig.prims, fig.mats.list, shadow);
    h.update(px.albedo);
    h.update(px.mask);
    h.update(px.normal);
    h.update(new Uint8Array(px.coverage.buffer));
  }
  return h.digest('hex').slice(0, 16);
}

describe('English unit art stays pixel-identical', () => {
  it('paints five headings', () => {
    expect(PAINTED_HEADINGS.length).toBe(5);
    expect(ANIM_FRAMES.walk).toBe(6);
  });

  it.each(TYPES)('%s', (type) => {
    const hash = hashUnit(type);
    if (process.env.PRINT_ART_HASHES) console.log(`  ${type}: '${hash}',`);
    expect(hash).toBe(EXPECTED[type]);
  });
});
