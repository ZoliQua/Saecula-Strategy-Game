import { HILL_MARK } from '../../config/visual';
import type { HillStatus } from '../../game/hillClocks';
import { ART_SCALE, ellipse, makeCanvas, poly, type Ctx } from './canvas';
import { css, shade } from './palette';

/*
 * The hill's standards (M19): small textures shared by every hill, with no
 * team variants (the flying flag is white cloth, tinted like the wall
 * banners).
 */

const S = ART_SCALE;
const M = HILL_MARK;

/** Frames of the waving cloths' strips. */
export const HILL_ART_FRAMES: number = M.flag.frames;

function scaled(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const out = makeCanvas(w * S, h * S);
  out.ctx.scale(S, S);
  return out;
}

/** The staff on its little cairn, a gilt spearhead on top. */
function paintPole(): HTMLCanvasElement {
  const { width, height, foot } = M.pole;
  const { canvas, ctx } = scaled(width, height);
  const x = width / 2;
  ctx.fillStyle = css(M.ink, 0.3);
  ellipse(ctx, x, foot, x, 3.4);
  ctx.fill();
  ctx.fillStyle = css(M.ink);
  ctx.fillRect(x - 1.7, 8, 3.4, foot - 8);
  ctx.fillStyle = css(M.wood);
  ctx.fillRect(x - 1.1, 8, 2.2, foot - 8);
  ctx.fillStyle = css(M.woodLight);
  ctx.fillRect(x - 1.1, 8, 0.9, foot - 8);
  for (const [dx, dy, r, light] of [[-3.4, 0, 2.7, 0.78], [3.2, 0.2, 2.5, 0.68], [0, 1.6, 2.8, 0.9]] as const) {
    ellipse(ctx, x + dx, foot + dy - 1, r, r * 0.72);
    ctx.fillStyle = css(shade(M.linenShade, light));
    ctx.fill();
    ctx.strokeStyle = css(M.ink, 0.55);
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  poly(ctx, [[x, 0.6], [x + 2.8, 5.4], [x, 9.6], [x - 2.8, 5.4]]);
  ctx.fillStyle = css(M.goldShade);
  ctx.fill();
  ctx.strokeStyle = css(M.ink);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  poly(ctx, [[x, 1.6], [x, 8.4], [x - 1.9, 5.4]]);
  ctx.fillStyle = css(M.gold);
  ctx.fill();
  return canvas;
}

/** Colour at (u, v) of the cloth, both 0..1 from the top of the hoist; null = cut away. */
type Weave = (u: number, v: number, light: number) => string | null;

/** A cloth flying from its left edge, one frame per phase of the wave. */
function paintWaving(weave: Weave): HTMLCanvasElement {
  const { width, height, top, cloth, wave, frames } = M.flag;
  const w = width * S;
  const rows = cloth * S;
  const { canvas, ctx } = makeCanvas(w * frames, height * S);
  for (let f = 0; f < frames; f++) {
    const phase = (f / frames) * Math.PI * 2;
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const swing = u * 5.2 - phase;
      const y0 = Math.round((top + wave * Math.min(1, u * 1.6) * Math.sin(swing) + u * 1.2) * S);
      // The folds catch the light where the cloth turns towards it.
      const light = 1 - 0.14 * Math.min(1, u * 2) * (1 + Math.cos(swing));
      for (let y = 0; y < rows; y++) {
        const color = weave(u, y / (rows - 1), light);
        if (color === null) continue;
        ctx.fillStyle = color;
        ctx.fillRect(f * w + x, y0 + y, 1, 1);
      }
    }
  }
  return canvas;
}

const grey = (level: number): string => css(shade(0xffffff, level));

/** The swallow-tailed flag with a mound on it; white, to be tinted with the holder's colour. */
function paintFlag(): HTMLCanvasElement {
  return paintWaving((u, v, light) => {
    const fromMiddle = Math.abs(v - 0.5);
    const notch = (u - 0.7) / 0.3;
    if (notch > 0 && fromMiddle < notch * 0.3) return null;
    if (v < 0.05 || v > 0.95 || u > 0.98) return grey(0.3);
    if (v < 0.16 || v > 0.84) return grey(light);
    const mound = 0.74 - 0.36 * Math.max(0, 1 - ((u - 0.35) / 0.2) ** 2);
    return grey(light * (u > 0.15 && u < 0.55 && v > mound && v < 0.74 ? 0.5 : 0.86));
  });
}

/** The contested rag: dark and bone stripes, the fly torn. */
function paintTorn(): HTMLCanvasElement {
  return paintWaving((u, v, light) => {
    const fringe = 0.94 - 0.3 * Math.abs(((v * 3.5) % 1) - 0.5) * 2;
    if (u > fringe) return null;
    if (v < 0.06 || v > 0.94 || u > fringe - 0.04) return css(M.ink);
    const dark = Math.floor(u * 4 + v * 2.2) % 2 === 1;
    return css(shade(dark ? M.ink : M.linen, dark ? light + 0.4 : light));
  });
}

