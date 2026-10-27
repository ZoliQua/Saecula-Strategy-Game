import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { UnitType } from '../../../types';
import { ANIM_FRAMES, frameContent, PAINTED_HEADINGS } from './layout';
import { contactShadow, unitLook } from './looks';
import { FrameRaster } from './raster';
import { buildFigure } from './rig';
import { sheetGeometry } from './sheet';

/*
 * Pixel-identity guard for the Hungarian unit art (M4 Task 5): every
 * Hungarian unit type's sheet geometry, the posed figure (primitives and
 * materials) of every frame, and the rasterized pixels (albedo, team
 * mask, normals, coverage) of every frame are hashed and compared to
 * hashes recorded at 8c43c49, before unit looks became civ-keyed. The rasterizer is pure JS, so the
 * pixels themselves are hashed (no canvas shim needed).
 */

const TYPES: readonly UnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** Recorded at 8c43c49 (before the civ-keyed looks). */
const EXPECTED: Record<string, string> = {
  villager: '8da77eb412bd6f07',
  swordsman: 'e251c38dbf256dd5',
  archer: '2110473f84c7ef84',
  pikeman: '537b33808277d9cc',
  crossbowman: 'ec15507f7c9749ec',
  musketeer: '6db9f9c0c3e13f20',
  scout: '706bc54f1e9befcd',
  knight: '9f1c46103efbc4ec',
  cavalry: '25666eed9e926459',
  cannon: '7771c179a0a68df6',
};

function hashUnit(type: UnitType): string {
  const h = createHash('sha256');
  const g = sheetGeometry(type, 'hungarian');
  h.update(JSON.stringify({ w: g.width, h: g.height, blocks: g.blocks, layout: g.layout }));
  const shadow = contactShadow(unitLook(type, 'hungarian'));
  for (let k = 0; k < g.layout.frameCount; k++) {
    const { slot, anim, i } = frameContent(g.layout, k);
    const fig = buildFigure(type, 'hungarian', slot, anim, i);
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

describe('Hungarian unit art stays pixel-identical', () => {
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
