import type Phaser from 'phaser';
import { LIGHTING_ENABLED } from '../config/visual';
import { makeCanvas } from '../iso/art/canvas';
import { blockBounds, type CliffField } from '../iso/art/cliffArt';
import { CLIFF_NORMAL_DOWNSCALE, type OccluderSink } from '../iso/art/cliffPainter';
import { lit } from '../iso/art/lighting/LightManager';
import { attachNormalMap } from '../iso/art/lighting/litTextures';
import { encodeNormal, N_UP } from '../iso/art/lighting/viewSpace';
import { needsOccluder } from './cliffGeometry';

/** Occluders sort just after flat things on their row, before the row's trees (+0.1) and units (+0.3). */
const OCCLUDER_DEPTH_OFFSET = 0.05;
const ATLAS_WIDTH = 2048;

let seq = 0;

/** The occluder atlas layout, filled by the terrain chunk painter (paintCliffChunk). */
export interface OccluderPlan extends OccluderSink {
  readonly tiles: ReadonlyArray<readonly [number, number]>;
}

/** Lays out one atlas cell per cliff tile that needs an occluder (see needsOccluder). */
export function planOccluders(field: CliffField): OccluderPlan | null {
  const tiles: Array<[number, number]> = [];
  for (let ty = 0; ty < field.height; ty++) {
    for (let tx = 0; tx < field.width; tx++) {
      if (needsOccluder(field.isCliff, field.width, field.height, tx, ty)) tiles.push([tx, ty]);
    }
  }
  if (tiles.length === 0) return null;
  const s = CLIFF_NORMAL_DOWNSCALE;
  const box = blockBounds(0, 0, field.relief.maxHeight);
  const cellW = box.w;
  const cellH = Math.ceil(box.h / s) * s;
  const perRow = Math.floor(ATLAS_WIDTH / cellW);
  const aw = perRow * cellW;
  const ah = Math.ceil(tiles.length / perRow) * cellH;
  const cells = new Map<number, readonly [number, number]>();
  tiles.forEach(([tx, ty], i) => cells.set(ty * field.width + tx, [(i % perRow) * cellW, Math.floor(i / perRow) * cellH]));
  let normal: ImageData | null = null;
  if (LIGHTING_ENABLED) {
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
  private readonly key = `cliff_occluders_${seq++}`;
  /** Texture bytes held (albedo + normal), for the memory report. */
  readonly bytes: number;

  constructor(
    private readonly scene: Phaser.Scene,
    field: CliffField,
    plan: OccluderPlan,
  ) {
    const a = makeCanvas(plan.albedo.width, plan.albedo.height);
    a.ctx.putImageData(plan.albedo, 0, 0);
    if (scene.textures.exists(this.key)) scene.textures.remove(this.key);
    const tex = scene.textures.addCanvas(this.key, a.canvas);
    if (!tex) throw new Error('Could not create cliff occluder texture');
    if (plan.normal) {
      const n = makeCanvas(plan.normal.width, plan.normal.height);
      n.ctx.putImageData(plan.normal, 0, 0);
      attachNormalMap(scene, this.key, n.canvas);
    }
    this.bytes = plan.albedo.data.length + (plan.normal?.data.length ?? 0);
    const boxH = blockBounds(0, 0, field.relief.maxHeight).h;
    plan.tiles.forEach(([tx, ty], i) => {
      const cell = plan.cells.get(ty * field.width + tx);
      if (!cell) return;
      tex.add(i, 0, cell[0], cell[1], plan.cellW, boxH);
      const b = blockBounds(tx, ty, field.relief.maxHeight);
      const img = scene.add.image(b.x, b.y, this.key, i).setOrigin(0, 0).setDepth(tx + ty + OCCLUDER_DEPTH_OFFSET);
      this.images.push(lit(img));
    });
  }

  get count(): number {
    return this.images.length;
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
