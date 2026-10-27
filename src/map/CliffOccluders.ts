import type Phaser from 'phaser';
import { makeCanvas } from '../iso/art/canvas';
import type { CliffField } from '../iso/art/cliffArt';
import { CLIFF_NORMAL_DOWNSCALE, occluderCellBounds, type OccluderSink } from '../iso/art/cliffPainter';
import { lit } from '../iso/art/lighting/LightManager';
import { attachNormalMap } from '../iso/art/lighting/litTextures';
import { encodeNormal, N_UP } from '../iso/art/lighting/viewSpace';
import { needsOccluder, occluderReach, tilesInFrontOfFootprint } from './cliffGeometry';
import { alphaBounds, shelfPack, type Rect } from './occluderPacking';

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
/** An occluder raised by a building sorts this far above the building's sprite (and its construction site plate, +0.01). */
const RAISED_DEPTH_OFFSET = 0.02;

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
export class CliffOccluders {
  private readonly images: Phaser.GameObjects.Image[] = [];
  /** Occluder image per tile id (ty · width + tx). */
  private readonly byTile = new Map<number, Phaser.GameObjects.Image>();
  /** Depths raised by buildings behind an occluder (see sortAboveFootprint), per image. */
  private readonly raised = new Map<Phaser.GameObjects.Image, number[]>();
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
    });
  }

  get count(): number {
    return this.images.length;
  }

  /**
   * A building with footprint (fx, fy, w, h) drawn at `depth`: raised
   * rock beside its +u / +v walls hides part of it, so those occluders
   * sort just above it until the returned release function is called.
   */
  sortAboveFootprint(fx: number, fy: number, w: number, h: number, depth: number): () => void {
    const touched: Array<{ img: Phaser.GameObjects.Image; tileDepth: number }> = [];
    for (const [tx, ty] of tilesInFrontOfFootprint(fx, fy, w, h)) {
      if (tx < 0 || ty < 0 || tx >= this.field.width || ty >= this.field.height) continue;
      const img = this.byTile.get(ty * this.field.width + tx);
      if (!img || tx + ty + OCCLUDER_DEPTH_OFFSET > depth) continue;
      const list = this.raised.get(img) ?? [];
      list.push(depth + RAISED_DEPTH_OFFSET);
      this.raised.set(img, list);
      touched.push({ img, tileDepth: tx + ty });
      this.applyDepth(img, tx + ty);
    }
    return () => {
      for (const { img, tileDepth } of touched) {
        const list = this.raised.get(img);
        const i = list?.indexOf(depth + RAISED_DEPTH_OFFSET) ?? -1;
        if (list && i >= 0) list.splice(i, 1);
        if (list?.length === 0) this.raised.delete(img);
        this.applyDepth(img, tileDepth);
      }
    };
  }

  private applyDepth(img: Phaser.GameObjects.Image, tileDepth: number): void {
    const raised = this.raised.get(img) ?? [];
    img.setDepth(Math.max(tileDepth + OCCLUDER_DEPTH_OFFSET, ...raised));
  }

  /** Hides occluders outside the camera view (fewer objects for the renderer to walk). */
  update(view: Phaser.Geom.Rectangle): void {
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
