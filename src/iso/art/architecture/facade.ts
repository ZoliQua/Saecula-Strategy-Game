import type { Ctx } from '../canvas';
import type { IsoPainter } from '../isoPainter';
import { baked } from '../lighting/normalLayer';
import { css, shade } from '../palette';
import type { ArchStyle, CrestCharge } from './style';

/*
 * Face-local facade details: call these inside IsoPainter.leftFace /
 * rightFace callbacks (x along the wall, y up as negative values).
 */

export const WHITE_TRIM = 0xf3ecdc;
/** Baked shade for details painted on right (+u) faces. */
export const R = baked(0.72);

/** Half-timbering: sill + top plates, posts, braces and rails. */
export function timberFrame(
  ctx: Ctx,
  w: number,
  h: number,
  opts: { color: number; bays: number; rails?: readonly number[]; braces?: boolean; light?: number },
): void {
  const c = css(shade(opts.color, opts.light ?? 1));
  const beam = 3.2;
  ctx.fillStyle = c;
  ctx.fillRect(0, -beam, w, beam);
  ctx.fillRect(0, -h, w, beam);
  for (const r of opts.rails ?? []) ctx.fillRect(0, -r - beam / 2, w, beam * 0.8);
  const bay = w / opts.bays;
  for (let i = 0; i <= opts.bays; i++) ctx.fillRect(Math.min(w - beam, Math.max(0, i * bay - beam / 2)), -h, beam, h);
  if (opts.braces !== false) {
    ctx.strokeStyle = c;
    ctx.lineWidth = beam * 0.85;
    for (let i = 0; i < opts.bays; i++) {
      // Braces lean towards the bay's outer posts (Central European "man" figure).
      const x0 = i * bay;
      const left = i < opts.bays / 2;
      ctx.beginPath();
      ctx.moveTo(left ? x0 + 1 : x0 + bay - 1, -beam);
      ctx.lineTo(left ? x0 + bay * 0.45 : x0 + bay * 0.55, -h * 0.55);
      ctx.stroke();
    }
  }
}

/** Pilasters (flat white columns) with base and capital at the given x positions. */
export function pilasters(ctx: Ctx, h: number, xs: readonly number[], color = WHITE_TRIM, width = 7, light = 1): void {
  for (const x of xs) {
    ctx.fillStyle = css(shade(color, light));
    ctx.fillRect(x - width / 2, -h, width, h);
    ctx.fillStyle = css(shade(color, light * 0.78));
    ctx.fillRect(x + width / 2 - 1.6, -h, 1.6, h);
    ctx.fillStyle = css(shade(color, light * 1.04));
    ctx.fillRect(x - width / 2 - 1.5, -h, width + 3, 4);
    ctx.fillRect(x - width / 2 - 1.2, -9, width + 2.4, 3);
  }
}

/** Horizontal molding (cornice / string course) at height y (positive, from the face's base). */
export function cornice(ctx: Ctx, w: number, y: number, color = WHITE_TRIM, light = 1, depth = 5): void {
  ctx.fillStyle = css(shade(color, light * 1.05));
  ctx.fillRect(0, -y - depth, w, depth * 0.55);
  ctx.fillStyle = css(shade(color, light * 0.82));
  ctx.fillRect(0, -y - depth * 0.45, w, depth * 0.45);
  ctx.fillStyle = 'rgba(30,20,10,.25)';
  ctx.fillRect(0, -y, w, 1.6);
}

/** Corner quoins (alternating stones) at both ends of a face. */
export function quoins(ctx: Ctx, w: number, h: number, color: number, light = 1): void {
  ctx.fillStyle = css(shade(color, light));
  for (let y = 4, i = 0; y < h - 3; y += 7, i++) {
    const qw = i % 2 ? 6 : 10;
    ctx.fillRect(0, -y - 6, qw, 6);
    ctx.fillRect(w - qw, -y - 6, qw, 6);
  }
}

/**
 * Tall glazed baroque window: surround in the style's trim with a
 * segmental head, keystone and sill, small-paned glazing. Records the glow.
 */
export function baroqueWindow(p: IsoPainter, s: ArchStyle, x: number, y: number, w: number, h: number, light = 1): void {
  const ctx = p.ctx;
  const trim = css(shade(s.palette.trim, light));
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + h + 1);
  ctx.lineTo(x - 3, y - 1);
  ctx.quadraticCurveTo(x + w / 2, y - 7, x + w + 3, y - 1);
  ctx.lineTo(x + w + 3, y + h + 1);
  ctx.closePath();
  ctx.fill();
  p.window(x, y, w, h);
  ctx.fillStyle = 'rgba(43,29,18,.85)';
  for (let k = 1; k < 3; k++) ctx.fillRect(x, y + (h * k) / 3, w, 0.9);
  ctx.fillStyle = trim;
  ctx.fillRect(x + w / 2 - 2, y - 5, 4, 5);
  ctx.fillRect(x - 4.5, y + h, w + 9, 2.6);
  ctx.fillStyle = css(shade(s.palette.trim, light * 0.7));
  ctx.fillRect(x - 4.5, y + h + 2.6, w + 9, 1);
}

