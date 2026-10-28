import { HW, type IsoPainter, type WallStyle } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import type { Block } from './italianParts';

type Pt = readonly [number, number];

/*
 * Open loggia: square piers carrying round arches, with nothing behind
 * the openings, so the sky shows through on the skyline (archery
 * ranges, tower tops, roof altane, the Palazzo's loggia). Paint the
 * 'back' half before what stands inside, the 'front' half after it,
 * then the roof.
 */

export interface LoggiaOpts {
  /** Pier and spandrel finish. */
  readonly wall: WallStyle;
  /** Arch rings and the cornice over the arches. */
  readonly trim: number;
  /** Bays along u and along v. */
  readonly bays: readonly [u: number, v: number];
  /** Pier half-width (tiles); default 0.045. */
  readonly pier?: number;
  /** Height of the arches' crown below the top (art px); default 7. */
  readonly band?: number;
}

/** Piers and arched spandrels on one plane: along u at v = at (axis 'u'), or along v at u = at. */
function edge(p: IsoPainter, axis: 'u' | 'v', from: number, to: number, at: number, z0: number, z1: number, bays: number, o: LoggiaOpts, piers: boolean): void {
  const a = o.pier ?? 0.045;
  const band = o.band ?? 7;
  const step = (to - from) / bays;
  const pt = (s: number, z: number): Pt => (axis === 'u' ? p.p(s, at, z) : p.p(at, s, z));
  const light = axis === 'u' ? 1 : baked(0.72);
  const normal = axis === 'u' ? N_LEFT : N_RIGHT;
  const col = o.wall.color;
  const crown = z1 - band;
  for (let i = 0; i < bays; i++) {
    const s0 = from + i * step + a;
    const s1 = from + (i + 1) * step - a;
    const half = (s1 - s0) / 2;
    // Arch rise in art px: a half circle of the opening's on-screen width.
    const rise = Math.min(crown - z0 - 4, half * HW * 0.9);
    const spring = crown - rise;
    const pts: Pt[] = [pt(s0, z1), pt(s1, z1), pt(s1, spring)];
    for (let k = 1; k < 12; k++) {
      const t = Math.PI * (k / 12);
      pts.push(pt(s0 + half * (1 + Math.cos(t)), spring + Math.sin(t) * rise));
    }
    pts.push(pt(s0, spring));
    p.fillPoly(pts, css(shade(col, light)));
    p.normals.fill(pts, normal);
    const ring: Pt[] = [];
    for (let k = 0; k <= 12; k++) {
      const t = Math.PI * (k / 12);
      ring.push(pt(s0 + half * (1 + Math.cos(t)), spring + Math.sin(t) * rise));
    }
    p.ctx.strokeStyle = css(shade(o.trim, light));
    p.ctx.lineWidth = 2.2;
    p.ctx.beginPath();
    ring.forEach(([x, y], k) => (k === 0 ? p.ctx.moveTo(x, y) : p.ctx.lineTo(x, y)));
    p.ctx.stroke();
  }
  if (!piers) return;
  for (let i = 0; i <= bays; i++) {
    const s = from + i * step;
    if (axis === 'u') p.box(s - a, at - a, s + a, at + a, z0, crown - 2, o.wall, shade(col, 1.05));
    else p.box(at - a, s - a, at + a, s + a, z0, crown - 2, o.wall, shade(col, 1.05));
  }
}

/**
 * One half of an open loggia on b from z0 to z1: 'back' paints the two
 * far planes (their piers and arches seen from inside), 'front' the two
 * near planes and the cornice band over them.
 */
export function loggia(p: IsoPainter, [u0, v0, u1, v1]: Block, z0: number, z1: number, side: 'back' | 'front', o: LoggiaOpts): void {
  const [bu, bv] = o.bays;
  if (side === 'back') {
    edge(p, 'u', u0, u1, v0, z0, z1, bu, o, true);
    edge(p, 'v', v0, v1, u0, z0, z1, bv, o, true);
    return;
  }
  // Front piers first, then the spandrels in front of their tops.
  edge(p, 'u', u0, u1, v1, z0, z1, bu, o, true);
  edge(p, 'v', v0, v1, u1, z0, z1, bv, o, true);
  edge(p, 'u', u0, u1, v1, z0, z1, bu, o, false);
  edge(p, 'v', v0, v1, u1, z0, z1, bv, o, false);
  // Cornice over the arches.
  const t = 0.04;
  p.box(u0 - t, v1 - t, u1 + t, v1 + t, z1 - 2.5, z1, { color: o.trim }, shade(o.trim, 1.08));
  p.box(u1 - t, v0 - t, u1 + t, v1 + t, z1 - 2.5, z1, { color: o.trim }, shade(o.trim, 1.08));
}
