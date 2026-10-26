import { ART_SCALE, ellipse, makeCanvas, poly, type Ctx } from './canvas';
import { rng } from './palette';

/**
 * Procedural combat VFX textures: projectiles, their shadow and trail,
 * muzzle flash, gun smoke, scorch decal and debris. Painted at
 * ART_SCALE like the world sprites (displayed at 1 / ART_SCALE) except
 * the particle textures, which are soft enough at 1×. Unlit (VFX stay
 * off the light pipeline; flashes light the world instead).
 */

const S = ART_SCALE;

function scaled(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const out = makeCanvas(w * S, h * S);
  out.ctx.scale(S, S);
  return out;
}

/** Arrow pointing +x: steel head, ash shaft, red-white fletching. 30×6 world px. */
export function paintArrow(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(30, 6);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = 1.9;
  line(ctx, 3, 3, 25, 3);
  ctx.strokeStyle = '#d9b67c';
  ctx.lineWidth = 1.1;
  line(ctx, 3, 2.8, 25, 2.8);
  ctx.fillStyle = '#e9e4da';
  poly(ctx, [[1, 0.6], [7, 2.6], [5, 3], [0, 1.6]]);
  ctx.fill();
  ctx.fillStyle = '#b8402f';
  poly(ctx, [[1, 5.4], [7, 3.4], [5, 3], [0, 4.4]]);
  ctx.fill();
  ctx.fillStyle = '#2a2b2f';
  poly(ctx, [[24, 1.2], [30, 3], [24, 4.8], [25.4, 3]]);
  ctx.fill();
  ctx.fillStyle = '#c9ccd2';
  poly(ctx, [[25, 1.9], [29.2, 2.9], [25.6, 3]]);
  ctx.fill();
  return canvas;
}

/** Crossbow bolt: short, thick, square head, leather vanes. 20×6. */
export function paintBolt(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(20, 6);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2e2116';
  ctx.lineWidth = 2.6;
  line(ctx, 3, 3, 15, 3);
  ctx.strokeStyle = '#a77b4c';
  ctx.lineWidth = 1.5;
  line(ctx, 3, 2.7, 15, 2.7);
  ctx.fillStyle = '#6b4a2e';
  poly(ctx, [[1, 0.8], [6, 2.4], [6, 3.6], [1, 5.2]]);
  ctx.fill();
  ctx.fillStyle = '#34363b';
  poly(ctx, [[14, 1], [20, 3], [14, 5]]);
  ctx.fill();
  ctx.fillStyle = '#b9bdc4';
  poly(ctx, [[15, 1.9], [19, 2.9], [15, 3]]);
  ctx.fill();
  return canvas;
}

/** Musket ball streak: hot white head, warm tail fading to nothing. 28×4. */
export function paintBulletStreak(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(28, 4);
  const g = ctx.createLinearGradient(0, 0, 28, 0);
  g.addColorStop(0, 'rgba(255,200,120,0)');
  g.addColorStop(0.7, 'rgba(255,224,160,.55)');
  g.addColorStop(1, 'rgba(255,250,230,1)');
  ctx.fillStyle = g;
  ellipse(ctx, 14, 2, 14, 1.1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,245,1)';
  ellipse(ctx, 26, 2, 2, 1.6);
  ctx.fill();
  return canvas;
}

/** Iron cannonball with a specular glint. 11×11. */
export function paintCannonball(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(11, 11);
  const g = ctx.createRadialGradient(4, 3.8, 0.4, 5.5, 5.5, 5.4);
  g.addColorStop(0, '#9a948c');
  g.addColorStop(0.35, '#4b4743');
  g.addColorStop(1, '#0d0c0b');
  ctx.fillStyle = g;
  ellipse(ctx, 5.5, 5.5, 5, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,235,.85)';
  ellipse(ctx, 3.8, 3.4, 1, 0.8);
  ctx.fill();
  return canvas;
}

