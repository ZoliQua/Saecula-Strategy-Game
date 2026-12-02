import { CROWN } from '../../config/visual';
import { ART_SCALE, makeCanvas, poly, type Ctx } from './canvas';
import { css } from './palette';

/** The outline in a unit box (y down): three points over a band. */
const OUTLINE: ReadonlyArray<readonly [number, number]> = [
  [0.08, 1], [0, 0.15], [0.28, 0.5], [0.5, 0], [0.72, 0.5], [1, 0.15], [0.92, 1],
];

/** Draws a crown (M19) `w` wide and `h` high standing on (cx, bottom): the world's and the minimap's. */
export function drawCrown(ctx: Ctx, cx: number, bottom: number, w: number, h: number, line: number): void {
  const left = cx - w / 2;
  const top = bottom - h;
  const outline = OUTLINE.map(([x, y]) => [left + x * w, top + y * h] as const);
  poly(ctx, outline);
  ctx.fillStyle = css(CROWN.gold);
  ctx.fill();
  ctx.fillStyle = css(CROWN.band);
  ctx.fillRect(left + 0.12 * w, bottom - 0.28 * h, 0.76 * w, 0.22 * h);
  poly(ctx, outline);
  ctx.strokeStyle = css(CROWN.edge);
  ctx.lineWidth = line;
  ctx.stroke();
}

/** The small unlit texture every king's crown shares. */
export function paintCrown(): HTMLCanvasElement {
  const w = CROWN.width * ART_SCALE;
  const h = CROWN.height * ART_SCALE;
  const line = ART_SCALE;
  const { canvas, ctx } = makeCanvas(w + 2 * line, h + 2 * line);
  drawCrown(ctx, w / 2 + line, h + line, w, h, line);
  return canvas;
}
