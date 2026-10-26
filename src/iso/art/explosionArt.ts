import { ART_SCALE, ellipse, makeCanvas, type Ctx } from './canvas';
import { rng } from './palette';

/** Explosion sheet: frame count and world-px frame size (painted at ART_SCALE). */
export const EXPLOSION_FRAMES = 9;
export const EXPLOSION_SIZE = 96;
/** Ground point inside a frame (fraction of height): the blast sits on it. */
export const EXPLOSION_ORIGIN_Y = 0.78;

interface Blob {
  readonly a: number;
  readonly d: number;
  readonly r: number;
  readonly rise: number;
  readonly hue: number;
}

/**
 * Cannon-shell blast as a horizontal strip of EXPLOSION_FRAMES frames:
 * white-hot flash → orange fireball → billowing fire that browns into a
 * rising, thinning smoke column. A dirt skirt spreads along the ground.
 * The same seeded blobs are reused in every frame, so the sequence
 * reads as one cloud evolving rather than flickering noise.
 */
export function paintExplosionStrip(): HTMLCanvasElement {
  const F = EXPLOSION_SIZE;
  const { canvas, ctx } = makeCanvas(F * EXPLOSION_FRAMES * ART_SCALE, F * ART_SCALE);
  ctx.scale(ART_SCALE, ART_SCALE);
  const rand = rng(1913);
  const blobs: Blob[] = Array.from({ length: 16 }, () => ({
    a: rand() * Math.PI * 2,
    d: 0.3 + rand() * 0.7,
    r: 0.4 + rand() * 0.45,
    rise: 0.4 + rand() * 0.9,
    hue: rand(),
  }));
  for (let f = 0; f < EXPLOSION_FRAMES; f++) {
    ctx.save();
    ctx.translate(f * F, 0);
    ctx.beginPath();
    ctx.rect(0, 0, F, F);
    ctx.clip();
    paintFrame(ctx, f / (EXPLOSION_FRAMES - 1), blobs);
    ctx.restore();
  }
  return canvas;
}

function paintFrame(ctx: Ctx, p: number, blobs: readonly Blob[]): void {
  const F = EXPLOSION_SIZE;
  const gx = F / 2;
  const gy = F * EXPLOSION_ORIGIN_Y;
  const grow = 1 - Math.pow(1 - Math.min(1, p * 1.6), 3);
  const R = F * (0.12 + 0.24 * grow);
  const heat = Math.max(0, 1 - p * 1.55);
  const fade = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.45);

  // Dirt skirt thrown along the ground.
  ctx.fillStyle = `rgba(120,96,66,${0.55 * fade})`;
  ellipse(ctx, gx, gy, R * 1.5, R * 0.45);
  ctx.fill();
  ctx.fillStyle = `rgba(92,72,50,${0.45 * fade})`;
  ellipse(ctx, gx, gy - 1, R * 1.05, R * 0.3);
  ctx.fill();

  // Hot bloom behind everything in the first frames.
  if (heat > 0.4) {
    const b = ctx.createRadialGradient(gx, gy - R * 0.6, 0, gx, gy - R * 0.6, R * 2);
    b.addColorStop(0, `rgba(255,236,170,${heat * 0.9})`);
    b.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, F, F);
  }

  const cy = gy - R * 0.55 - p * F * 0.2;
  for (const bl of blobs) {
    const bx = gx + Math.cos(bl.a) * bl.d * R * 1.05;
    const by = cy + Math.sin(bl.a) * bl.d * R * 0.75 - bl.rise * p * F * 0.16;
    const br = R * bl.r * (0.8 + p * 0.7);
    const t = Math.min(1, heat + (1 - bl.d) * 0.35 * heat);
    const smoke = mixRgb([88, 78, 70], [46, 40, 36], bl.hue);
    const fire = mixRgb([255, 150, 50], [230, 90, 30], bl.hue);
    const core = mixRgb(smoke, fire, t);
    const rim = mixRgb(smoke, [150, 60, 25], t * 0.7);
    const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br);
    g.addColorStop(0, rgba(mixRgb(core, [255, 230, 170], t * t), fade));
    g.addColorStop(0.65, rgba(core, fade * 0.92));
    g.addColorStop(1, rgba(rim, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // White-hot core, collapsing as the fireball cools.
  if (heat > 0) {
    const cr = R * (0.85 - p * 0.5);
    const g = ctx.createRadialGradient(gx, cy + R * 0.15, 0, gx, cy + R * 0.15, cr);
    g.addColorStop(0, `rgba(255,252,235,${heat})`);
    g.addColorStop(0.5, `rgba(255,214,120,${heat * 0.85})`);
    g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, cy + R * 0.15, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Embers flung out early on.
  if (p > 0.05 && p < 0.6) {
    const rand = rng(77);
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI * (0.1 + rand() * 0.8);
      const d = R * (0.8 + rand() * 1.4) * (0.6 + p);
      ctx.fillStyle = `rgba(255,${200 + Math.floor(rand() * 50)},120,${(1 - p / 0.6) * 0.95})`;
      ctx.fillRect(gx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 1.4, 1.4);
    }
  }
}

type Rgb3 = readonly [number, number, number];

function mixRgb(a: Rgb3, b: Rgb3, t: number): Rgb3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgba(c: Rgb3, a: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a))})`;
}