/** An empty hill's standard: the cloth rolled up and tied to a crossbar. */
function paintFurled(): HTMLCanvasElement {
  const { width, height } = M.furled;
  const { canvas, ctx } = scaled(width, height);
  const x = width / 2;
  ctx.fillStyle = css(M.ink);
  ctx.fillRect(0.5, 1, width - 1, 3);
  ctx.fillStyle = css(M.woodLight);
  ctx.fillRect(1.3, 1.6, width - 2.6, 1.6);
  // The roll sags between its ties; a short end hangs loose.
  poly(ctx, [[2.5, 3.2], [x, 4.4], [width - 2.5, 3.2], [width - 3, 7.2], [x + 6, 9.4], [x + 7, 15.6], [x + 4.2, 13.2], [x + 1.8, 16.4], [x + 1.6, 10.2], [x, 10.4], [3, 7.6]]);
  ctx.fillStyle = css(M.linen);
  ctx.fill();
  ctx.strokeStyle = css(M.ink);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  poly(ctx, [[3.4, 6.4], [x, 8], [width - 3.4, 5.8], [width - 3.4, 6.8], [x + 5.4, 9], [x + 6, 13.6], [x + 4.2, 11.8], [x + 2.6, 9.6], [x, 9.6], [3.6, 7.2]]);
  ctx.fillStyle = css(M.linenShade, 0.85);
  ctx.fill();
  ctx.fillStyle = css(M.wood);
  for (const tie of [5.2, width - 7]) ctx.fillRect(tie, 1, 1.8, 7.6);
  return canvas;
}

/** Two crossed swords, points up, in a circle of radius `r` round (cx, cy). */
function drawSwords(ctx: Ctx, cx: number, cy: number, r: number): void {
  for (const side of [-1, 1]) {
    // Along the blade (hilt to point) and across it.
    const along = [side * Math.SQRT1_2, -Math.SQRT1_2] as const;
    const across = [-along[1], along[0]] as const;
    const at = (a: number, b: number) => [cx + r * (a * along[0] + b * across[0]), cy + r * (a * along[1] + b * across[1])] as const;
    const part = (pts: ReadonlyArray<readonly [number, number]>, fill: number): void => {
      poly(ctx, pts.map(([a, b]) => at(a, b)));
      ctx.strokeStyle = css(M.ink);
      ctx.lineWidth = r * 0.16;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.fillStyle = css(fill);
      ctx.fill();
    };
    part([[-0.58, -0.14], [0.78, -0.12], [1.2, 0], [0.78, 0.12], [-0.58, 0.14]], M.steel);
    part([[-1.12, -0.1], [-0.68, -0.1], [-0.68, 0.1], [-1.12, 0.1]], M.woodLight);
    part([[-0.72, -0.46], [-0.52, -0.46], [-0.52, 0.46], [-0.72, 0.46]], M.goldShade);
  }
}

function paintSwords(): HTMLCanvasElement {
  const { size } = M.swords;
  const { canvas, ctx } = scaled(size, size);
  drawSwords(ctx, size / 2, size / 2, size * 0.39);
  return canvas;
}

export const HILL_ART = { pole: paintPole, flag: paintFlag, torn: paintTorn, furled: paintFurled, swords: paintSwords } as const;

/**
 * The minimap's glyph standing on (cx, bottom), shaped as the world's
 * standard: rolled (empty), flying in `color` (held) or crossed swords
 * (contested).
 */
export function drawHillGlyph(ctx: Ctx, cx: number, bottom: number, w: number, h: number, status: HillStatus, color: number, line: number): void {
  ctx.save();
  if (status === 'contested') {
    drawSwords(ctx, cx, bottom - h / 2, h * 0.5);
  } else {
    const left = status === 'held' ? cx - w * 0.3 : cx;
    const top = bottom - h;
    ctx.fillStyle = css(M.ink);
    ctx.fillRect(left - line, top, 2 * line, h);
    const shape =
      status === 'held'
        ? ([[left, top], [left + w, top], [left + w * 0.72, top + h * 0.3], [left + w, top + h * 0.6], [left, top + h * 0.6]] as const)
        : ([[left - w * 0.5, top], [left + w * 0.5, top], [left + w * 0.42, top + h * 0.28], [left, top + h * 0.38], [left - w * 0.42, top + h * 0.28]] as const);
    poly(ctx, shape);
    ctx.fillStyle = css(status === 'held' ? color : M.linen);
    ctx.fill();
    ctx.strokeStyle = css(M.ink);
    ctx.lineWidth = line;
    ctx.stroke();
  }
  ctx.restore();
}
