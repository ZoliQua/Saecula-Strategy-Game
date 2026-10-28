import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import type { Ctx } from '../../canvas';
import { css, shade } from '../../palette';
import { reachBody } from '../kits/bankPalisade';
import { cordonFace, glacisFace, gun, quoins } from '../kits/starFort';
import { freeSalients, salientAt } from '../kits/salients';
import { armShadow, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import type { WallAgeStyle } from '../wallKit';
import { echauguette } from './frenchWallParts';

/*
 * Vauban trace (French age 3). It shares the star-fort kit's glacis,
 * quoins, cordon and gun, but not its outline: the masonry stops at a
 * heavy round cordon (the magistral) and the parapet above is turfed
 * earth, so a run reads as a pale limestone band under a green crest,
 * not as an embrasured brick or sandstone parapet; and every bastion,
 * the rhythm piers of a straight run too, hangs a stone échauguette
 * with a domed cap over its salient. Guns sit on corner and end
 * bastions only.
 */

/** Pale Burgundy limestone of the scarp: bright enough to stay pale at dusk. */
const LIMESTONE = 0xd8cfb7;
/** Whiter dressings: cordon, quoins, the échauguettes. */
const DRESSING = 0xebe5d4;
const GLACIS = 0x5c7d35;
const GLACIS_TOP = 0x6d9141;
/** The turfed earth parapet over the cordon. */
const PARAPET = 0x58792f;
const PARAPET_TOP = 0x74974a;

const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/** Grass on the parapet's outer slope, a darker line where it meets the cordon. */
function parapetFace(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(PARAPET_TOP, light * 1.05), 0.6);
  for (let x = 1; x < w; x += 4) ctx.fillRect(x, -h + ((x * 5) % 3), 1, 2 + ((x * 3) % 3));
  ctx.fillStyle = 'rgba(20,28,10,.35)';
  ctx.fillRect(0, -1.4, w, 1.4);
}

/** Age 3 (Felvilágosodás): Vauban trace in pale limestone, a round cordon under a turfed parapet, échauguettes on every bastion. */
export const VAUBAN: WallAgeStyle = {
  readback: true,
  postBody: 0.22,
  armStart: reachBody(0.22),
  postHalf: 0.37,
  postTop: 44,
  shadow: (p, arm) => armShadow(p, arm, 0.36 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.44 * g, 0, 7, { color: GLACIS, top: GLACIS_TOP, batter: 0.15, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS_TOP) });
    prism(p, arm.a, arm.b, 0.29 * g, 7, 29, { color: LIMESTONE, detail: 'stone', batter: 0.07 });
    prism(p, arm.a, arm.b, 0.245 * g, 29, 33, { color: DRESSING, top: DRESSING, face: (w, h) => cordonFace(p.ctx, w, h) });
    prism(p, arm.a, arm.b, 0.2 * g, 33, 38, { color: PARAPET, top: PARAPET_TOP, batter: 0.07, face: (w, h, l) => parapetFace(p.ctx, w, h, l) });
  },
  post: (p, arms) => {
    padShadow(p, 0.44);
    frustum(p, 0.02, 0.02, 0.98, 0.98, 0, 7, 0.14, { color: GLACIS, top: GLACIS_TOP, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS_TOP) });
    frustum(p, 0.15, 0.15, 0.85, 0.85, 7, 31, 0.075, { color: LIMESTONE, detail: 'stone', face: (w, h, l) => quoins(p.ctx, w, h, l, DRESSING) });
    frustum(p, 0.2, 0.2, 0.8, 0.8, 31, 35.5, 0, { color: DRESSING, top: DRESSING, face: (w, h) => cordonFace(p.ctx, w, h) });
    frustum(p, 0.22, 0.22, 0.78, 0.78, 35.5, 41, 0.05, { color: PARAPET, top: PARAPET_TOP, face: (w, h, l) => parapetFace(p.ctx, w, h, l) });
    // The échauguette hangs over a salient, its corbel out from the scarp: the front corner on a
    // rhythm pier; on corner and end bastions a side corner, clear of the gun on the front one.
    // The salient is a free one: never where a diagonal arm runs out (kits/salients.ts).
    const straight = STRAIGHT.includes(arms);
    const [free] = freeSalients(arms, straight ? ['front', 'right', 'left'] : ['right', 'left']);
    const [u, v] = salientAt(free ?? (straight ? 'front' : 'right'), 0.2, 0.8);
    echauguette(p, u, v, 31, LIMESTONE, DRESSING);
    if (!straight) gun(p, 41);
  },
};
