import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { POLISH_ATTIC, POLISH_KRAKOW } from '../../architecture/polish/polishStyles';
import { tufts } from '../../architecture/kits/turfRoof';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { gun, starFortWall } from '../kits/starFort';
import { frontEdge } from '../kits/wallParts';
import type { Arm, WallAgeStyle } from '../wallKit';

/*
 * Age 3 Polish wall (Felvilágosodás): the Zamość bastion trace in the
 * star-fort kit — a turf glacis, a battered scarp of red brick with
 * white limestone quoins and cordon — its parapet topped with the
 * earthworks of the bastioned town: a grass-grown crest along every
 * run and round every bastion (the skyline reads green, not as bare
 * brick), and the guérites under green copper hips, the copper of the
 * Polish spires.
 */

const A = POLISH_ATTIC.palette;
/** Turf of the parapet's earthwork crest. */
const TURF = 0x4f6f2c;
/** Green copper of the guérites' hips (the Kraków spires). */
const COPPER = POLISH_KRAKOW.palette.metal;
const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/** Top of the kit's parapet over a run, and over a bastion (starFort.ts). */
export const RUN_PARAPET = 37.5;
export const BASTION_PARAPET = 41;

const KIT = starFortWall({
  scarp: A.brick,
  scarpDetail: 'brick',
  dressing: A.trim,
  coping: TURF,
  glacis: 0x5a7a34,
  glacisTop: 0x6d8f3e,
  sentryRoof: COPPER,
});

/** A brick guérite with white quoins on the bastion's right-hand salient, under a green copper hip. */
function guerite(p: IsoPainter, z: number): void {
  const [u0, v0, u1, v1] = [0.6, 0.2, 0.78, 0.38];
  p.box(u0, v0, u1, v1, z, z + 11, { color: A.brick, detail: 'brick' }, A.trim);
  const slit = (w: number) => {
    p.ctx.fillStyle = css(A.trim);
    p.ctx.fillRect(0, -11, 1.6, 11);
    p.ctx.fillRect(w - 1.6, -11, 1.6, 11);
    p.ctx.fillStyle = '#16120f';
    p.ctx.fillRect(w / 2 - 0.9, -8.5, 1.8, 5.5);
  };
  p.leftFace(u0, u1, v1, z, slit, 11);
  p.rightFace(v0, v1, u1, z, slit, 11);
  const prev = p.material;
  p.material = 'copper';
  p.hipRoof(u0, v0, u1, v1, z + 11, 10, COPPER, 0.035);
  p.material = prev;
}

/** A green crest line with grass tufts between two canvas points. */
function crest(p: IsoPainter, a: readonly [number, number], b: readonly [number, number]): void {
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(TURF, 1.1), 0.95);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  tufts(p, a, b, TURF, 1.05, 1.5);
}

export const ZAMOSC_BASTION: WallAgeStyle = {
  ...KIT,
  arm: (p: IsoPainter, arm: Arm) => {
    KIT.arm(p, arm);
    const half = 0.22 * arm.girth;
    const a = frontEdge(arm, arm.a, half);
    const b = frontEdge(arm, arm.b, half);
    crest(p, p.p(a[0], a[1], RUN_PARAPET), p.p(b[0], b[1], RUN_PARAPET));
  },
  post: (p: IsoPainter, arms: number) => {
    // The kit's bastion body only (as a straight run's pier), then the earthwork crest, then the corner's gun and guérite over it.
    KIT.post(p, STRAIGHT[0]!);
    const t = 0.22;
    const front = p.p(1 - t, 1 - t, BASTION_PARAPET);
    crest(p, p.p(t, 1 - t, BASTION_PARAPET), front);
    crest(p, front, p.p(1 - t, t, BASTION_PARAPET));
    if (STRAIGHT.includes(arms)) return;
    gun(p, BASTION_PARAPET);
    guerite(p, BASTION_PARAPET);
  },
};
