import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { blindArcade, crest, pinnacle } from '../../architecture/kits/atticParapet';
import { POLISH_ATTIC } from '../../architecture/polish/polishStyles';
import type { IsoPainter } from '../../isoPainter';
import { baked } from '../../lighting/normalLayer';
import { css, shade } from '../../palette';
import { gun, quoins, starFortWall } from '../kits/starFort';
import { frontEdge } from '../kits/wallParts';
import { prism } from '../prism';
import type { Arm, WallAgeStyle } from '../wallKit';

/*
 * Age 3 Polish wall (Felvilágosodás): the Zamość bastion trace in the
 * star-fort kit — a turf glacis, a battered scarp of red brick with
 * white limestone quoins and cordon — crowned, as the town's houses
 * are, by a white-stone attic: a low parapet of blind arcades along
 * every run and round every bastion, its top a lacy crest of lunettes
 * between pinnacles. On corner and end bastions the salient carries an
 * ornamented cap: a brick guérite with white quoins under its own
 * crested attic and a tall stone pinnacle, where the kit's other forts
 * carry a plain hipped sentry box. The flat, lacy skyline is the
 * Polish attic's, so the trace reads Polish without colour.
 */

const A = POLISH_ATTIC.palette;
/** White stone of the attics (the Zamość attic crests). */
const STONE = A.trim;
const ATTIC_WALL = shade(A.trim, 0.9);
const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/** Top of the kit's parapet over a run, and over a bastion (starFort.ts). */
export const RUN_PARAPET = 37.5;
export const BASTION_PARAPET = 41;
/** Height of the attic parapet over the kit's parapet (art px): runs, and bastions. */
const RUN_ATTIC_H = 5;
const BASTION_ATTIC_H = 6;
/** Top of the attic wall (the crest stands on it) over a run, and over a bastion. */
export const RUN_ATTIC = RUN_PARAPET + RUN_ATTIC_H;
export const BASTION_ATTIC = BASTION_PARAPET + BASTION_ATTIC_H;
/** Attic wall thickness (tiles). */
const T = 0.045;
/** Crest size (px): lunette and pinnacle scale; a bastion's front crest is half a px larger. */
const CREST = 6;
const BASTION_CREST = CREST + 0.5;

const KIT = starFortWall({
  scarp: A.brick,
  scarpDetail: 'brick',
  dressing: A.trim,
  coping: shade(A.stone, 0.85),
  glacis: 0x5a7a34,
  glacisTop: 0x6d8f3e,
  sentryRoof: STONE,
});

/** Height of a crest's end pinnacles over its coping, for size `size` (atticParapet.ts crest). */
const crestRise = (size: number): number => size * 1.45;
/** Tallest point of a run (its crest's end pinnacles), and of a straight run's bastion pier. */
export const RUN_CREST_TOP = RUN_ATTIC + crestRise(CREST);
export const BASTION_CREST_TOP = BASTION_ATTIC + crestRise(BASTION_CREST);

/** A crest from (ua, va) to (ub, vb) at z, with volume points at its end pinnacles (shadows, canvas bounds). */
function crestAt(p: IsoPainter, ua: number, va: number, ub: number, vb: number, z: number, light: number, size: number): void {
  crest(p.ctx, p.p(ua, va, z), p.p(ub, vb, z), STONE, light, size);
  p.addVolumePoint(ua, va, z + crestRise(size));
  p.addVolumePoint(ub, vb, z + crestRise(size));
}

/** The attic along a run's front edge: a blind-arcaded white slab on the parapet, crested. */
function runAttic(p: IsoPainter, arm: Arm): void {
  const half = 0.22 * arm.girth;
  const a = frontEdge(arm, arm.a, half - T / 2);
  const b = frontEdge(arm, arm.b, half - T / 2);
  prism(p, a, b, T / 2, RUN_PARAPET, RUN_ATTIC, { color: ATTIC_WALL, top: STONE, face: (w, h, l) => blindArcade(p.ctx, w, h, ATTIC_WALL, STONE, l) });
  const fa = frontEdge(arm, arm.a, half);
  const fb = frontEdge(arm, arm.b, half);
  crestAt(p, fa[0], fa[1], fb[0], fb[1], RUN_ATTIC, 1, CREST);
}

