import { tufts } from '../../architecture/kits/turfRoof';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { frontEdge } from '../kits/wallParts';
import { stations, type Arm } from '../wallKit';

type Pt = readonly [number, number];

/*
 * Details of the Finnish wall styles: faces of big rounded granite
 * boulders (grey and the pink-grey of rapakivi) in dark gaps, loose
 * boulders at the foot of a heap, and the ragged turf crest along an
 * arm's top edge.
 */

/** Pink-grey of rapakivi granite, mixed in among the grey boulders. */
const RAPAKIVI = 0x9a8580;

/**
 * Face of big rounded boulders, face-local (x along the foot, y up as
 * negatives): rows of irregular lumps, each lit on top and dark at its
 * foot, in dark gaps; a boulder in four is the pink-grey rapakivi.
 */
export function boulderFace(ctx: Ctx, w: number, h: number, light: number, color: number, rand: () => number, size = 1): void {
  ctx.fillStyle = css(shade(color, light * 0.42), 0.85);
  ctx.fillRect(0, -h, w, h);
  for (let y = 0; y < h; ) {
    const rh = (7 + rand() * 4) * size;
    for (let x = -rand() * 8; x < w; ) {
      const bw = (9 + rand() * 8) * size;
      const base = rand() < 0.25 ? RAPAKIVI : color;
      const k = 0.84 + rand() * 0.3;
      const cx = x + bw / 2;
      const cy = -y - rh / 2;
      const g = ctx.createLinearGradient(0, cy - rh / 2, 0, cy + rh / 2);
      g.addColorStop(0, css(shade(base, light * k * 1.14)));
      g.addColorStop(1, css(shade(base, light * k * 0.74)));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, bw / 2 - 0.7, rh / 2 - 0.5, (rand() - 0.5) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Lichen speckle on the lit top.
      ctx.fillStyle = css(shade(0xb8b49a, light), 0.4);
      ctx.fillRect(cx - bw * 0.2, cy - rh * 0.32, bw * 0.3, 1);
      x += bw;
    }
    y += rh * 0.92;
  }
}

/** One rough granite boulder standing on the ground point (u, v) at z, about `r` art px across. */
export function boulder(p: IsoPainter, u: number, v: number, z: number, r: number, color: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  const s = r * (0.75 + p.random() * 0.5);
  const pts: Pt[] = [[x - s, y], [x - s * 0.8, y - s * 0.75], [x - s * 0.1, y - s * 1.05], [x + s * 0.75, y - s * 0.7], [x + s, y - s * 0.05], [x + s * 0.4, y + s * 0.3], [x - s * 0.5, y + s * 0.3]];
  const base = p.random() < 0.3 ? RAPAKIVI : color;
  const g = ctx.createLinearGradient(x - s, y - s, x + s, y + s * 0.4);
  g.addColorStop(0, css(shade(base, 1.16)));
  g.addColorStop(1, css(shade(base, 0.6)));
  p.fillPoly(pts, g);
  p.normals.cylinderPoly(pts, x - s, s * 2);
  p.strokePoly(pts, css(shade(base, 0.38), 0.6), 0.8);
}

/** Loose boulders tumbled along the front foot of an arm, `off` tiles out from its line. */
export function footBoulders(p: IsoPainter, arm: Arm, off: number, spacing: number, r: number, color: number): void {
  for (const c of stations(arm, spacing, 0.03)) {
    const [u, v] = frontEdge(arm, c, off);
    boulder(p, u, v, 0, r, color);
  }
}

/** Ragged turf along an arm's crest: grass blades on its front top edge, `half` tiles out at height z. */
export function turfCrest(p: IsoPainter, arm: Arm, half: number, z: number, turf: number): void {
  const a = frontEdge(arm, arm.a, half);
  const b = frontEdge(arm, arm.b, half);
  const pa = p.p(a[0], a[1], z);
  const pb = p.p(b[0], b[1], z);
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(turf, 1.12), 0.9);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pa[0], pa[1]);
  ctx.lineTo(pb[0], pb[1]);
  ctx.stroke();
  tufts(p, pa, pb, turf, 1.05, 1.6);
}
