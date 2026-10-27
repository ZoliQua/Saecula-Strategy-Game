import { createHash } from 'node:crypto';
import type { CivId, UnitType } from '../../../types';
import { frameContent } from '../units/layout';
import type { FramePixels } from '../units/raster';
import { buildFigure } from '../units/rig';
import { frameRect, rasterizeFrame, sheetGeometry } from '../units/sheet';

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

/** Normal of a pixel no figure covers (FrameRaster: ground facing up). */
const GROUND_NORMAL = [128, 238, 191, 255] as const;

/**
 * Frame `k` in its logical box, rebuilt from what the sheet stores: the
 * packed rectangle rasterized as production does (rasterizeFrame), placed
 * at its offset; the rest of the box is empty (ground normal).
 */
function logicalFrame(type: UnitType, civ: CivId, k: number): FramePixels | null {
  const g = sheetGeometry(type, civ);
  const { anim } = frameContent(g.layout, k);
  const b = g.blocks[anim];
  if (!b) return null;
  const r = frameRect(g, k);
  const px = rasterizeFrame(type, civ, k);
  const out: FramePixels = {
    albedo: new Uint8ClampedArray(b.w * b.h * 4),
    mask: new Uint8ClampedArray(b.w * b.h * 4),
    normal: new Uint8ClampedArray(b.w * b.h * 4),
    coverage: new Float32Array(b.w * b.h),
  };
  for (let i = 0; i < b.w * b.h; i++) out.normal.set(GROUND_NORMAL, i * 4);
  for (let y = 0; y < r.h; y++) {
    const from = y * r.w;
    const to = (r.oy + y) * b.w + r.ox;
    out.albedo.set(px.albedo.subarray(from * 4, (from + r.w) * 4), to * 4);
    out.mask.set(px.mask.subarray(from * 4, (from + r.w) * 4), to * 4);
    out.normal.set(px.normal.subarray(from * 4, (from + r.w) * 4), to * 4);
    out.coverage.set(px.coverage.subarray(from, from + r.w), to);
  }
  return out;
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
    .update(JSON.stringify({ w: g.width, h: g.height, blocks: g.blocks, frames: g.frames, layout: g.layout }))
    .digest('hex')
    .slice(0, 16);
}