/** Soft horizontal streak, brightest at the right (head) end; tinted per use. 40×8. */
export function paintTrail(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(40, 8);
  const g = ctx.createLinearGradient(0, 0, 40, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,.9)');
  ctx.fillStyle = g;
  for (let k = 0; k < 4; k++) {
    ctx.globalAlpha = 0.3 + k * 0.18;
    ellipse(ctx, 22, 4, 18 + 2 * (3 - k), 3.6 - k * 0.8);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Soft ground shadow blob. 16×8. */
export function paintSoftShadow(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(16, 8);
  ctx.save();
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(0,0,0,.75)');
  g.addColorStop(0.55, 'rgba(0,0,0,.4)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  ctx.restore();
  return canvas;
}

/** Muzzle flash cone pointing +x from its left-centre origin (additive). 44×24. */
export function paintMuzzleFlash(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(44, 24);
  const glow = ctx.createRadialGradient(8, 12, 0, 8, 12, 14);
  glow.addColorStop(0, 'rgba(255,240,200,.95)');
  glow.addColorStop(0.5, 'rgba(255,170,70,.45)');
  glow.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 44, 24);
  const spike = (len: number, spread: number, rot: number, color: string): void => {
    ctx.fillStyle = color;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const p = (x: number, y: number): [number, number] => [3 + x * c - y * s, 12 + x * s + y * c];
    poly(ctx, [p(0, -spread), p(len, 0), p(0, spread)]);
    ctx.fill();
  };
  spike(40, 4.4, 0, 'rgba(255,190,90,.75)');
  spike(30, 3.2, -0.42, 'rgba(255,170,70,.55)');
  spike(30, 3.2, 0.42, 'rgba(255,170,70,.55)');
  spike(26, 2.4, 0, 'rgba(255,248,220,1)');
  ctx.fillStyle = 'rgba(255,255,250,1)';
  ellipse(ctx, 7, 12, 5, 3.6);
  ctx.fill();
  return canvas;
}

/** Billowing gun smoke puff (particle, 1×): lumpy, light grey, soft rim. 56×56. */
export function paintGunSmoke(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(56, 56);
  const rand = rng(7);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * 11;
    const x = 28 + Math.cos(a) * d;
    const y = 28 + Math.sin(a) * d;
    const r = 10 + rand() * 9;
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, 'rgba(250,248,243,.9)');
    g.addColorStop(0.6, 'rgba(214,210,202,.55)');
    g.addColorStop(1, 'rgba(170,166,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 56, 56);
  }
  return canvas;
}

/** Blast scorch on the ground (iso ellipse): charred core, radial streaks. 84×42. */
export function paintScorch(): HTMLCanvasElement {
  const { canvas, ctx } = scaled(84, 42);
  const rand = rng(31);
  ctx.save();
  ctx.translate(42, 21);
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
  g.addColorStop(0, 'rgba(16,11,8,.85)');
  g.addColorStop(0.35, 'rgba(28,20,14,.7)');
  g.addColorStop(0.7, 'rgba(52,38,26,.3)');
  g.addColorStop(1, 'rgba(48,36,26,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();
  // Soft blast rays, then charred clods; kept low-contrast so it reads as burnt earth.
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
    const r0 = 10 + rand() * 6;
    const r1 = 22 + rand() * 12;
    ctx.strokeStyle = `rgba(26,18,12,${0.1 + rand() * 0.14})`;
    ctx.lineWidth = 4 + rand() * 5;
    line(ctx, Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
  }
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 22;
    ctx.fillStyle = `rgba(20,14,10,${0.18 + rand() * 0.22})`;
    ellipse(ctx, Math.cos(a) * r, Math.sin(a) * r, 1.5 + rand() * 3, 1.5 + rand() * 3);
    ctx.fill();
  }
  ctx.restore();
  return canvas;
}

/** Clod of earth / stone chip (particle, 1×). 8×8. */
export function paintDebris(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(8, 8);
  ctx.fillStyle = '#3d2f22';
  poly(ctx, [[1, 3], [4, 0.5], [7.5, 2.5], [6.5, 6.5], [2.5, 7.5]]);
  ctx.fill();
  ctx.fillStyle = '#7a6448';
  poly(ctx, [[2, 3], [4, 1.5], [6, 2.8], [4, 4]]);
  ctx.fill();
  return canvas;
}

/** Large warm glow (particle, additive). 64×64. */
export function paintGlow(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,246,214,1)');
  g.addColorStop(0.25, 'rgba(255,196,96,.75)');
  g.addColorStop(0.6, 'rgba(255,120,40,.22)');
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
