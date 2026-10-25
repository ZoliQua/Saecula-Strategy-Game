import { ellipse, makeCanvas, softShadow, type Ctx } from './canvas';
import { css, mix, rng, shade } from './palette';

export interface DecorArt {
  readonly canvas: HTMLCanvasElement;
  /** Origin Y (0..1) so the base lands on the tile centre. */
  readonly originY: number;
}

export const TREE_VARIANTS = 6;
export const ROCK_VARIANTS = 3;
export const BUSH_VARIANTS = 3;

/** Tree variants: even = conifer, odd = broadleaf. */
export function paintTree(variant: number): DecorArt {
  const W = 104;
  const H = 156;
  const baseY = 140;
  const { canvas, ctx } = makeCanvas(W, H);
  const r = rng(1000 + variant * 17);
  const cx = W / 2 + (r() - 0.5) * 6;
  softShadow(ctx, cx + 6, baseY, 30, 11, 0.42);
  // Trunk.
  const tg = ctx.createLinearGradient(cx - 5, 0, cx + 5, 0);
  tg.addColorStop(0, '#8a5a32');
  tg.addColorStop(1, '#4a2e18');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(cx - 5, baseY);
  ctx.lineTo(cx - 3, baseY - 40);
  ctx.lineTo(cx + 3, baseY - 40);
  ctx.lineTo(cx + 5, baseY);
  ctx.closePath();
  ctx.fill();
  if (variant % 2 === 0) conifer(ctx, cx, baseY, r, variant);
  else broadleaf(ctx, cx, baseY, r, variant);
  return { canvas, originY: baseY / H };
}

function conifer(ctx: Ctx, cx: number, baseY: number, r: () => number, variant: number): void {
  const base = mix(0x2f5a32, 0x3b6b3a, (variant % 3) / 2);
  const tiers = 4;
  const top = baseY - 120 - r() * 10;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const yBottom = baseY - 22 - t * 80;
    const half = 34 - t * 20;
    const yTop = i === tiers - 1 ? top : yBottom - 46;
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
}

function broadleaf(ctx: Ctx, cx: number, baseY: number, r: () => number, variant: number): void {
  const base = mix(0x4a7a34, 0x6b8a2e, ((variant >> 1) % 3) / 2);
  const cy = baseY - 78;
  const blobs: Array<[number, number, number]> = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 20;
    blobs.push([cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.9, 17 + r() * 9]);
  }
  blobs.sort((a, b) => a[1] - b[1]);
  // Dark silhouette first gives every blob a soft outline.
  for (const [x, y, rad] of blobs) {
    ellipse(ctx, x, y, rad + 1.5, rad * 0.92 + 1.5);
    ctx.fillStyle = css(shade(base, 0.4));
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
  // Leaf speckle highlights.
  for (let i = 0; i < 40; i++) {
    const x = cx + (r() - 0.6) * 50;
    const y = cy + (r() - 0.7) * 44;
    ctx.fillStyle = css(shade(base, 1.6), 0.5);
    ctx.fillRect(x, y, 2, 2);
  }
}

export function paintStump(): DecorArt {
  const { canvas, ctx } = makeCanvas(48, 40);
  softShadow(ctx, 26, 30, 14, 5, 0.35);
  ctx.fillStyle = '#5e3b20';
  ctx.fillRect(16, 20, 16, 10);
  ellipse(ctx, 24, 20, 8, 4);
  ctx.fillStyle = '#d6ac72';
  ctx.fill();
  ctx.strokeStyle = '#8a5a32';
  ctx.lineWidth = 1;
  ellipse(ctx, 24, 20, 4, 2);
  ctx.stroke();
  return { canvas, originY: 30 / 40 };
}

export function paintGoldRocks(variant: number): DecorArt {
  const W = 104;
  const H = 88;
  const baseY = 70;
  const { canvas, ctx } = makeCanvas(W, H);
  const r = rng(500 + variant * 13);
  softShadow(ctx, W / 2 + 4, baseY, 40, 13, 0.4);
  const rocks: Array<[number, number, number]> = [];
  for (let i = 0; i < 5; i++) {
    rocks.push([W / 2 + (r() - 0.5) * 50, baseY - 6 - r() * 18, 12 + r() * 10]);
  }
  rocks.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s] of rocks) {
    const pts: Array<[number, number]> = [];
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rad = s * (0.8 + r() * 0.35);
      pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad * 0.75 - (Math.sin(a) < 0 ? s * 0.25 : 0)]);
    }
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    const g = ctx.createLinearGradient(x - s, y - s, x + s, y + s);
    g.addColorStop(0, '#b9ad98');
    g.addColorStop(0.5, '#8a7e6c');
    g.addColorStop(1, '#4f473d');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,24,18,.7)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Gold veins and nuggets.
    for (let k = 0; k < 4; k++) {
      const gx = x + (r() - 0.5) * s;
      const gy = y + (r() - 0.6) * s * 0.7;
      ellipse(ctx, gx, gy, 2.5 + r() * 2.5, 1.8 + r() * 1.5);
      const gg = ctx.createRadialGradient(gx - 1, gy - 1, 0, gx, gy, 4);
      gg.addColorStop(0, '#fff5bf');
      gg.addColorStop(0.5, '#f0c23c');
      gg.addColorStop(1, '#a8741c');
      ctx.fillStyle = gg;
      ctx.fill();
    }
  }
  return { canvas, originY: baseY / H };
}

export function paintBerryBush(variant: number): DecorArt {
  const W = 84;
  const H = 70;
  const baseY = 56;
  const { canvas, ctx } = makeCanvas(W, H);
  const r = rng(700 + variant * 11);
  softShadow(ctx, W / 2 + 3, baseY, 30, 10, 0.38);
  const base = 0x3f6e2e;
  for (let i = 0; i < 7; i++) {
    const x = W / 2 + (r() - 0.5) * 34;
    const y = baseY - 14 - r() * 14;
    const rad = 11 + r() * 6;
    const g = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, rad);
    g.addColorStop(0, css(shade(base, 1.5)));
    g.addColorStop(1, css(shade(base, 0.7)));
    ellipse(ctx, x, y, rad, rad * 0.85);
    ctx.fillStyle = g;
    ctx.fill();
  }
  for (let i = 0; i < 22; i++) {
    const x = W / 2 + (r() - 0.5) * 44;
    const y = baseY - 10 - r() * 26;
    ellipse(ctx, x, y, 2.3, 2.3);
    ctx.fillStyle = i % 4 === 0 ? '#7a1a3a' : '#d0303a';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillRect(x - 1, y - 1.2, 1, 1);
  }
  return { canvas, originY: baseY / H };
}
