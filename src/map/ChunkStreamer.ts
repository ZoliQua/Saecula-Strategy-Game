import type Phaser from 'phaser';
import { TERRAIN_STREAM } from '../config/visual';
import { attachNormalMap, flatGroundNormal } from '../iso/art/lighting/litTextures';
import { chunkWants, type ChunkRect, type WorldView } from './chunkPlan';
import type { BakedChunk } from './TerrainBake';

type Level = 'full' | 'half';

/** Decodes a stored chunk PNG, optionally resized (createImageBitmap; injectable for tests). */
export type ChunkDecoder = (blob: Blob, resize?: { readonly width: number; readonly height: number }) => Promise<ImageBitmap>;

const browserDecoder: ChunkDecoder = (blob, resize) =>
  resize
    ? createImageBitmap(blob, { resizeWidth: resize.width, resizeHeight: resize.height, resizeQuality: 'high' })
    : createImageBitmap(blob);

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
  /** Failed decodes per level, and the earliest retry. */
  readonly failures: Record<Level, number>;
  readonly retryAt: Record<Level, number>;
  shown: string;
}

/**
 * Keeps terrain chunk textures only where the camera can use them
 * (texture memory budget; a 128×128 map bakes ~95 MB of chunks).
 *
 * Terrain is never blank: every chunk keeps a tiny always-resident
 * 1/8-resolution texture (baked by TerrainBake, ~1.5 MB for a 128 map),
 * shown whenever nothing sharper is resident yet (camera jumps, a fast
 * zoom-out, a failed decode). Restores for a jump's destination start
 * in the first update after it.
 *
 * Every chunk is baked once, behind the loading card, and kept as a PNG
 * blob (~150 KB). Near the view a chunk holds its full-resolution texture;
 * in an outer ring, or everywhere when zoomed out below `lodZoom`, a
 * half-resolution one; far away nothing (chunkWants decides). Restores
 * are decoded, and halved, off the main thread (createImageBitmap) ahead
 * of the view margin; installing one is a texture upload of a bitmap
 * (~0.2 ms), done within TERRAIN_STREAM.budgetMs per frame. A full
 * texture is dropped only once its half one is resident, so panning
 * never drops below half resolution.
 */
export class ChunkStreamer {
  private readonly slots: Slot[];
  private destroyed = false;

  constructor(
    private readonly scene: Pick<Phaser.Scene, 'textures'>,
    baked: readonly BakedChunk[],
    private readonly decoder: ChunkDecoder = browserDecoder,
    private readonly now: () => number = () => performance.now(),
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
      failures: { full: 0, half: 0 },
      retryAt: { full: 0, half: 0 },
      shown: b.key,
    }));
  }

  /**
   * Resident textures, plus the CPU-side memory streaming holds (dev
   * diagnostics, memory tally): decoded bitmaps behind resident streamed
   * textures and the stored PNG blobs.
   */
  stats(): { full: number; half: number; chunks: number; bitmapBytes: number; blobBytes: number } {
    let bitmapBytes = 0;
    let blobBytes = 0;
    for (const s of this.slots) {
      for (const bm of [s.bitmap.full, s.bitmap.half, s.ready.full, s.ready.half]) if (bm) bitmapBytes += bm.width * bm.height * 4;
      blobBytes += s.baked.blob?.size ?? 0;
    }
    return {
      full: this.slots.filter((s) => s.has.full).length,
      half: this.slots.filter((s) => s.has.half).length,
      chunks: this.slots.length,
      bitmapBytes,
      blobBytes,
    };
  }

  update(view: WorldView, zoom: number): void {
    const deadline = this.now() + TERRAIN_STREAM.budgetMs;
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
        if (!bm || (installed && this.now() >= deadline)) continue;
        s.ready[level] = null;
        const wanted = level === 'full' ? w.want === 'full' : w.want !== 'none' && (keepHalf || !s.has.full);
        if (wanted && !s.has[level]) {
          this.install(s, level, bm);
          installed = true;
        } else bm.close();
      }
      // Never a hole: the full texture goes only once the half one exists (or none is wanted).
      // Drops share the frame budget (freeing many baked canvases at once is a GC spike).
      const mayDrop = !installed || this.now() < deadline;
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
        s.bitmap[level] = null;
        s.ready[level] = null;
      }
      if (this.scene.textures.exists(s.baked.lowKey)) this.scene.textures.remove(s.baked.lowKey);
    }
  }

  /**
   * Starts decoding the stored PNG at `level` (once; the result waits in
   * `ready`). A failed decode is retried after TERRAIN_STREAM.retryMs, at
   * most `decodeRetries` times; the low texture shows meanwhile.
   */
  private fetch(s: Slot, level: Level): void {
    const blob = s.baked.blob;
    if (!blob || s.decoding[level] || s.ready[level]) return;
    if (s.failures[level] > TERRAIN_STREAM.decodeRetries || this.now() < s.retryAt[level]) return;
    s.decoding[level] = true;
    const resize = level === 'half' ? { width: Math.ceil(s.rect.w / 2), height: Math.ceil(s.rect.h / 2) } : undefined;
    this.decoder(blob, resize).then(
      (bm) => {
        s.decoding[level] = false;
        if (this.destroyed) bm.close();
        else s.ready[level] = bm;
      },
      () => {
        s.decoding[level] = false;
        s.failures[level]++;
        s.retryAt[level] = this.now() + TERRAIN_STREAM.retryMs;
      },
    );
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

  /** Points the image at its best resident texture (at worst the low one), drawn at the chunk's world size. */
  private show(s: Slot, inView: boolean): void {
    const key = s.has.full ? s.keys.full : s.has.half ? s.keys.half : s.baked.lowKey;
    if (s.shown !== key) {
      s.image.setTexture(key);
      s.image.setDisplaySize(s.rect.w, s.rect.h);
      s.shown = key;
    }
    s.image.setVisible(inView);
  }
}
