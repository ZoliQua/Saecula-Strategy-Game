import type Phaser from 'phaser';
import { makeCanvas } from '../iso/art/canvas';
import type { CliffField } from '../iso/art/cliffArt';
import { CLIFF_NORMAL_DOWNSCALE, occluderCellBounds, type OccluderSink } from '../iso/art/cliffPainter';
import { lit } from '../iso/art/lighting/LightManager';
import { attachNormalMap } from '../iso/art/lighting/litTextures';
import { encodeNormal, N_UP } from '../iso/art/lighting/viewSpace';
import { columnCover, forEachCoverCell, type Box, type ColumnCover, type CoverSource, type PlacedCover } from '../iso/coverage';
import { depthBelowFrontRock, needsOccluder, occluderReach } from './cliffGeometry';
import { alphaBounds, shelfPack, type Rect } from './occluderPacking';
import type { ViewRect } from '../iso/liveView';

/** Copies a w×h block of RGBA pixels between ImageData buffers. */
function copyRect(src: ImageData, sx: number, sy: number, dst: ImageData, dx: number, dy: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) {
    const from = ((sy + j) * src.width + sx) * 4;
    dst.data.set(src.data.subarray(from, from + w * 4), ((dy + j) * dst.width + dx) * 4);
  }
}

/** Occluders sort just after flat things on their row, before the row's trees (+0.1) and units (+0.3). */
const OCCLUDER_DEPTH_OFFSET = 0.05;
const ATLAS_WIDTH = 2048;
/**
 * A building beside raised rock sorts this far below the rock: its site
 * plate (+0.01), age-up scaffold (+0.02) and glow (+0.03) and its window
 * glows (+0.05, WindowGlows) stay under it too.
 */
const BELOW_ROCK = 0.06;

let seq = 0;

/** The occluder atlas layout, filled by the terrain chunk painter (paintCliffChunk). */
export interface OccluderPlan extends OccluderSink {
  readonly tiles: ReadonlyArray<readonly [number, number]>;
}

/**
 * Lays out one atlas cell per cliff tile that needs an occluder (see
 * needsOccluder). `withNormals`: the scene's lighting is active (the
 * chunks get normals under the same condition, see lightingActive).
 */
export function planOccluders(field: CliffField, withNormals: boolean): OccluderPlan | null {
  const tiles: Array<[number, number]> = [];
  const reach = occluderReach(field.relief.maxHeight);
  for (let ty = 0; ty < field.height; ty++) {
    for (let tx = 0; tx < field.width; tx++) {
      if (needsOccluder(field.isCliff, field.width, field.height, tx, ty, reach)) tiles.push([tx, ty]);
    }
  }
  if (tiles.length === 0) return null;
  const s = CLIFF_NORMAL_DOWNSCALE;
  // Cells differ by tile only in position (all on the texel grid), so one size fits all.
  const box = occluderCellBounds(0, 0, field.relief.maxHeight);
  const cellW = box.w;
  const cellH = box.h;
  const perRow = Math.floor(ATLAS_WIDTH / cellW);
  const aw = perRow * cellW;
  const ah = Math.ceil(tiles.length / perRow) * cellH;
  const cells = new Map<number, readonly [number, number]>();
  tiles.forEach(([tx, ty], i) => cells.set(ty * field.width + tx, [(i % perRow) * cellW, Math.floor(i / perRow) * cellH]));
  let normal: ImageData | null = null;
  if (withNormals) {
    normal = new ImageData(aw / s, ah / s);
    const [r, g, b] = encodeNormal(N_UP);
    for (let o = 0; o < normal.data.length; o += 4) {
      normal.data[o] = r;
      normal.data[o + 1] = g;
      normal.data[o + 2] = b;
      normal.data[o + 3] = 255;
    }
  }
  return { tiles, cells, cellW, cellH, albedo: new ImageData(aw, ah), normal };
}

/**
 * Depth-sorted copies of the cliff blocks that something could stand
 * behind (see needsOccluder). Each is pixel-identical to what the baked
 * terrain chunk shows for that block, so it is invisible on its own and
 * only hides units, trees, buildings, shadows and water that are behind
 * the raised rock.
 */