/** The attic round a bastion's top (u0..u1 square at z): back crests low, front arcaded walls with crests. */
function bastionAttic(p: IsoPainter, lo: number, hi: number, z: number, h: number, size: number): void {
  const ctx = p.ctx;
  const top = z + h;
  crestAt(p, lo, hi, lo, lo, z + 1, baked(0.86), size * 0.8);
  crestAt(p, lo, lo, hi, lo, z + 1, baked(0.8), size * 0.8);
  p.box(lo, hi - T, hi, hi, z, top, { color: ATTIC_WALL }, STONE);
  p.box(hi - T, lo, hi, hi, z, top, { color: ATTIC_WALL }, STONE);
  p.leftFace(lo, hi, hi, z, (w, hh) => blindArcade(ctx, w, hh, ATTIC_WALL, STONE, 1), h);
  p.rightFace(lo, hi, hi, z, (w, hh) => blindArcade(ctx, w, hh, ATTIC_WALL, STONE, baked(0.76)), h);
  crestAt(p, lo, hi, hi, hi, top, 1.02, size);
  crestAt(p, hi, hi, hi, lo, top, baked(0.78), size);
}

/** The salient's ornamented cap: a brick guérite with white quoins under a crested attic and a tall stone pinnacle. */
function salientCap(p: IsoPainter, z: number): void {
  const [u0, v0, u1, v1] = [0.56, 0.2, 0.78, 0.42];
  const body = 10;
  p.box(u0, v0, u1, v1, z, z + body, { color: A.brick, detail: 'brick' }, STONE);
  const face = (light: number) => (w: number, h: number) => {
    quoins(p.ctx, w, h, light, STONE);
    p.ctx.fillStyle = '#16120f';
    p.ctx.fillRect(w / 2 - 0.9, -7.5, 1.8, 5);
  };
  p.leftFace(u0, u1, v1, z, face(1), body);
  p.rightFace(v0, v1, u1, z, face(baked(0.76)), body);
  const top = z + body;
  // Its own small attic: the walls hide the roof, the crest and corner pinnacles crown it.
  const ctx = p.ctx;
  crestAt(p, u0, v1, u0, v0, top + 1, baked(0.86), 4);
  crestAt(p, u0, v0, u1, v0, top + 1, baked(0.8), 4);
  p.box(u0, v1 - 0.03, u1, v1, top, top + 4, { color: ATTIC_WALL }, STONE);
  p.box(u1 - 0.03, v0, u1, v1, top, top + 4, { color: ATTIC_WALL }, STONE);
  crestAt(p, u0, v1, u1, v1, top + 4, 1.02, 4.5);
  crestAt(p, u1, v1, u1, v0, top + 4, baked(0.78), 4.5);
  // The centre finial: a tall stone obelisk with a ball, over the hidden roof.
  const [x, y] = p.p((u0 + u1) / 2, (v0 + v1) / 2, top + 3);
  pinnacle(ctx, x, y, 15, STONE, 1.02);
  p.addVolumePoint((u0 + u1) / 2, (v0 + v1) / 2, top + 16);
  ctx.strokeStyle = css(shade(STONE, 0.6), 0.6);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 12);
  ctx.stroke();
}

export const ZAMOSC_BASTION: WallAgeStyle = {
  ...KIT,
  arm: (p: IsoPainter, arm: Arm) => {
    KIT.arm(p, arm);
    runAttic(p, arm);
  },
  post: (p: IsoPainter, arms: number) => {
    // The kit's bastion body only (as a straight run's pier), then its attic, then the corner's gun and ornamented cap.
    KIT.post(p, STRAIGHT[0]!);
    bastionAttic(p, 0.22, 0.78, BASTION_PARAPET, BASTION_ATTIC_H, BASTION_CREST);
    if (STRAIGHT.includes(arms)) return;
    gun(p, BASTION_PARAPET);
    salientCap(p, BASTION_PARAPET);
  },
};
