import { createHash } from 'node:crypto';
import type { CivId, UnitType } from '../../../types';
import { frameContent } from '../units/layout';
import { contactShadow, unitLook } from '../units/looks';
import { FrameRaster, type FramePixels } from '../units/raster';
import { buildFigure } from '../units/rig';
import { sheetGeometry } from '../units/sheet';

/*
 * Unit art pins (test-only), split in two:
 *  - pixelsHash: the posed figure (primitives, materials) of every frame
 *    and its rasterized pixels (albedo, team mask, normals, coverage) in
 *    the frame's logical box — what the sprite shows, whatever the packing;
 *  - geometryHash: the sheet's size and frame placement.
 * A packing change may move frames (geometry) but must not change a pixel.
 */

export const UNIT_TYPES: readonly UnitType[] = [
  'villager', 'swordsman', 'archer', 'pikeman', 'crossbowman', 'musketeer', 'scout', 'knight', 'cavalry', 'cannon',
];

/** Frame `k` rasterized in its logical box (frames are centred on the feet horizontally). */
function logicalFrame(type: UnitType, civ: CivId, k: number): FramePixels | null {
  const g = sheetGeometry(type, civ);
  const { slot, anim, i } = frameContent(g.layout, k);
  const b = g.blocks[anim];
  if (!b) return null;
  const fig = buildFigure(type, civ, slot, anim, i);
  return new FrameRaster(b.w, b.h, b.w / 2, b.feetY).paint(fig.prims, fig.mats.list, contactShadow(unitLook(type, civ)));
}

export function unitPixelsHash(type: UnitType, civ: CivId): string {
  const h = createHash('sha256');
  const g = sheetGeometry(type, civ);
  for (let k = 0; k < g.layout.frameCount; k++) {
    const { slot, anim, i } = frameContent(g.layout, k);
    const fig = buildFigure(type, civ, slot, anim, i);
    h.update(JSON.stringify(fig.prims));
    h.update(JSON.stringify(fig.mats.list));
    const px = logicalFrame(type, civ, k);
    if (!px) continue;
    h.update(px.albedo);
    h.update(px.mask);
    h.update(px.normal);
    h.update(new Uint8Array(px.coverage.buffer));
  }
  return h.digest('hex').slice(0, 16);
}

export function unitGeometryHash(type: UnitType, civ: CivId): string {
  const g = sheetGeometry(type, civ);
  return createHash('sha256')
    .update(JSON.stringify({ w: g.width, h: g.height, blocks: g.blocks, layout: g.layout }))
    .digest('hex')
    .slice(0, 16);
}
