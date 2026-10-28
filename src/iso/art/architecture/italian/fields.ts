import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { cypress, roundTree } from '../kits/patio';

/*
 * Italian farm ground: vine rows on stakes, olive rows, furrowed wheat
 * and lines of cypresses along the field's edge (the cypresses carry
 * the farms' skyline in every age).
 */

/** Vine rows along u on stakes, from v0 to v1 (rows every `gap` tiles). */
export function vineRows(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, gap = 0.2): void {
  const ctx = p.ctx;
  for (let v = v0; v <= v1 + 1e-6; v += gap) {
    const a = p.p(u0, v, 0);
    const b = p.p(u1, v, 0);
    ctx.strokeStyle = 'rgba(40,26,12,.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] + 1);
    ctx.lineTo(b[0], b[1] + 1);
    ctx.stroke();
    for (let u = u0; u <= u1 + 1e-6; u += 0.16) {
      const [x, y] = p.p(u, v, 0);
      ctx.fillStyle = '#5a4026';
      ctx.fillRect(x - 0.7, y - 11, 1.4, 11);
      ctx.fillStyle = css(shade(0x55823a, 0.8 + p.random() * 0.45));
      ctx.beginPath();
      ctx.ellipse(x, y - 9, 4.2, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (p.random() < 0.35) {
        ctx.fillStyle = '#5b2a4a';
        ctx.fillRect(x - 1, y - 7, 2, 2.4);
      }
    }
  }
}

/** Olive trees in rows over u0..u1 × v0..v1. */
export function oliveRows(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, step = 0.42): void {
  for (let v = v0; v <= v1 + 1e-6; v += step) {
    for (let u = u0; u <= u1 + 1e-6; u += step) roundTree(p, u, v, 0, 12, 'olive');
  }
}

/** Furrowed wheat over u0..u1 × v0..v1 (ripe gold with green). */
export function wheat(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  const ctx = p.ctx;
  for (let v = v0; v <= v1 + 1e-6; v += 0.14) {
    for (let u = u0; u <= u1 + 1e-6; u += 0.12) {
      const [x, y] = p.p(u, v, 0);
      ctx.strokeStyle = (Math.round(u * 50) + Math.round(v * 30)) % 3 ? '#c9a94a' : '#9fb64a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1.5, y - 7 - p.random() * 2);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1.5, y - 7 - p.random() * 2);
      ctx.stroke();
    }
  }
}

/** A line of cypresses from (u0, v0) to (u1, v1), `n` trees `h` px tall. */
export function cypressLine(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, n: number, h: number): void {
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    cypress(p, u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, 0, h * (0.9 + 0.2 * ((i * 7) % 3) / 2));
  }
}
