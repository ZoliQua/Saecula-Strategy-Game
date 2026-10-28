import type { Ctx } from '../../canvas';
import type { ChargePainter } from '../charges';

/** Castle of Castile: three crenellated towers on a walled base, the middle one tallest, door and windows open. */
function castle(ctx: Ctx, x: number, y: number, k: number): void {
  const base = y + k * 0.62;
  const towers: ReadonlyArray<readonly [cx: number, w: number, top: number]> = [
    [x - k * 0.48, k * 0.3, y - k * 0.2],
    [x, k * 0.36, y - k * 0.62],
    [x + k * 0.48, k * 0.3, y - k * 0.2],
  ];
  ctx.beginPath();
  // Curtain between the towers.
  ctx.rect(x - k * 0.64, y + k * 0.02, k * 1.28, base - (y + k * 0.02));
  for (const [cx, w, top] of towers) {
    ctx.rect(cx - w / 2, top, w, base - top);
    // Three merlons on each tower.
    const m = w / 5;
    for (let i = 0; i < 3; i++) ctx.rect(cx - w / 2 + i * 2 * m, top - m * 1.1, m, m * 1.1);
  }
  // Merlons on the curtain.
  const cm = k * 0.11;
  for (const cx of [x - k * 0.27, x + k * 0.27]) ctx.rect(cx - cm / 2, y + k * 0.02 - cm, cm, cm);
}

/**
 * Spanish crest charge (charges.ts): the gold castle of Castile, edged
 * dark, with its gate and windows open in the field's shade.
 */
export const SPANISH_CHARGES = {
  castle: (ctx, x, y, s) => {
    const k = s * 0.85;
    castle(ctx, x, y, k);
    ctx.lineJoin = 'miter';
    ctx.lineWidth = Math.max(0.7, s * 0.1);
    ctx.strokeStyle = 'rgba(40,24,10,.85)';
    ctx.stroke();
    ctx.fillStyle = '#efc42c';
    ctx.fill();
    // Gate and windows (azure in the Castile arms; dark here so they read on any field).
    ctx.fillStyle = 'rgba(30,24,40,.9)';
    ctx.beginPath();
    ctx.moveTo(x - k * 0.13, y + k * 0.62);
    ctx.lineTo(x - k * 0.13, y + k * 0.28);
    ctx.arc(x, y + k * 0.28, k * 0.13, Math.PI, 0);
    ctx.lineTo(x + k * 0.13, y + k * 0.62);
    ctx.closePath();
    ctx.fill();
    for (const [wx, wy] of [[x, y - k * 0.36], [x - k * 0.48, y - k * 0.02], [x + k * 0.48, y - k * 0.02]] as const) {
      ctx.fillRect(wx - k * 0.05, wy, k * 0.1, k * 0.16);
    }
  },
} satisfies Record<string, ChargePainter>;
