import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { leadDome } from '../../architecture/kits/leadDome';
import { OTTOMAN_OSMANLI } from '../../architecture/ottoman/ottomanStyles';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { gun, starFortWall } from '../kits/starFort';
import type { WallAgeStyle } from '../wallKit';

/*
 * Age 3 Ottoman wall (Felvilágosodás): a bastion trace in the star-fort
 * kit, pale cut limestone with darker dressings, and on every corner
 * and end bastion a domed köşk — a small stone kiosk under a lead dome
 * with a gilt crescent finial (the Osmanlı lead domes in miniature)
 * where the kit's other forts carry a hipped guérite.
 */

const O = OTTOMAN_OSMANLI.palette;
const LEAD = O.metal;
const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/** Top of the kit's parapet over a bastion (starFort.ts). */
export const BASTION_PARAPET = 41;
/** Height of the köşk's stone body over the parapet. */
const KOSK_BODY = 14;

const KIT = starFortWall({
  scarp: O.ashlar,
  scarpDetail: 'stone',
  dressing: shade(O.stone, 0.9),
  coping: shade(O.stone, 0.66),
  glacis: 0x7a7a46,
  glacisTop: 0x8f8f52,
  sentryRoof: LEAD,
});

/** The domed köşk on the bastion's right-hand salient: a stone kiosk with an arched opening each side, a lead dome and a crescent finial. */
function kosk(p: IsoPainter, z: number): void {
  const [u0, v0, u1, v1] = [0.54, 0.16, 0.82, 0.44];
  p.box(u0, v0, u1, v1, z, z + KOSK_BODY, { color: O.ashlar, detail: 'stone' }, shade(O.stone, 0.8));
  const arch = (w: number) => {
    p.ctx.fillStyle = '#17120e';
    p.ctx.beginPath();
    p.ctx.moveTo(w / 2 - 2, -1.5);
    p.ctx.lineTo(w / 2 - 2, -6.5);
    p.ctx.arc(w / 2, -6.5, 2, Math.PI, 0);
    p.ctx.lineTo(w / 2 + 2, -1.5);
    p.ctx.fill();
    p.ctx.fillStyle = css(O.trim);
    p.ctx.fillRect(0, -KOSK_BODY, w, 1.2);
  };
  p.leftFace(u0, u1, v1, z, arch, KOSK_BODY);
  p.rightFace(v0, v1, u1, z, arch, KOSK_BODY);
  const prev = p.material;
  p.material = 'slate';
  leadDome(p, (u0 + u1) / 2, (v0 + v1) / 2, 0.15, z + KOSK_BODY, LEAD, { rise: 1, alem: true });
  p.material = prev;
}

export const OTTOMAN_BASTION: WallAgeStyle = {
  ...KIT,
  post: (p: IsoPainter, arms: number) => {
    // The kit's bastion body only (as a straight run's pier), then the corner's gun and köşk over it.
    KIT.post(p, STRAIGHT[0]!);
    if (STRAIGHT.includes(arms)) return;
    gun(p, BASTION_PARAPET);
    kosk(p, BASTION_PARAPET);
  },
};
