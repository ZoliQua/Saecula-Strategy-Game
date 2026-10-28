import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { N_LEFT, N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { ArchStyle } from '../style';

type Pt = readonly [number, number];
type GableDetail = (width: number, rise: number) => void;

/*
 * Stepped (crow-step) gable kit: the gable walls of a gable roof rise
 * above its rakes in coped steps, the North German / Hanseatic and
 * Flemish town-house silhouette. The back gable is painted before the
 * roof (only its steps show above the far slope), the front one after.
 * Masonry is the wall's own render with the gable's framing ('wall'),
 * or brick with blind lancet niches and a hoist hatch ('brick').
 */

/** Gables lower than this (art px of rise) keep a plain end: sheds and lean-tos stay simple. */
export const STEPPED_MIN_RISE = 24;
/** How far the step treads stand above the rake line, and the top step above the ridge (art px). */
const LIFT = 6;
const CROWN = 10;
/** Eave overhang (tiles) of a stepped roof: the gable walls close the roof ends. */
const STEPPED_OVERHANG = 0.03;

/** Whether a gable roof of `rise` (pitched, art px) over a span of `span` tiles gets stepped ends in style `s`. */
export function stepsGable(s: ArchStyle, rise: number, span: number): boolean {
  return s.kits?.steppedGables !== undefined && rise >= STEPPED_MIN_RISE && span >= 0.45;
}

/** Face-local outline (x along the gable, y up as negative) of a stepped gable of width w and rise. */
export function steppedOutline(w: number, rise: number): Pt[] {
  const n = Math.max(2, Math.min(5, Math.round(rise / 16)));
  const half = w / 2;
  const step = half / (n + 0.6);
  const pts: Pt[] = [[0, 0]];
  for (let i = 0; i < n; i++) {
    const h = (rise * ((i + 1) * step)) / half + LIFT;
    pts.push([i * step, -h], [(i + 1) * step, -h]);
  }
  const top = rise + CROWN;
  pts.push([n * step, -top], [w - n * step, -top]);
  for (let i = n - 1; i >= 0; i--) {
    const h = (rise * ((i + 1) * step)) / half + LIFT;
    pts.push([w - (i + 1) * step, -h], [w - i * step, -h]);
  }
  pts.push([w, 0]);
  return pts;
}

/** Coping stones on every tread of the outline (face-local). */
function coping(ctx: Ctx, pts: readonly Pt[], color: number, light: number): void {
  for (let k = 1; k < pts.length - 2; k++) {
    const a = pts[k]!;
    const b = pts[k + 1]!;
    if (a[1] !== b[1]) continue;
    ctx.fillStyle = css(shade(color, light * 1.08));
    ctx.fillRect(Math.min(a[0], b[0]) - 1.2, a[1] - 1, Math.abs(b[0] - a[0]) + 2.4, 3.2);
    ctx.fillStyle = 'rgba(20,14,10,.35)';
    ctx.fillRect(Math.min(a[0], b[0]) - 1.2, a[1] + 2.2, Math.abs(b[0] - a[0]) + 2.4, 1);
  }
}

/** Brick gable dressing: courses, blind lancet niches rising under the steps, a hoist hatch (face-local). */
function brickGable(ctx: Ctx, w: number, rise: number, brick: number, trim: number, light: number): void {
  ctx.fillStyle = css(shade(brick, light * 0.78), 0.4);
  for (let y = 4; y < rise + CROWN; y += 4.4) ctx.fillRect(0, -y, w, 0.7);
  const niches = Math.max(3, Math.round(w / 15)) | 1;
  const pitch = w / niches;
  for (let i = 0; i < niches; i++) {
    const cx = pitch * (i + 0.5);
    const top = (rise * (1 - Math.abs(cx - w / 2) / (w / 2))) - 7;
    if (top < 14) continue;
    const nw = Math.min(7, pitch * 0.5);
    const y0 = -5;
    ctx.fillStyle = css(shade(trim, light * 0.92));
    ctx.beginPath();
    ctx.moveTo(cx - nw / 2, y0);
    ctx.lineTo(cx - nw / 2, -top + nw / 2);
    ctx.arc(cx, -top + nw / 2, nw / 2, Math.PI, 0);
    ctx.lineTo(cx + nw / 2, y0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(30,18,12,.32)';
    ctx.fillRect(cx - nw / 2, -top + nw / 2, 1.2, top - nw / 2 + y0);
  }
  // Hoist hatch under the crown.
  ctx.fillStyle = css(shade(0x2a1d16, light));
  ctx.fillRect(w / 2 - 3, -rise * 0.62, 6, 8);
  ctx.fillStyle = css(shade(trim, light));
  ctx.fillRect(w / 2 - 4, -rise * 0.62 - 1.5, 8, 1.5);
}

/**
 * One stepped gable end of a gable roof over (u0, v0)–(u1, v1): `end`
 * picks the far ('back') or the near ('front') wall of the ridge axis.
 */
function stepEnd(
  p: IsoPainter,
  s: ArchStyle,
  box: readonly [number, number, number, number],
  axis: 'u' | 'v',
  end: 'back' | 'front',
  eave: number,
  rise: number,
  wall: number,
  detail?: GableDetail,
): void {
  const [u0, v0, u1, v1] = box;
  const brick = s.kits?.steppedGables === 'brick';
  const color = brick ? s.palette.brick : wall;
  const w = ((axis === 'v' ? u1 - u0 : v1 - v0) * HW);
  const outline = steppedOutline(w, rise);
  const at = axis === 'v' ? (end === 'front' ? v1 : v0) : end === 'front' ? u1 : u0;
  const world = (x: number, y: number): Pt => (axis === 'v' ? p.p(u0 + x / HW, at, eave - y) : p.p(at, v1 - x / HW, eave - y));
  const pts = outline.map(([x, y]) => world(x, y));
  const light = (axis === 'v' ? 1 : R) * (end === 'back' ? 0.9 : 1);
  p.fillPoly(pts, css(shade(color, light)));
  p.normals.fill(pts, axis === 'v' ? N_LEFT : N_RIGHT);
  const face = (draw: (fw: number) => void) => {
    if (axis === 'v') p.leftFace(u0, u1, at, eave, draw);
    else p.rightFace(v0, v1, at, eave, draw);
  };
  face((fw) => {
    if (end === 'front') {
      if (brick) brickGable(p.ctx, fw, rise, color, s.palette.trim, light);
      else detail?.(fw, rise);
    }
    coping(p.ctx, outline, brick ? s.palette.trim : s.palette.ashlar, light);
  });
  p.strokePoly(pts, css(shade(color, 0.4), 0.7), 1);
  const mid = axis === 'v' ? [(u0 + u1) / 2, at] : [at, (v0 + v1) / 2];
  p.addVolumePoint(mid[0]!, mid[1]!, eave + rise + CROWN);
}

/**
 * Gable roof with stepped gable ends (the caller has applied the style's
 * pitch to `rise`): back gable, roof, then the front gable with its
 * dressing (`detail` paints a 'wall' gable's framing).
 */
export function steppedGableRoof(
  p: IsoPainter,
  s: ArchStyle,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  eave: number,
  rise: number,
  color: number,
  wall: number,
  axis: 'u' | 'v',
  detail?: GableDetail,
): void {
  const box = [u0, v0, u1, v1] as const;
  stepEnd(p, s, box, axis, 'back', eave, rise, wall);
  p.gableRoof(u0, v0, u1, v1, eave, rise, color, wall, axis, STEPPED_OVERHANG);
  stepEnd(p, s, box, axis, 'front', eave, rise, wall, detail);
}
