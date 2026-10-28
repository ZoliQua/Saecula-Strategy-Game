import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { SPANISH_COLONIAL } from '../../architecture/spanish/spanishStyles';
import { garita } from '../../architecture/spanish/towerSpots';
import type { IsoPainter } from '../../isoPainter';
import { reachBody } from '../kits/bankPalisade';
import { freeSalients, salientAt, type Salient } from '../kits/salients';
import { cordonFace, embrasures, glacisFace, quoins } from '../kits/starFort';
import { armShadow, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import type { WallAgeStyle } from '../wallKit';

/*
 * Whitewashed bastion trace (Spanish age 3), after the forts of the
 * Spanish Main (Cartagena de Indias, San Juan, Cádiz): a low glacis, a
 * red-ochre plinth, a whitewashed battered scarp with ochre quoins and
 * cordon, an embrasured whitewashed parapet under ochre coping — and on
 * every pier a big domed garita corbelled out over a free salient, two
 * on corner and end bastions. The star-fort outline converges across
 * civs; the garitas and the whitewash carry Spain.
 */

const WHITE = 0xebe5d6;
const OCHRE = 0xd09a4a;
const ALMAGRA = 0xa9543a;
/** Flagged terreplein and wall-walk behind the parapet. */
const WALK = 0xb9ad94;
const GLACIS = 0x6a8a3a;
const GLACIS_TOP = 0x7c9b47;
/** Garita radius (tiles): sized up so the domes read at zoom 1 (the Task 6 lesson). */
const GARITA_R = 0.155;
/** Foot of the garita's corbel on the bastion (just under the cordon). */
const GARITA_Z = 33;

const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];
const PREFER: readonly Salient[] = ['front', 'right', 'left'];

/** The garitas of a pier: the free salients, back to front (one on a rhythm pier, two on corner and end bastions). */
function garitas(p: IsoPainter, arms: number): void {
  const free = freeSalients(arms, PREFER).slice(0, STRAIGHT.includes(arms) ? 1 : 2);
  const spots = (free.length > 0 ? free : (['front'] as const)).map((s) => salientAt(s, 0.2, 0.8));
  spots.sort((x, y) => x[0] + x[1] - (y[0] + y[1]));
  for (const [u, v] of spots) {
    p.addVolumePoint(u, v, garita(p, SPANISH_COLONIAL, u, v, GARITA_Z, GARITA_R));
  }
}

/** Age 3 (Felvilágosodás): whitewashed bastion trace with ochre dressings; domed garitas on every pier. */
export const GARITA_BASTION: WallAgeStyle = {
  readback: true,
  postBody: 0.22,
  armStart: reachBody(0.22),
  postHalf: 0.37,
  postTop: 41,
  shadow: (p, arm) => armShadow(p, arm, 0.36 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.44 * g, 0, 7, { color: GLACIS, top: GLACIS_TOP, batter: 0.15, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS_TOP) });
    prism(p, arm.a, arm.b, 0.3 * g, 7, 11, { color: ALMAGRA, top: ALMAGRA, batter: 0.01 });
    prism(p, arm.a, arm.b, 0.29 * g, 11, 28, { color: WHITE, detail: 'plaster', batter: 0.06 });
    prism(p, arm.a, arm.b, 0.235 * g, 28, 31, { color: OCHRE, top: OCHRE, face: (w, h) => cordonFace(p.ctx, w, h) });
    prism(p, arm.a, arm.b, 0.22 * g, 31, 38, { color: WHITE, top: WALK, batter: 0.03, face: (w, h, l) => embrasures(p.ctx, w, h, l, OCHRE) });
  },
  post: (p, arms) => {
    padShadow(p, 0.44);
    frustum(p, 0.02, 0.02, 0.98, 0.98, 0, 7, 0.14, { color: GLACIS, top: GLACIS_TOP, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS_TOP) });
    frustum(p, 0.14, 0.14, 0.86, 0.86, 7, 11, 0.005, { color: ALMAGRA, top: ALMAGRA });
    frustum(p, 0.15, 0.15, 0.85, 0.85, 11, 30, 0.065, { color: WHITE, detail: 'plaster', face: (w, h, l) => quoins(p.ctx, w, h, l, OCHRE) });
    frustum(p, 0.21, 0.21, 0.79, 0.79, 30, 33, 0, { color: OCHRE, top: OCHRE, face: (w, h) => cordonFace(p.ctx, w, h) });
    frustum(p, 0.22, 0.22, 0.78, 0.78, 33, 41, 0.02, { color: WHITE, top: WALK, face: (w, h, l) => embrasures(p.ctx, w, h, l, OCHRE) });
    garitas(p, arms);
  },
};
