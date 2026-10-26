import { ellipse, makeCanvas, softShadow, type Ctx } from './canvas';
import { css, mix, rng, shade } from './palette';

/**
 * Tree designs: 0/2/4 conifer, 1/3/5 broadleaf, 6 birch, 7 tall spruce.
 * The atlas holds every design twice (as painted, then mirrored) so the
 * forest renderer never flips sprites (a flip breaks the lit batch).
 */
export const TREE_VARIANTS = 8;
export const TREE_FRAMES = TREE_VARIANTS * 2;

const W = 104;
const H = 156;
const BASE_Y = 140;
const PAD = 2;

export interface TreeAtlas {
  readonly canvas: HTMLCanvasElement;
  /** Frame rects (texture px) for frame = variant × 2 + mirrored. */
  readonly frames: ReadonlyArray<{ x: number; y: number; w: number; h: number }>;
  /** Origin Y (0..1) placing the trunk base on the tile point. */
  readonly originY: number;
}

/** All tree frames in one canvas (one texture, one normal map, one shadow map). */
export function paintTreeAtlas(): TreeAtlas {
  const cols = TREE_VARIANTS;
  const cellW = W + PAD * 2;
  const cellH = H + PAD * 2;
  const { canvas, ctx } = makeCanvas(cols * cellW, 2 * cellH);
  const frames: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let v = 0; v < TREE_VARIANTS; v++) {
    const art = paintTree(v);
    for (let m = 0; m < 2; m++) {
      const x = v * cellW + PAD;
      const y = m * cellH + PAD;
      ctx.save();
      if (m === 1) {
        ctx.translate(x + W, y);
        ctx.scale(-1, 1);
        ctx.drawImage(art, 0, 0);
      } else {
        ctx.drawImage(art, x, y);
      }
      ctx.restore();
      frames[v * 2 + m] = { x, y, w: W, h: H };
    }
  }
  return { canvas, frames, originY: BASE_Y / H };
}

export function paintTree(variant: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  const r = rng(1000 + variant * 17);
  const cx = W / 2 + (r() - 0.5) * 6;
  softShadow(ctx, cx + 6, BASE_Y, 30, 11, 0.42);
  trunk(ctx, cx, variant === 6 ? ['#e8e2d4', '#9a958a'] : ['#8a5a32', '#4a2e18'], variant === 7 ? 30 : 40);
  if (variant === 6) birch(ctx, cx, r);
  else if (variant === 7) spruce(ctx, cx, r);
  else if (variant % 2 === 0) conifer(ctx, cx, r, variant);
  else broadleaf(ctx, cx, r, variant);
  return canvas;
}

function trunk(ctx: Ctx, cx: number, [light, dark]: readonly [string, string], height: number): void {
  const tg = ctx.createLinearGradient(cx - 5, 0, cx + 5, 0);
  tg.addColorStop(0, light);
  tg.addColorStop(1, dark);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(cx - 5, BASE_Y);
  ctx.lineTo(cx - 3, BASE_Y - height);
  ctx.lineTo(cx + 3, BASE_Y - height);
  ctx.lineTo(cx + 5, BASE_Y);
  ctx.closePath();
  ctx.fill();
}

function tier(ctx: Ctx, cx: number, yTop: number, yBottom: number, half: number, base: number): void {
  const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  g.addColorStop(0, css(shade(base, 1.35)));
  g.addColorStop(0.45, css(shade(base, 1.0)));
  g.addColorStop(1, css(shade(base, 0.55)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, yTop);
  // Jagged needle edge.
  const steps = 7;
  for (let s = 0; s <= steps; s++) {
    const k = s / steps;
    ctx.lineTo(cx + half * k + (s % 2 ? 3 : -1), yTop + (yBottom - yTop) * k + (s % 2 ? -3 : 2));
  }
  ctx.quadraticCurveTo(cx, yBottom + 7, cx - half, yBottom);
  for (let s = steps; s >= 0; s--) {
    const k = s / steps;
    ctx.lineTo(cx - half * k - (s % 2 ? 3 : -1), yTop + (yBottom - yTop) * k + (s % 2 ? -3 : 2));
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(16,30,14,.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function conifer(ctx: Ctx, cx: number, r: () => number, variant: number): void {
  const base = mix(0x2f5a32, 0x3b6b3a, (variant % 3) / 2);
  const tiers = 4;
  const top = BASE_Y - 120 - r() * 10;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const yBottom = BASE_Y - 22 - t * 80;
    tier(ctx, cx, i === tiers - 1 ? top : yBottom - 46, yBottom, 34 - t * 20, base);
  }
}

/** Tall, narrow, blue-dark spruce: more, slimmer tiers. */
function spruce(ctx: Ctx, cx: number, r: () => number): void {
  const base = 0x24493a;
  const tiers = 6;
  const top = BASE_Y - 136 - r() * 6;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const yBottom = BASE_Y - 18 - t * 100;
    tier(ctx, cx, i === tiers - 1 ? top : yBottom - 34, yBottom, 26 - t * 17, base);
  }
}

function blobCanopy(ctx: Ctx, blobs: Array<[number, number, number]>, base: number, rim: number): void {
  blobs.sort((a, b) => a[1] - b[1]);
  // Dark silhouette first gives every blob a soft outline.
  for (const [x, y, rad] of blobs) {
    ellipse(ctx, x, y, rad + 1.5, rad * 0.92 + 1.5);
    ctx.fillStyle = css(shade(base, rim));
    ctx.fill();
  }
  for (const [x, y, rad] of blobs) {
    const g = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.45, rad * 0.1, x, y, rad);
    g.addColorStop(0, css(shade(base, 1.45)));
    g.addColorStop(0.6, css(shade(base, 1.0)));
    g.addColorStop(1, css(shade(base, 0.68)));
    ellipse(ctx, x, y, rad, rad * 0.92);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function broadleaf(ctx: Ctx, cx: number, r: () => number, variant: number): void {
  const base = mix(0x4a7a34, 0x6b8a2e, ((variant >> 1) % 3) / 2);
  const cy = BASE_Y - 78;
  const blobs: Array<[number, number, number]> = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 20;
    blobs.push([cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.9, 17 + r() * 9]);
  }
  blobCanopy(ctx, blobs, base, 0.4);
  // Leaf speckle highlights.
  for (let i = 0; i < 40; i++) {
    const x = cx + (r() - 0.6) * 50;
    const y = cy + (r() - 0.7) * 44;
    ctx.fillStyle = css(shade(base, 1.6), 0.5);
    ctx.fillRect(x, y, 2, 2);
  }
}

/** Birch: pale barked trunk, airy light-green crown of small clumps. */
function birch(ctx: Ctx, cx: number, r: () => number): void {
  ctx.fillStyle = '#2e2a24';
  for (let i = 0; i < 6; i++) ctx.fillRect(cx - 4 + r() * 4, BASE_Y - 6 - r() * 32, 3 + r() * 2, 1.2);
  const base = 0x86a53c;
  const cy = BASE_Y - 84;
  const blobs: Array<[number, number, number]> = [];
  for (let i = 0; i < 13; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 22;
    blobs.push([cx + Math.cos(a) * d * 0.85, cy + Math.sin(a) * d * 1.3, 10 + r() * 7]);
  }
  blobCanopy(ctx, blobs, base, 0.5);
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = css(shade(0xb8cf5a, 1 + r() * 0.3), 0.55);
    ctx.fillRect(cx + (r() - 0.5) * 40, cy + (r() - 0.6) * 56, 1.6, 1.6);
  }
}
