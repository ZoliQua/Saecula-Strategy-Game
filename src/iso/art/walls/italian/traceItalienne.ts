import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { ITALIAN_RINASCIMENTO } from '../../architecture/italian/italianStyles';
import { cupola } from '../../architecture/italian/italianParts';
import { drumOpening, drumWall } from '../../architecture/kits/drum';
import type { IsoPainter } from '../../isoPainter';
import { reachBody } from '../kits/bankPalisade';
import { freeSalients, salientAt, type Salient } from '../kits/salients';
import { cordonFace, embrasures, glacisFace, gun, quoins } from '../kits/starFort';
import { armShadow, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import type { WallAgeStyle } from '../wallKit';

/*
 * Trace italienne (Italian age 3), after Sangallo's and Sanmicheli's
 * bastions (Lucca, Padua, Palmanova): a low glacis, a white Istrian
 * stone plinth, a battered scarp in orange brick, the thick rounded
 * white stone cordon (cordone) that marks the Italian school, and a
 * brick parapet with gun embrasures under a white coping — and on every
 * pier a round stone garitta corbelled out over a free salient under a
 * small terracotta lantern dome, its gilt ball on the skyline. Corner
 * and end bastions also mount a gun. The star-fort outline converges
 * across civs; the bright brick, the white cordon and the lantern
 * domes carry Italy.
 */

const RIN = ITALIAN_RINASCIMENTO.palette;
/** Orange Lombard brick, brighter and more orange than the English plum brick or the German red sandstone. */
const BRICK = 0xc9733f;
/** White Istrian stone of the plinth, cordon, quoins and coping. */
const ISTRIA = 0xece6d6;
/** Earth-and-brick terreplein, dark enough not to read as a pale paved strip from afar. */
const WALK = 0x8e6c4e;
const CORDON_TOP = 0xcfc8b6;
const GLACIS = 0x5f8435;
const GLACIS_TOP = 0x73973f;
/** The garitta: a stone drum corbelled out on the salient, its dome and lantern. */
const GARITTA_R = 0.12;
const GARITTA_Z = 30;
const GARITTA_TOP = 48;

const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];
const PREFER: readonly Salient[] = ['front', 'right', 'left'];
const SIDE_FIRST: readonly Salient[] = ['right', 'left', 'front'];

/** A round stone garitta on a salient: corbel, drum with two slits, a terracotta lantern dome. */
function garitta(p: IsoPainter, u: number, v: number): void {
  drumWall(p, u, v, GARITTA_R * 0.55, GARITTA_Z - 6, GARITTA_Z, ISTRIA, 'stone');
  drumWall(p, u, v, GARITTA_R, GARITTA_Z, GARITTA_TOP, ISTRIA, 'stone');
  for (const phi of [Math.PI / 4 - 0.7, Math.PI / 4 + 0.7]) drumOpening(p, u, v, GARITTA_R, phi, 1.2, GARITTA_Z + 6, 7, ISTRIA, 'dark');
  const top = cupola(p, u, v, GARITTA_TOP, GARITTA_R + 0.012, 2, ISTRIA, RIN.metal, ISTRIA);
  p.addVolumePoint(u, v, top);
}

/** Age 3 (Felvilágosodás): brick bastion trace with a white stone cordon; a lantern-domed garitta on every pier. */
export const TRACE_ITALIENNE: WallAgeStyle = {
  readback: true,
  postBody: 0.22,
  armStart: reachBody(0.22),
  postHalf: 0.37,
  postTop: 41,
  shadow: (p, arm) => armShadow(p, arm, 0.36 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.44 * g, 0, 7, { color: GLACIS, top: GLACIS_TOP, batter: 0.15, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS_TOP) });
    prism(p, arm.a, arm.b, 0.3 * g, 7, 11, { color: ISTRIA, top: CORDON_TOP, batter: 0.01 });
    prism(p, arm.a, arm.b, 0.29 * g, 11, 27, { color: BRICK, detail: 'brick', batter: 0.06 });
    prism(p, arm.a, arm.b, 0.25 * g, 27, 31, { color: ISTRIA, top: CORDON_TOP, face: (w, h) => cordonFace(p.ctx, w, h) });
    prism(p, arm.a, arm.b, 0.22 * g, 31, 38, { color: BRICK, detail: 'brick', top: WALK, batter: 0.03, face: (w, h, l) => embrasures(p.ctx, w, h, l, ISTRIA) });
  },
  post: (p, arms) => {
    padShadow(p, 0.44);
    frustum(p, 0.02, 0.02, 0.98, 0.98, 0, 7, 0.14, { color: GLACIS, top: GLACIS_TOP, face: (w, h, l) => glacisFace(p.ctx, w, h, l, GLACIS_TOP) });
    frustum(p, 0.14, 0.14, 0.86, 0.86, 7, 11, 0.005, { color: ISTRIA, top: CORDON_TOP });
    frustum(p, 0.15, 0.15, 0.85, 0.85, 11, 30, 0.065, { color: BRICK, detail: 'brick', face: (w, h, l) => quoins(p.ctx, w, h, l, ISTRIA) });
    frustum(p, 0.2, 0.2, 0.8, 0.8, 30, 34, 0, { color: ISTRIA, top: CORDON_TOP, face: (w, h) => cordonFace(p.ctx, w, h) });
    frustum(p, 0.22, 0.22, 0.78, 0.78, 34, 41, 0.02, { color: BRICK, detail: 'brick', top: WALK, face: (w, h, l) => embrasures(p.ctx, w, h, l, ISTRIA) });
    const straight = STRAIGHT.includes(arms);
    if (!straight) gun(p, 41);
    // The gun's muzzle stands over the front salient, so corner and end bastions hang the garitta on a side one.
    const s = freeSalients(arms, straight ? PREFER : SIDE_FIRST)[0] ?? (straight ? 'front' : 'right');
    const [u, v] = salientAt(s, 0.2, 0.8);
    garitta(p, u, v);
  },
};
