import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { helm } from '../roofs';
import { alem, ringPx } from './leadDome';

/*
 * Pencil minaret kit: a slender round shaft on a wider plinth, one or
 * more balconies (şerefe) on corbelled rings with a dark railing, and a
 * tall, needle-thin conical cap with a crescent finial. The cap is a
 * straight cone (never a swelling helm), so the tower reads as a pencil.
 */

export interface MinaretOpts {
  /** Balconies up the shaft (1–3). */
  readonly balconies?: number;
  /** Cap height as a multiple of the shaft's screen radius. */
  readonly cap?: number;
}

/**
 * Minaret on (u, v, z0), shaft radius r tiles, shaft `h` art px high
 * (to the cap's foot). Returns the top of the cap (without alem).
 */
export function pencilMinaret(p: IsoPainter, u: number, v: number, r: number, z0: number, h: number, wall: number, cap: number, o: MinaretOpts = {}): number {
  const ctx = p.ctx;
  const base = 14;
  helm(p, u, v, z0, [[0, r * 1.5], [base, r * 1.5], [base + 3, r * 1.15], [h, r]], wall, false);
  // Vertical flutes on the lit side.
  const [x, y] = p.p(u, v, z0);
  const rx = ringPx(r);
  ctx.fillStyle = css(shade(wall, 1.25), 0.45);
  ctx.fillRect(x - rx * 0.5, y - h, Math.max(0.8, rx * 0.22), h - base - 3);
  ctx.fillStyle = css(shade(wall, 0.6), 0.35);
  ctx.fillRect(x + rx * 0.35, y - h, Math.max(0.6, rx * 0.16), h - base - 3);
  const n = Math.max(1, Math.min(3, o.balconies ?? 1));
  for (let i = 0; i < n; i++) {
    const zz = z0 + h * (n === 1 ? 0.74 : 0.6 + (0.28 * i) / (n - 1));
    helm(p, u, v, zz - 5, [[0, r], [4, r * 1.9], [5, r * 1.9]], shade(wall, 1.05), false);
    // Railing: a dark band with pale balusters on the front half.
    const [bx, by] = p.p(u, v, zz);
    const brx = ringPx(r * 1.9);
    ctx.fillStyle = css(shade(wall, 0.5), 0.85);
    ctx.beginPath();
    ctx.ellipse(bx, by, brx, brx * 0.5, 0, 0, Math.PI);
    ctx.lineTo(bx - brx, by - 3.5);
    ctx.ellipse(bx, by - 3.5, brx, brx * 0.5, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(shade(wall, 1.2));
    for (let k = 1; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      ctx.fillRect(bx + Math.cos(a) * brx - 0.4, by + Math.sin(a) * brx * 0.5 - 3.5, 0.8, 3.5);
    }
  }
  const capH = rx * (o.cap ?? 9);
  helm(p, u, v, z0 + h, [[0, r * 1.12], [capH * 0.1, r * 1.05], [capH, 0.002]], cap, false);
  ctx.fillStyle = css(shade(cap, 1.4), 0.35);
  ctx.fillRect(x - rx * 0.4, y - h - capH * 0.85, Math.max(0.6, rx * 0.18), capH * 0.8);
  const top = z0 + h + capH;
  alem(p, u, v, top - 0.5, 9);
  return top;
}
