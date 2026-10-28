import type { IsoPainter } from '../../isoPainter';
import { N_LEFT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { crest } from '../facade';
import { column } from '../parts';
import { porchRoofLeft } from '../roofs';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];

/*
 * Porticus kit: a colonnade along the +v face of a block under a lean-to
 * in the style's roof cover, optionally crowned over its middle by a
 * small pediment bearing the crest — the Gallo-Roman porch of town
 * houses, barracks and stables. Styles switch it on with kits.porticus;
 * the Roman family adds it on the fronts that carry no windows under the
 * porch line, so no glow is hidden by the lean-to.
 */

/** Whether the style fronts its Roman-family blocks with a porticus. */
export function hasPorticus(s: ArchStyle): boolean {
  return s.kits?.porticus === true;
}

export interface PorticusOpts {
  /** Number of columns along the front. */
  readonly columns: number;
  /** Pediment with the crest over the middle bay (team colour). */
  readonly pediment?: number;
}

/** u of column `i` of `n`, spread from end to end (a lone column stands in the middle). */
export function porticusColumnU(u0: number, u1: number, i: number, n: number): number {
  if (n <= 1) return (u0 + u1) / 2;
  return u0 + 0.06 + ((u1 - u0 - 0.12) * i) / (n - 1);
}

/**
 * Porticus along the +v face (v = vWall) from u0 to u1, `depth` tiles
 * deep: the lean-to falls from zTop at the wall to zLow on the columns.
 */
export function porticus(p: IsoPainter, s: ArchStyle, u0: number, u1: number, vWall: number, depth: number, zTop: number, zLow: number, opts: PorticusOpts): void {
  const c = s.palette;
  const v = vWall + depth - 0.03;
  const prev = p.material;
  p.material = s.roof.material ?? 'slate';
  porchRoofLeft(p, u0, u1, vWall, depth, zTop, zLow, c.roofAlt);
  p.material = prev;
  for (let i = 0; i < opts.columns; i++) column(p, porticusColumnU(u0, u1, i, opts.columns), v, 0, zLow, 2.5, c.trim);
  // Architrave over the columns.
  const a = p.p(u0, vWall + depth, zLow);
  const b = p.p(u1, vWall + depth, zLow);
  p.ctx.strokeStyle = css(c.trim);
  p.ctx.lineWidth = 3;
  p.ctx.beginPath();
  p.ctx.moveTo(a[0], a[1] - 1.5);
  p.ctx.lineTo(b[0], b[1] - 1.5);
  p.ctx.stroke();
  if (opts.pediment === undefined) return;
  const um = (u0 + u1) / 2;
  const half = Math.min(0.3, (u1 - u0) / 3);
  const rise = 16;
  const vf = vWall + depth;
  const tri: Pt[] = [p.p(um - half, vf, zLow), p.p(um + half, vf, zLow), p.p(um, vf, zLow + rise)];
  p.fillPoly(tri, css(shade(c.trim, 0.98)));
  p.normals.fill(tri, N_LEFT);
  p.strokePoly(tri, css(shade(c.trim, 0.7)), 1.6);
  const team = opts.pediment;
  p.leftFace(um - half, um + half, vf, zLow, (w) => crest(p.ctx, s, w / 2, -rise * 0.4, 4.5, team), rise);
  p.addVolumePoint(um, vf, zLow + rise);
}
