import type Phaser from 'phaser';

/**
 * Sprites (units, buildings, decor) are painted at 2× and displayed at
 * 0.5 scale so they stay crisp when the camera zooms in.
 */
export const ART_SCALE = 2;

/** Transparent rows below a building's front corner, in texture px. */
export const BUILDING_BOTTOM_PAD = 10;

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: Ctx;
} {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

/** Registers a canvas as a Phaser texture, replacing any existing one. */
export function registerCanvas(
  scene: Phaser.Scene,
  key: string,
  canvas: HTMLCanvasElement,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/**
 * Registers a horizontal strip of equally-sized frames as one texture
 * with numeric frame names 0..count-1.
 */
export function registerStrip(
  scene: Phaser.Scene,
  key: string,
  canvas: HTMLCanvasElement,
  frameWidth: number,
  count: number,
): void {
  registerCanvas(scene, key, canvas);
  const tex = scene.textures.get(key);
  for (let i = 0; i < count; i++) {
    tex.add(i, 0, i * frameWidth, 0, frameWidth, canvas.height);
  }
}

export function poly(ctx: Ctx, pts: ReadonlyArray<readonly [number, number]>): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

export function ellipse(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

/** Soft elliptical drop shadow (radial gradient). */
export function softShadow(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.35,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(10,14,8,${alpha})`);
  g.addColorStop(0.6, `rgba(10,14,8,${alpha * 0.6})`);
  g.addColorStop(1, 'rgba(10,14,8,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
