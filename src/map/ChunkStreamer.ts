import type Phaser from 'phaser';
import { TERRAIN_STREAM } from '../config/visual';
import { attachNormalMap, flatGroundNormal } from '../iso/art/lighting/litTextures';
import { chunkWants, type ChunkRect, type WorldView } from './chunkPlan';
import type { BakedChunk } from './TerrainBake';

const BLANK = '__DEFAULT';

type Level = 'full' | 'half';

interface Slot {
  readonly image: Phaser.GameObjects.Image;
  readonly rect: ChunkRect;
  readonly baked: BakedChunk;
  readonly keys: Readonly<Record<Level, string>>;
  /** Resident textures. */
  readonly has: Record<Level, boolean>;
  /** The bitmap behind a resident streamed texture (closed when it is dropped). */
  readonly bitmap: Record<Level, ImageBitmap | null>;
  /** A decode is in flight / its result waits for a frame with budget. */
  readonly decoding: Record<Level, boolean>;
  readonly ready: Record<Level, ImageBitmap | null>;
  shown: string;
}

/**
 * Keeps terrain chunk textures only where the camera can use them
 * (texture memory budget; a 128×128 map bakes ~95 MB of chunks).
 *
 * Every chunk is baked once, behind the loading card, and kept as a PNG
 * blob (~150 KB). Near the view a chunk holds its full-resolution texture;
 * in an outer ring, or everywhere when zoomed out below `lodZoom`, a
 * half-resolution one; far away nothing (chunkWants decides). Restores
 * are decoded, and halved, off the main thread (createImageBitmap) ahead
 * of the view margin; installing one is a texture upload of a bitmap
 * (~0.2 ms), done within TERRAIN_STREAM.budgetMs per frame. A full
 * texture is dropped only once its half one is resident, so a chunk in
 * view never shows a hole.
 */
export class ChunkStreamer {
  private readonly slots: Slot[];
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    baked: readonly BakedChunk[],
  ) {
    this.slots = baked.map((b) => ({
      image: b.image,
      rect: b.rect,
      baked: b,
      keys: { full: b.key, half: `${b.key}~half` },
      has: { full: true, half: false },
      bitmap: { full: null, half: null },
      decoding: { full: false, half: false },
      ready: { full: null, half: null },
      shown: b.key,
    }));
  }

  /** Resident textures (dev diagnostics). */
  stats(): { full: number; half: number; chunks: number } {
    return { full: this.slots.filter((s) => s.has.full).length, half: this.slots.filter((s) => s.has.half).length, chunks: this.slots.length };
  }

  update(view: WorldView, zoom: number): void {
    const deadline = performance.now() + TERRAIN_STREAM.budgetMs;
    let installed = false;
    for (const s of this.slots) {
      const w = chunkWants(s.rect, view, zoom, TERRAIN_STREAM);
      // A resident full texture makes the half one redundant while the chunk stays in the full ring.
      const keepHalf = w.keepHalf && !(s.has.full && w.want === 'full');
      // The half texture first: cheap, and the fallback before a full one may go.
      if (w.want !== 'none' && !s.has.half && (!s.has.full || w.want === 'half')) this.fetch(s, 'half');
      if (w.want === 'full' && !s.has.full) this.fetch(s, 'full');
      for (const level of ['half', 'full'] as const) {
        const bm = s.ready[level];
        if (!bm || (installed && performance.now() >= deadline)) continue;
        s.ready[level] = null;
        const wanted = level === 'full' ? w.want === 'full' : w.want !== 'none' && (keepHalf || !s.has.full);
        if (wanted && !s.has[level]) {
          this.install(s, level, bm);
          installed = true;
        } else bm.close();
      }
      // Never a hole: the full texture goes only once the half one exists (or none is wanted).
      // Drops share the frame budget (freeing many baked canvases at once is a GC spike).
      const mayDrop = !installed || performance.now() < deadline;
      if (mayDrop && s.has.full && !w.keepFull && s.baked.blob && (s.has.half || !w.keepHalf)) {
        this.drop(s, 'full');
        installed = true;
      }
      if (s.has.half && !keepHalf && (s.has.full || !w.keepHalf)) this.drop(s, 'half');
      this.show(s, w.show);
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const s of this.slots) {
      s.image.destroy();
      for (const level of ['full', 'half'] as const) {
        if (this.scene.textures.exists(s.keys[level])) this.scene.textures.remove(s.keys[level]);
        s.bitmap[level]?.close();
        s.ready[level]?.close();
      }
    }
  }

  /** Starts decoding the stored PNG at `level` (once; the result waits in `ready`). */
  private fetch(s: Slot, level: Level): void {
    const blob = s.baked.blob;
    if (!blob || s.decoding[level] || s.ready[level]) return;
    s.decoding[level] = true;
    const decode =
      level === 'full'
        ? createImageBitmap(blob)
        : createImageBitmap(blob, { resizeWidth: Math.ceil(s.rect.w / 2), resizeHeight: Math.ceil(s.rect.h / 2), resizeQuality: 'high' });
    void decode.then((bm) => {
      s.decoding[level] = false;
      if (this.destroyed) bm.close();
      else s.ready[level] = bm;
    });
  }

  private install(s: Slot, level: Level, bm: ImageBitmap): void {
    const key = s.keys[level];
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    // 3rd-party interop: Phaser uploads any TexImageSource; an ImageBitmap skips the canvas readback.
    this.scene.textures.addImage(key, bm as unknown as HTMLImageElement);
    attachNormalMap(this.scene, key, s.baked.normal ?? flatGroundNormal());
    s.bitmap[level] = bm;
    s.has[level] = true;
  }

  /** Removes a texture after moving the image off it (a removed texture must not stay on a game object). */
  private drop(s: Slot, level: Level): void {
    s.has[level] = false;
    const key = s.keys[level];
    if (s.shown === key) this.show(s, false);
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    s.bitmap[level]?.close();
    s.bitmap[level] = null;
    if (level === 'full') s.baked.canvas = null;
  }

  /** Points the image at its best resident texture, drawn at the chunk's world size. */
  private show(s: Slot, inView: boolean): void {
    const key = s.has.full ? s.keys.full : s.has.half ? s.keys.half : BLANK;
    if (s.shown !== key) {
      s.image.setTexture(key);
      if (key !== BLANK) s.image.setDisplaySize(s.rect.w, s.rect.h);
      s.shown = key;
    }
    s.image.setVisible(inView && key !== BLANK);
  }
}
