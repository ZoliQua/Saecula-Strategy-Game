import type { Ctx } from '../../canvas';
import type { ChargePainter } from '../charges';

/**
 * Crescent and star (ay yıldız): a white crescent opening to the fly
 * with a five-pointed star between its horns, on the shield's field
 * (the owner's colour stands in for the red).
 */
function crescent(ctx: Ctx, x: number, y: number, k: number): void {
  ctx.fillStyle = '#f6f3ea';
  // Outer circle (R) at (cx, y), inner circle (r) shifted d to the fly.
  const R = k * 0.62;
  const r = k * 0.5;
  const d = k * 0.22;
  const cx = x - k * 0.14;
  const xi = (R * R - r * r + d * d) / (2 * d);
  const yi = Math.sqrt(Math.max(0, R * R - xi * xi));
  const a = Math.atan2(yi, xi);
  const b = Math.atan2(yi, xi - d);
  ctx.beginPath();
  ctx.arc(cx, y, R, a, Math.PI * 2 - a, false);
  ctx.arc(cx + d, y, r, Math.PI * 2 - b, b, true);
  ctx.closePath();
  ctx.fill();
  // Star between the horns.
  const sx = x + k * 0.4;
  const so = k * 0.22;
  const si = so * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? so : si;
    const px = sx + Math.cos(ang) * rr;
    const py = y + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** The Ottoman charges (architecture/charges.ts spreads them). */
export const OTTOMAN_CHARGES = { crescent } satisfies Record<string, ChargePainter>;
