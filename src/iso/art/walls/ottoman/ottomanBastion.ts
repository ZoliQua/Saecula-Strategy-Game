import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { leadDome } from '../../architecture/kits/leadDome';
import { pointedPath } from '../../architecture/ottoman/ottomanParts';
import { OTTOMAN_OSMANLI } from '../../architecture/ottoman/ottomanStyles';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { starFortWall } from '../kits/starFort';
import type { WallAgeStyle } from '../wallKit';

/*
 * Age 3 Ottoman wall (Felvilágosodás): a bastion trace in the star-fort
 * kit, pale cut limestone laid in banded courses — a darker, honey
 * course every few rows of pale ashlar — and on every corner and end
 * bastion a big domed köşk: a square stone kiosk opening in pointed
 * arches on every side, a broad lead dome over a low drum and a gilt
 * crescent finial (the Osmanlı lead domes on the ramparts). The köşk
 * fills the bastion's terreplein, so the trace reads at play zoom as a
 * chain of domes where the kit's other forts carry a gun and a hipped
 * guérite.
 */

const O = OTTOMAN_OSMANLI.palette;
const LEAD = O.metal;
const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/** Top of the kit's parapet over a bastion (starFort.ts). */
export const BASTION_PARAPET = 41;
/** Height of the köşk's stone body over the parapet. */
const KOSK_BODY = 12;
/** The köşk's square body (tiles) and its dome radius. */
const KOSK: readonly [number, number, number, number] = [0.3, 0.3, 0.8, 0.8];
const DOME_R = 0.25;
/** Honey course of the banded ashlar. */
const BAND = 0xc9a874;

/** Banded ashlar: pale courses with staggered joints, a honey band every third course. */
function bandedAshlar(ctx: Ctx, w: number, h: number, light: number): void {
  for (let y = 0, row = 0; y < h - 1; y += 5, row++) {
    if (row % 3 === 2) {
      ctx.fillStyle = css(shade(BAND, light * 0.95), 0.85);
      ctx.fillRect(0, -y - 5, w, 4.2);
    }
    ctx.fillStyle = css(shade(O.ashlar, light * 0.62), 0.5);
    ctx.fillRect(0, -y - 5, w, 0.7);
    for (let x = (row % 2) * 6; x < w; x += 12) ctx.fillRect(x, -y - 5, 0.6, 5);
  }
}

const KIT = starFortWall({
  scarp: O.ashlar,
  scarpDetail: 'stone',
  dressing: shade(O.stone, 0.9),
  coping: shade(O.stone, 0.66),
  glacis: 0x7a7a46,
  glacisTop: 0x8f8f52,
  sentryRoof: LEAD,
  scarpFace: bandedAshlar,
});

/** Pointed arches across a köşk face (face-local), under a trim cornice. */
function arcadeFace(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(BAND, light * 0.92));
  ctx.fillRect(0, -h * 0.42, w, 1.4);
  const n = 2;
  const pitch = w / n;
  for (let i = 0; i < n; i++) {
    const aw = pitch * 0.56;
    const x = pitch * (i + 0.5) - aw / 2;
    ctx.fillStyle = css(shade(O.trim, light));
    pointedPath(ctx, x - 1, -1, aw + 2, h - 2.4);
    ctx.fill();
    ctx.fillStyle = css(shade(0x17120e, light));
    pointedPath(ctx, x, -1, aw, h - 3.6);
    ctx.fill();
  }
  ctx.fillStyle = css(shade(O.trim, light * 1.04));
  ctx.fillRect(0, -h, w, 1.8);
}

/** The domed köşk on the bastion's terreplein: pointed-arched stone kiosk, broad lead dome on a low drum, crescent finial. */
function kosk(p: IsoPainter, z: number): void {
  const [u0, v0, u1, v1] = KOSK;
  p.box(u0, v0, u1, v1, z, z + KOSK_BODY, { color: O.ashlar, detail: 'stone' }, shade(O.stone, 0.8));
  p.leftFace(u0, u1, v1, z, (w, h) => arcadeFace(p.ctx, w, h, 1), KOSK_BODY);
  p.rightFace(v0, v1, u1, z, (w, h) => arcadeFace(p.ctx, w, h, 0.78), KOSK_BODY);
  const prev = p.material;
  p.material = 'slate';
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  leadDome(p, uc, vc, DOME_R, z + KOSK_BODY, LEAD, { rise: 0.92, drum: 3, drumColor: O.ashlar, seams: 5, alem: true });
  p.material = prev;
}

export const OTTOMAN_BASTION: WallAgeStyle = {
  ...KIT,
  post: (p: IsoPainter, arms: number) => {
    // The kit's bastion body only (as a straight run's pier), then the corner's köşk over its terreplein.
    KIT.post(p, STRAIGHT[0]!);
    if (STRAIGHT.includes(arms)) return;
    kosk(p, BASTION_PARAPET);
  },
};
