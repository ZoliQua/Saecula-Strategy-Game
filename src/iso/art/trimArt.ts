import type { LitArt } from './lighting/normalLayer';

/** A crop of a painted canvas, in its px. */
export interface TrimRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The part of a painted building canvas worth keeping as a texture: the
 * empty rows above the art and equal empty margins left and right go,
 * the bottom stays. Sprites are anchored bottom-centre (origin x 0.5,
 * BUILDING_BOTTOM_PAD above the bottom), so the crop moves nothing on
 * screen. Painters size canvases for their tallest variant plus a
 * foot-shadow margin, which left a quarter to three quarters of every
 * building / wall texture transparent.
 */
export function trimRect(rgba: Uint8ClampedArray, width: number, height: number): TrimRect {
  let x0 = width;
  let x1 = -1;
  let y0 = height;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if ((rgba[row + x * 4 + 3] ?? 0) === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
    }
  }
  if (x1 < 0) return { left: 0, top: 0, width, height };
  const left = Math.min(x0, width - 1 - x1);
  return { left, top: y0, width: width - 2 * left, height: height - y0 };
}

/** A copy of `rect` of `canvas` (the canvas itself when nothing is cut). */
export function cropCanvas(canvas: HTMLCanvasElement, rect: TrimRect): HTMLCanvasElement {
  if (rect.left === 0 && rect.top === 0 && rect.width === canvas.width && rect.height === canvas.height) return canvas;
  const out = document.createElement('canvas');
  out.width = rect.width;
  out.height = rect.height;
  out.getContext('2d')?.drawImage(canvas, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return out;
}

/** Trims painted art (albedo, normal map, texture-px glows and volume) to its content; see trimRect. */
export function trimLitArt(art: LitArt): { art: LitArt; rect: TrimRect } {
  const { canvas } = art;
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    return { art, rect: { left: 0, top: 0, width: canvas.width, height: canvas.height } };
  }
  const rect = trimRect(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  const { left, top } = rect;
  return {
    rect,
    art: {
      ...art,
      canvas: cropCanvas(canvas, rect),
      normal: art.normal && cropCanvas(art.normal, rect),
      glows: art.glows.map((g) => ({ ...g, x: g.x - left, y: g.y - top })),
      volume: art.volume.map((p) => ({ ...p, gx: p.gx - left, gy: p.gy - top })),
    },
  };
}
