import { ellipse, makeCanvas, softShadow } from './canvas';
import { css, rng, shade } from './palette';

export interface DecorArt {
  readonly canvas: HTMLCanvasElement;
  /** Origin Y (0..1) so the base lands on the tile centre. */
  readonly originY: number;
}

export const ROCK_VARIANTS = 3;
export const BUSH_VARIANTS = 3;

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
