import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { N_UP, normalize, tileToView } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import type { UV } from '../prism';

type Pt = readonly [number, number];

/*
 * Forked swallowtail merlon for a wall run in any direction (Italian
 * Ghibelline curtain, Russian kremlin wall): the kit merlons of
 * architecture/kits/swallowtail.ts only run along the tile axes, the
 * wall arms also run on the diagonals.
 */

/** Swallowtail merlon proportions on the Ghibelline curtain: big, so the fork reads at zoom 1. */
export interface MerlonSize {
  /** Width along the run (tiles). */
  readonly width: number;
  /** Thickness across the run (tiles). */
  readonly thick: number;
  /** Solid height up to the bottom of the V notch (art px). */
  readonly body: number;
  /** Depth of the V notch, i.e. how far the horns stand above it (art px). */
  readonly horn: number;
}

/**
 * Forked swallowtail merlon centred on c at z, running along the unit
 * ground direction d: the face toward the viewer cut into two horns
 * round a V notch, the visible end, and the two sloping copings of the
 * notch. Each horn tip is a shadow volume point.
 */
export function forkedMerlon(p: IsoPainter, c: UV, d: UV, z: number, m: MerlonSize, color: number, cap: number): void {
  const n: UV = [-d[1], d[0]];
  const h = m.width / 2;
  const t = m.thick / 2;
  const zn = z + m.body;
  const zt = zn + m.horn;
  const at = (s: number, w: number, zz: number): Pt => p.p(c[0] + d[0] * s + n[0] * w, c[1] + d[1] * s + n[1] * w, zz);
  // The side and the end of the block that face the viewer.
  const side = n[0] + n[1] >= 0 ? 1 : -1;
  const end = d[0] + d[1] >= 0 ? 1 : -1;
  const shadeOf = (ou: number, ov: number) => baked(0.86 + 0.198 * ((ov - ou) / Math.SQRT2));
  // Copings of the notch: from each horn down to the notch's floor.
  for (const s of [-1, 1]) {
    const pts: Pt[] = [at(s * h, -t, zt), at(s * h, t, zt), at(0, t, zn), at(0, -t, zn)];
    p.fillPoly(pts, css(shade(cap, s === end ? 0.92 : 1.08)));
    p.normals.fill(pts, N_UP);
  }
  if (Math.abs(d[0] + d[1]) > 1e-6) {
    const pts: Pt[] = [at(end * h, -t, z), at(end * h, t, z), at(end * h, t, zt), at(end * h, -t, zt)];
    const ou = d[0] * end;
    const ov = d[1] * end;
    p.fillPoly(pts, css(shade(color, shadeOf(ou, ov))));
    p.normals.fill(pts, normalize(tileToView(ou, ov, 0)));
  }
  if (Math.abs(n[0] + n[1]) > 1e-6) {
    const w = side * t;
    const face: Pt[] = [at(-h, w, z), at(h, w, z), at(h, w, zt), at(0, w, zn), at(-h, w, zt)];
    const ou = n[0] * side;
    const ov = n[1] * side;
    p.fillPoly(face, css(shade(color, shadeOf(ou, ov))));
    p.normals.fill(face, normalize(tileToView(ou, ov, 0)));
    p.strokePoly(face, css(shade(color, 0.4), 0.6), 1);
  }
  for (const s of [-1, 1]) p.addVolumePoint(c[0] + d[0] * s * h, c[1] + d[1] * s * h, zt);
}
