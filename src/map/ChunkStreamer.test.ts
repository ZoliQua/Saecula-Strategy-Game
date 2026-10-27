import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { TERRAIN_STREAM } from '../config/visual';
import { ChunkStreamer, type ChunkDecoder } from './ChunkStreamer';
import type { BakedChunk } from './TerrainBake';

/** Phaser's TextureManager, reduced to what the streamer and attachNormalMap use. */
function fakeTextures(initial: string[]) {
  const keys = new Set(initial);
  const removed: string[] = [];
  return {
    keys,
    removed,
    textures: {
      exists: (k: string) => keys.has(k),
      remove: (k: string) => {
        keys.delete(k);
        removed.push(k);
      },
      addImage: (k: string) => keys.add(k),
      get: () => ({ setDataSource: () => undefined }),
    },
  };
}

function fakeImage() {
  const img = {
    key: 'terrain_chunk_0_0',
    visible: true,
    destroyed: false,
    setTexture(k: string) { img.key = k; return img; },
    setDisplaySize() { return img; },
    setVisible(v: boolean) { img.visible = v; return img; },
    destroy() { img.destroyed = true; },
  };
  return img;
}

function fakeBitmap(width: number, height: number) {
  return { width, height, closed: false, close() { this.closed = true; } };
}

/** A decoder whose calls stay pending until the test settles them. */
function controlledDecoder() {
  const calls: Array<{ half: boolean; resolve: () => ReturnType<typeof fakeBitmap>; reject: () => void }> = [];
  const decoder: ChunkDecoder = (_blob, resize) =>
    new Promise((resolve, reject) => {
      calls.push({
        half: resize !== undefined,
        resolve: () => {
          const bm = resize ? fakeBitmap(resize.width, resize.height) : fakeBitmap(520, 520);
          resolve(bm as unknown as ImageBitmap);
          return bm;
        },
        reject: () => reject(new Error('decode failed')),
      });
    });
  return { decoder, calls };
}

function setup() {
  const key = 'terrain_chunk_0_0';
  const tm = fakeTextures([key, `${key}~low`]);
  const image = fakeImage();
  const baked: BakedChunk = {
    image: image as unknown as Phaser.GameObjects.Image,
    key,
    lowKey: `${key}~low`,
    rect: { x: 0, y: 0, w: 520, h: 520 },
    normal: {} as HTMLCanvasElement,
    canvas: null,
    blob: new Blob(['png']),
  };
  const dec = controlledDecoder();
  let clock = 0;
  const streamer = new ChunkStreamer({ textures: tm.textures } as unknown as Pick<Phaser.Scene, 'textures'>, [baked], dec.decoder, () => clock);
  const advance = (ms: number) => (clock += ms);
  const inView = { x: 0, y: 0, width: 1000, height: 600 };
  const far = { x: 20_000, y: 0, width: 1000, height: 600 };
  const settle = () => new Promise((r) => setTimeout(r, 0));
  return { key, tm, image, streamer, dec, advance, inView, far, settle };
}

describe('ChunkStreamer', () => {
  it('evicts a far chunk to its low texture (never blank) and drops the full texture', () => {
    const { key, tm, image, streamer, far } = setup();
    streamer.update(far, 1);
    expect(tm.keys.has(key)).toBe(false);
    expect(image.key).toBe(`${key}~low`);
    expect(streamer.stats().full).toBe(0);
  });

  it('re-requests a chunk coming back into view: low at once, then half and full as decodes land', async () => {
    const { key, tm, image, streamer, dec, far, inView, settle } = setup();
    streamer.update(far, 1);
    streamer.update(inView, 1);
    expect(image.key).toBe(`${key}~low`);
    expect(image.visible).toBe(true);
    expect(dec.calls.map((c) => c.half).sort()).toEqual([false, true]);
    for (const c of dec.calls) c.resolve();
    await settle();
    streamer.update(inView, 1);
    expect(image.key).toBe(key);
    expect(tm.keys.has(key)).toBe(true);
    // The half texture is redundant next to the full one: gone by the next frame.
    streamer.update(inView, 1);
    expect(tm.keys.has(`${key}~half`)).toBe(false);
  });

  it('a failed decode keeps the low texture and is retried after retryMs, a bounded number of times', async () => {
    const { key, image, streamer, dec, far, inView, advance, settle } = setup();
    streamer.update(far, 1);
    for (let round = 0; round <= TERRAIN_STREAM.decodeRetries + 1; round++) {
      streamer.update(inView, 1);
      for (const c of dec.calls.splice(0)) c.reject();
      await settle();
      expect(image.key).toBe(`${key}~low`);
      advance(TERRAIN_STREAM.retryMs);
    }
    streamer.update(inView, 1);
    expect(dec.calls).toHaveLength(0);
  });

  it('shutdown frees every texture (low too) and closes bitmaps that land afterwards', async () => {
    const { key, tm, image, streamer, dec, far, inView, settle } = setup();
    streamer.update(far, 1);
    streamer.update(inView, 1);
    streamer.destroy();
    expect(image.destroyed).toBe(true);
    expect(tm.keys.size).toBe(0);
    expect(tm.removed).toContain(`${key}~low`);
    const late = dec.calls.map((c) => c.resolve());
    await settle();
    expect(late.every((bm) => bm.closed)).toBe(true);
  });
});