export class CliffOccluders implements CoverSource {
  private readonly images: Phaser.GameObjects.Image[] = [];
  /** Occluder image per tile id (ty · width + tx). */
  private readonly byTile = new Map<number, Phaser.GameObjects.Image>();
  /** Column coverage per image (same index), for unit X-ray silhouettes. */
  private readonly covers: ColumnCover[] = [];
  /** Image indices per spatial hash cell (see forEachCoverCell). */
  private readonly grid = new Map<number, number[]>();
  private readonly key = `cliff_occluders_${seq++}`;
  /** Texture bytes held (albedo + normal), for the memory report. */
  readonly bytes: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly field: CliffField,
    plan: OccluderPlan,
  ) {
    // The plan's cells are worst-case sized; most blocks (no face) fill half. Trim and repack.
    const S = CLIFF_NORMAL_DOWNSCALE;
    const items: Array<{ tx: number; ty: number; cell: readonly [number, number]; trim: Rect }> = [];
    for (const [tx, ty] of plan.tiles) {
      const cell = plan.cells.get(ty * field.width + tx);
      if (!cell) continue;
      const trim = alphaBounds(plan.albedo.data, plan.albedo.width, { x: cell[0], y: cell[1], w: plan.cellW, h: plan.cellH }, S);
      if (trim) items.push({ tx, ty, cell, trim });
    }
    // One normal texel of gutter around every block: linear filtering never mixes neighbours.
    const { at, height } = shelfPack(items.map((it) => ({ w: it.trim.w, h: it.trim.h })), ATLAS_WIDTH, S);
    const aw = ATLAS_WIDTH;
    const ah = Math.max(S, Math.ceil(height / S) * S);
    const albedo = new ImageData(aw, ah);
    const normal = plan.normal ? new ImageData(aw / S, ah / S) : null;
    items.forEach((it, i) => {
      const [px, py] = at[i] ?? [0, 0];
      copyRect(plan.albedo, it.cell[0] + it.trim.x, it.cell[1] + it.trim.y, albedo, px, py, it.trim.w, it.trim.h);
      if (plan.normal && normal) {
        copyRect(plan.normal, (it.cell[0] + it.trim.x) / S, (it.cell[1] + it.trim.y) / S, normal, px / S, py / S, it.trim.w / S, it.trim.h / S);
      }
    });
    const a = makeCanvas(aw, ah);
    a.ctx.putImageData(albedo, 0, 0);
    if (scene.textures.exists(this.key)) scene.textures.remove(this.key);
    const tex = scene.textures.addCanvas(this.key, a.canvas);
    if (!tex) throw new Error('Could not create cliff occluder texture');
    if (normal) {
      const n = makeCanvas(normal.width, normal.height);
      n.ctx.putImageData(normal, 0, 0);
      attachNormalMap(scene, this.key, n.canvas);
    }
    this.bytes = albedo.data.length + (normal?.data.length ?? 0);
    items.forEach((it, i) => {
      const [px, py] = at[i] ?? [0, 0];
      tex.add(i, 0, px, py, it.trim.w, it.trim.h);
      const b = occluderCellBounds(it.tx, it.ty, field.relief.maxHeight);
      const img = scene.add.image(b.x + it.trim.x, b.y + it.trim.y, this.key, i).setOrigin(0, 0);
      this.images.push(lit(img.setDepth(it.tx + it.ty + OCCLUDER_DEPTH_OFFSET)));
      this.byTile.set(it.ty * field.width + it.tx, img);
      const stride = albedo.width;
      this.covers.push(columnCover((x, y) => albedo.data[((py + y) * stride + px + x) * 4 + 3] ?? 0, it.trim.w, it.trim.h));
      forEachCoverCell({ left: img.x, top: img.y, right: img.x + it.trim.w, bottom: img.y + it.trim.h }, (k) => {
        const list = this.grid.get(k);
        if (list) list.push(i);
        else this.grid.set(k, [i]);
      });
    });
  }

  get count(): number {
    return this.images.length;
  }

  /**
   * Draw depth for a building with footprint (fx, fy, w, h) normally drawn
   * at `depth`: below raised rock beside its +u / +v walls, which hides
   * part of it (see depthBelowFrontRock).
   */
  buildingDepth(fx: number, fy: number, w: number, h: number, depth: number): number {
    const W = this.field.width;
    const isOccluder = (tx: number, ty: number): boolean => tx >= 0 && ty >= 0 && tx < W && ty < this.field.height && this.byTile.has(ty * W + tx);
    return depthBelowFrontRock(fx, fy, w, h, depth, isOccluder, OCCLUDER_DEPTH_OFFSET, BELOW_ROCK);
  }

  collectCovers(box: Box, minDepth: number, out: PlacedCover[]): void {
    const seen = new Set<number>();
    forEachCoverCell(box, (k) => {
      for (const i of this.grid.get(k) ?? []) {
        if (seen.has(i)) continue;
        seen.add(i);
        const img = this.images[i];
        const cover = this.covers[i];
        if (!img || !cover || img.depth <= minDepth) continue;
        if (img.x >= box.right || img.x + img.width <= box.left || img.y >= box.bottom || img.y + img.height <= box.top) continue;
        out.push({ cover, left: img.x, top: img.y, scale: 1, flipX: false, depth: img.depth });
      }
    });
  }

  /** Hides occluders outside the camera view (fewer objects for the renderer to walk). */
  update(view: ViewRect): void {
    for (const img of this.images) {
      img.setVisible(img.x < view.right && img.x + img.width > view.x && img.y < view.bottom && img.y + img.height > view.y);
    }
  }

  destroy(): void {
    for (const img of this.images) img.destroy();
    this.images.length = 0;
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
  }
}
