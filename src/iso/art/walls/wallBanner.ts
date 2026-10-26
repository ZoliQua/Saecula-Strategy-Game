import { makeCanvas } from '../canvas';

/** Banner cloth size, texture px (painted at ART_SCALE). */
export const WALL_BANNER_W = 20;
export const WALL_BANNER_H = 15;
/** Origin of the cloth: where it hangs on the pole (left edge, near the top). */
export const WALL_BANNER_ORIGIN = { x: 0.05, y: 0.12 } as const;

/**
 * White pennant cloth (shaded folds) tinted with the owner's colour on
 * top of wall posts: one tiny texture for every team instead of a
 * team variant of every wall piece.
 */
export function paintWallBanner(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(WALL_BANNER_W, WALL_BANNER_H);
  const w = WALL_BANNER_W;
  const h = WALL_BANNER_H - 3;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#d6d6d6');
  g.addColorStop(0.6, '#f4f4f4');
  g.addColorStop(1, '#a8a8a8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(1, 2);
  ctx.quadraticCurveTo(w * 0.5, -1, w, h * 0.3);
  ctx.lineTo(w * 0.78, h * 0.55);
  ctx.quadraticCurveTo(w * 0.5, h + 2, 1, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,40,.35)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  return canvas;
}
