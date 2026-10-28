import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';

/*
 * Roman and Romanesque wall dressings of the German bespoke pieces (the
 * Porta Nigra gate and the Kaiserdom). Face-local helpers draw inside
 * IsoPainter.leftFace / rightFace (x along the wall, y up as negative):
 * arcaded storeys between half-columns, Lombard bands of small round
 * arches, dwarf galleries under the eaves and soot weathering.
 */

/**
 * One arcaded storey between heights y0 and y1 (art px above the face
 * foot): round-arched openings between half-columns, a cornice on top.
 * `glazed` openings are windows (dusk glow); the others stand open, dark.
 */
export function arcadeStorey(p: IsoPainter, w: number, y0: number, y1: number, stone: number, light: number, glazed: boolean, bay = 14): void {
  const ctx = p.ctx;
  const n = Math.max(2, Math.round(w / bay));
  const pitch = w / n;
  const h = y1 - y0;
  const ow = pitch * 0.5;
  const oh = h * 0.6;
  for (let i = 0; i < n; i++) {
    const x = pitch * (i + 0.5) - ow / 2;
    const top = -y0 - h * 0.2 - oh;
    ctx.fillStyle = css(shade(stone, light * 1.12));
    ctx.beginPath();
    ctx.moveTo(x - 1.6, top + oh);
    ctx.lineTo(x - 1.6, top + ow / 2);
    ctx.arc(x + ow / 2, top + ow / 2, ow / 2 + 1.6, Math.PI, 0);
    ctx.lineTo(x + ow + 1.6, top + oh);
    ctx.fill();
    if (glazed) p.window(x, top, ow, oh, true);
    else {
      ctx.fillStyle = css(shade(0x1c120d, light));
      ctx.beginPath();
      ctx.moveTo(x, top + oh);
      ctx.lineTo(x, top + ow / 2);
      ctx.arc(x + ow / 2, top + ow / 2, ow / 2, Math.PI, 0);
      ctx.lineTo(x + ow, top + oh);
      ctx.fill();
    }
  }
  // Half-columns with capitals between the bays.
  for (let i = 1; i < n; i++) {
    const x = pitch * i;
    ctx.fillStyle = css(shade(stone, light * 1.18));
    ctx.fillRect(x - 1.6, -y1 + 3, 3.2, h - 3);
    ctx.fillStyle = css(shade(stone, light * 0.7));
    ctx.fillRect(x + 1, -y1 + 3, 0.8, h - 3);
    ctx.fillStyle = css(shade(stone, light * 1.25));
    ctx.fillRect(x - 2.6, -y1 + 3, 5.2, 2);
  }
  cornice(ctx, w, y1, stone, light);
}

/** Moulded cornice band whose top is at height y (face-local), with its shadow. */
export function cornice(ctx: Ctx, w: number, y: number, stone: number, light: number): void {
  ctx.fillStyle = css(shade(stone, light * 1.22));
  ctx.fillRect(0, -y, w, 3);
  ctx.fillStyle = 'rgba(20,12,8,.38)';
  ctx.fillRect(0, -y + 3, w, 1.1);
}

/** Lombard band: a frieze of small round arches hanging from height y (face-local). */
export function lombardBand(ctx: Ctx, w: number, y: number, stone: number, light: number, step = 7): void {
  ctx.strokeStyle = css(shade(stone, light * 1.2));
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x + step <= w + 0.1; x += step) {
    ctx.moveTo(x, -y);
    ctx.arc(x + step / 2, -y, step / 2, Math.PI, 0, true);
  }
  ctx.stroke();
  cornice(ctx, w, y + 3, stone, light);
}

/**
 * Dwarf gallery (Zwerggalerie) under the eave at height y: an open
 * passage of tiny arches on white colonnettes, dark behind.
 */
export function dwarfGallery(ctx: Ctx, w: number, y: number, stone: number, light: number, h = 9): void {
  ctx.fillStyle = css(shade(0x1e140f, light));
  ctx.fillRect(0, -y, w, h);
  const step = 5.2;
  for (let x = 0; x <= w; x += step) {
    ctx.fillStyle = css(shade(0xe8dcc4, light));
    ctx.fillRect(x - 0.7, -y, 1.4, h);
  }
  ctx.strokeStyle = css(shade(stone, light * 1.15));
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let x = 0; x + step <= w + 0.1; x += step) {
    ctx.moveTo(x, -y - h + 1);
    ctx.arc(x + step / 2, -y - h + 1 + step / 2, step / 2, Math.PI, 0);
  }
  ctx.stroke();
  ctx.fillStyle = css(shade(stone, light * 1.05));
  ctx.fillRect(0, -y - h - 1, w, 1.6);
  cornice(ctx, w, y + h + 3.5, stone, light);
}

/** Soot and rain streaks darkening the upper part of a face of height h (the blackened Trier sandstone). */
export function weathering(p: IsoPainter, w: number, h: number, strength = 0.32): void {
  const ctx = p.ctx;
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, `rgba(24,14,10,${strength})`);
  g.addColorStop(1, 'rgba(24,14,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, -h, w, h);
  ctx.fillStyle = `rgba(24,14,10,${strength * 0.5})`;
  for (let k = 0; k < w / 6; k++) {
    const x = p.random() * w;
    ctx.fillRect(x, -h + p.random() * h * 0.3, 0.8 + p.random(), h * (0.2 + p.random() * 0.4));
  }
}
