import type Phaser from 'phaser';
import { columnCover, type ColumnCover } from './coverage';

const cache = new WeakMap<Phaser.Textures.Frame, ColumnCover | null>();

/**
 * Column coverage of a texture frame (read once from its canvas source,
 * then cached per frame object), or null when the source can't be read.
 */
export function frameCover(frame: Phaser.Textures.Frame): ColumnCover | null {
  const hit = cache.get(frame);
  if (hit !== undefined) return hit;
  let cover: ColumnCover | null = null;
  const src = frame.source.image;
  const w = frame.cutWidth;
  const h = frame.cutHeight;
  if (w > 0 && h > 0 && typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) {
    const data = src.getContext('2d', { willReadFrequently: false })?.getImageData(frame.cutX, frame.cutY, w, h).data;
    if (data) cover = columnCover((x, y) => data[(y * w + x) * 4 + 3] ?? 0, w, h);
  }
  cache.set(frame, cover);
  return cover;
}