/** Small window with two wooden shutters swung open. */
export function shutteredWindow(p: IsoPainter, x: number, y: number, w: number, h: number, shutter: number, light = 1): void {
  const ctx = p.ctx;
  p.window(x, y, w, h);
  ctx.fillStyle = css(shade(shutter, light));
  ctx.fillRect(x - w * 0.55 - 1.5, y - 1, w * 0.55, h + 2);
  ctx.fillRect(x + w + 1.5, y - 1, w * 0.55, h + 2);
  ctx.fillStyle = css(shade(shutter, light * 0.7));
  for (const sx of [x - w * 0.55 - 1.5, x + w + 1.5]) {
    for (let k = 2; k < h; k += 3) ctx.fillRect(sx + 1, y + k, w * 0.55 - 2, 0.7);
  }
}

/** Heraldic charges painted on a crest of size s centred at (x, y). */
const CHARGES: Record<CrestCharge, (ctx: Ctx, x: number, y: number, s: number) => void> = {
  // Double cross (kettőskereszt) in white.
  double_cross: (ctx, x, y, s) => {
    ctx.fillStyle = 'rgba(250,244,230,.92)';
    ctx.fillRect(x - s * 0.1, y - s * 0.8, s * 0.2, s * 1.5);
    ctx.fillRect(x - s * 0.42, y - s * 0.5, s * 0.84, s * 0.16);
    ctx.fillRect(x - s * 0.3, y - s * 0.15, s * 0.6, s * 0.16);
  },
};

/** Team-coloured heraldic shield with a gold rim, bearing the style's charge. */
export function crest(ctx: Ctx, style: ArchStyle, x: number, y: number, s: number, team: number): void {
  ctx.fillStyle = '#d9b14a';
  shield(ctx, x, y, s + 1.5);
  ctx.fill();
  const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
  g.addColorStop(0, css(shade(team, 1.15)));
  g.addColorStop(1, css(shade(team, 0.7)));
  ctx.fillStyle = g;
  shield(ctx, x, y, s);
  ctx.fill();
  CHARGES[style.charge](ctx, x, y, s);
}

function shield(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.75, y - s);
  ctx.lineTo(x + s * 0.75, y - s);
  ctx.lineTo(x + s * 0.75, y);
  ctx.quadraticCurveTo(x + s * 0.7, y + s * 0.8, x, y + s * 1.05);
  ctx.quadraticCurveTo(x - s * 0.7, y + s * 0.8, x - s * 0.75, y);
  ctx.closePath();
}

/** Clock face (Enlightenment tower). */
export function clockFace(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = '#d9b14a';
  ctx.beginPath();
  ctx.arc(x, y, r + 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6f1e2';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - r * 0.75);
  ctx.moveTo(x, y);
  ctx.lineTo(x + r * 0.5, y + r * 0.2);
  ctx.stroke();
}

/** Vertical boarding filling a gable triangle (width w, rise h), with a sun-ray vent. */
export function boardedGable(ctx: Ctx, w: number, rise: number, color: number, light = 1): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w / 2, -rise);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(0, -rise, w, rise);
  for (let x = 2; x < w; x += 4.5) {
    ctx.fillStyle = css(shade(color, light * (x % 9 < 4.5 ? 0.75 : 0.9)));
    ctx.fillRect(x, -rise, 0.9, rise);
  }
  // Decorative rays around a small vent (napsugaras oromzat).
  const cx = w / 2;
  const cy = -rise * 0.32;
  ctx.strokeStyle = css(shade(color, light * 1.35), 0.8);
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
    ctx.lineTo(cx + Math.cos(a) * rise * 0.42, cy + Math.sin(a) * rise * 0.42);
    ctx.stroke();
  }
  ctx.fillStyle = '#20150c';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

/** Arched opening (gate, arcade bay) with a stone or white surround. */
export function archedOpening(ctx: Ctx, x: number, w: number, h: number, surround: number, inner = 0x22170e, light = 1): void {
  const r = w / 2;
  const path = (dx: number, dw: number, dh: number) => {
    ctx.beginPath();
    ctx.moveTo(x + dx, 0);
    ctx.lineTo(x + dx, -dh + (dw / 2));
    ctx.arc(x + dx + dw / 2, -dh + dw / 2, dw / 2, Math.PI, 0);
    ctx.lineTo(x + dx + dw, 0);
    ctx.closePath();
  };
  ctx.fillStyle = css(shade(surround, light));
  path(-3, w + 6, h + 3);
  ctx.fill();
  ctx.fillStyle = css(inner);
  path(0, w, h);
  ctx.fill();
  // Voussoir joints around the arch.
  ctx.strokeStyle = css(shade(surround, light * 0.7), 0.7);
  ctx.lineWidth = 0.8;
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const cx = x + r;
    const cy = -h + r;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3));
    ctx.stroke();
  }
}
