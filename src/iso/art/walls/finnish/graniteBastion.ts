import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { FINNISH_GREYSTONE, FINNISH_GUSTAVIAN } from '../../architecture/finnish/finnishStyles';
import { bellRoof } from '../../architecture/kits/shingleRoof';
import { tufts } from '../../architecture/kits/turfRoof';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { reachBody, turfFace } from '../kits/bankPalisade';
import { cordonFace, glacisFace, gun, quoins } from '../kits/starFort';
import { armShadow, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import type { WallAgeStyle } from '../wallKit';
import { sodEdge, turfCrest } from './finnishWallParts';

/*
 * Age 3 Finnish wall (Felvilágosodás): a granite bastion trace in the
 * star-fort kit's outline (Suomenlinna, Hamina) — a turf glacis, a
 * battered scarp of dressed grey granite with long-and-short quoins and
 * a pale cordon — but no masonry parapet: the scarp carries a sloped
 * turf rampart of dark moss-green sods over a soil edge, its crest
 * ragged with grass (darker than the meadow, so it reads), the skyline cue. Corner
 * and end bastions mount a gun beside a granite sentry box under a
 * shingled bell roof.
 */

const G = FINNISH_GREYSTONE.palette;
const SCARP = G.ashlar;
const DRESSING = 0xd2cec4;
/** Dark, mossy rampart turf and its soil edge: set apart from the meadow's brighter green. */
const TURF = 0x3f5a26;
const SOD = 0x3a2a1a;
const GLACIS = 0x55703a;
/** Brown shingles of the sentry box's bell roof (the Gustavian roofs). */
const SHINGLE = FINNISH_GUSTAVIAN.palette.roof;
const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/** Top of the turf rampart on a bastion (art px). */
export const BASTION_TURF_TOP = 43;
/** Top of the turf rampart over a run. */
const RUN_TURF_TOP = 40;
const POST_BODY = 0.22;

/** A turf bank's face: the turf lip over the top, sods in faint courses below. */
function rampartFace(p: IsoPainter, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(TURF, light * 0.82), 0.5);
  for (let y = 3; y < h - 2; y += 3.5) ctx.fillRect(0, -y, w, 0.8);
  turfFace(ctx, w, h, light, shade(TURF, 1.08));
}

/** A granite sentry box on the bastion's right-hand salient, under a shingled bell roof. */
function sentryBox(p: IsoPainter, z: number): void {
  const [u0, v0, u1, v1] = [0.6, 0.2, 0.78, 0.38];
  p.box(u0, v0, u1, v1, z, z + 12, { color: DRESSING, detail: 'stone' }, DRESSING);
  const loop = (w: number) => {
    p.ctx.fillStyle = '#16120f';
    p.ctx.fillRect(w / 2 - 0.9, -9, 1.8, 5.5);
  };
  p.leftFace(u0, u1, v1, z, loop, 12);
  p.rightFace(v0, v1, u1, z, loop, 12);
  const prev = p.material;
  p.material = 'shingle';
  bellRoof(p, (u0 + u1) / 2, (v0 + v1) / 2, 0.12, z + 12, 15, SHINGLE, { hips: shade(SHINGLE, 0.6) });
  p.material = prev;
}

export const GRANITE_BASTION: WallAgeStyle = {
  readback: true,
  postBody: POST_BODY,
  armStart: reachBody(POST_BODY),
  postHalf: 0.37,
  postTop: BASTION_TURF_TOP + 3,
  shadow: (p, arm) => armShadow(p, arm, 0.36 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.44 * g, 0, 7, { color: GLACIS, top: GLACIS, batter: 0.15, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS) });
    prism(p, arm.a, arm.b, 0.29 * g, 7, 27, { color: SCARP, detail: 'stone', batter: 0.07 });
    prism(p, arm.a, arm.b, 0.235 * g, 27, 30, { color: DRESSING, top: DRESSING, face: (w, h) => cordonFace(p.ctx, w, h) });
    prism(p, arm.a, arm.b, 0.225 * g, 30, RUN_TURF_TOP, { color: TURF, top: shade(TURF, 1.05), batter: 0.09, face: (w, h, l) => rampartFace(p, w, h, l) });
    turfCrest(p, arm, 0.135 * g, RUN_TURF_TOP, TURF, SOD);
  },
  post: (p, arms) => {
    padShadow(p, 0.44);
    frustum(p, 0.02, 0.02, 0.98, 0.98, 0, 7, 0.14, { color: GLACIS, top: GLACIS, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS) });
    frustum(p, 0.15, 0.15, 0.85, 0.85, 7, 30, 0.075, { color: SCARP, detail: 'stone', face: (w, h, l) => quoins(p.ctx, w, h, l, DRESSING) });
    frustum(p, 0.21, 0.21, 0.79, 0.79, 30, 33, 0, { color: DRESSING, top: DRESSING, face: (w, h) => cordonFace(p.ctx, w, h) });
    frustum(p, 0.22, 0.22, 0.78, 0.78, 33, BASTION_TURF_TOP, 0.06, { color: TURF, top: shade(TURF, 1.05), face: (w, h, l) => rampartFace(p, w, h, l) });
    // Grass along the bastion's two front crests.
    const t = 0.28;
    const front = p.p(1 - t, 1 - t, BASTION_TURF_TOP);
    const left = p.p(t, 1 - t, BASTION_TURF_TOP);
    const right = p.p(1 - t, t, BASTION_TURF_TOP);
    sodEdge(p, left, front, SOD);
    sodEdge(p, front, right, SOD);
    tufts(p, left, front, TURF, 1.05, 1.6);
    tufts(p, front, right, TURF, 0.8, 1.6);
    if (STRAIGHT.includes(arms)) return;
    gun(p, BASTION_TURF_TOP);
    sentryBox(p, BASTION_TURF_TOP);
  },
};
