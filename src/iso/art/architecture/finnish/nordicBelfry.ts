import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { logBox } from '../kits/logWall';
import { bellRoof } from '../kits/shingleRoof';
import { octPrism, tentRoof } from '../kits/tentRoof';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { nordic, wallBlock, type Block } from './nordicParts';

/*
 * The Finnish bell tower (kellotapuli): a squat square timber tower in
 * two stages. The lower stage ends under a flared bell-roof skirt; the
 * narrower upper stage is the belfry, louvred or open on posts (a
 * lookout). Age 2 caps it with a shingled pyramid and a ball finial;
 * age 3 with a bell roof carrying a small octagonal lantern and spire.
 * No tent shaft and no onion: the square stages and the flared skirt
 * are the silhouette.
 */

export interface BelfryOpts {
  /** Height of the lower stage (art px above z0). */
  readonly lower: number;
  /** Height of the belfry stage. */
  readonly upper: number;
  /** Open belfry on corner posts; `inside` paints its contents (the archer) between the back and front posts. */
  readonly inside?: (z: number) => void;
  /** Face painter of the lower stage's lit face (doors, a crest). */
  readonly face?: (w: number, h: number) => void;
  /** Unpainted timber instead of the style's walls and roofs (a church's bell tower): log, shingle and trim colours. */
  readonly timber?: { readonly wall: number; readonly roof: number; readonly trim: number };
}

/** Louvred sound openings of the belfry, face-local. */
function louvres(p: IsoPainter, light: number): (w: number, h: number) => void {
  return (w, h) => {
    const ctx = p.ctx;
    const ow = w * 0.46;
    const x = w / 2 - ow / 2;
    ctx.fillStyle = css(shade(0x1c1612, light));
    ctx.fillRect(x, -h + 5, ow, h - 11);
    ctx.fillStyle = css(shade(0x6a5644, light), 0.9);
    for (let y = -h + 8; y < -7; y += 3.5) ctx.fillRect(x, y, ow, 1.4);
  };
}

/** Thin finial: a pole with a ball (age 2) or a spire tip (age 3). */
function finial(p: IsoPainter, u: number, v: number, z: number, h: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, z);
  ctx.fillStyle = '#3a3027';
  ctx.fillRect(x - 0.9, y - h, 1.8, h);
  ctx.fillStyle = '#b89a4a';
  ctx.beginPath();
  ctx.arc(x, y - h * 0.6, 2.4, 0, Math.PI * 2);
  ctx.fill();
  p.addVolumePoint(u, v, z + h);
}

/**
 * Bell tower over block b from z0. Returns the top height (finial
 * included). Its cap follows the style's belfry reading.
 */
export function belfry(p: IsoPainter, s: ArchStyle, b: Block, z0: number, o: BelfryOpts): number {
  const [u0, v0, u1, v1] = b;
  const c = s.palette;
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  const r = Math.min(u1 - u0, v1 - v0) / 2;
  const z1 = z0 + o.lower;
  const t = o.timber;
  const roof = t?.roof ?? c.roof;
  const trim = t?.trim ?? c.trim;
  const stage = (sb: Block, za: number, zz: number, left?: (w: number, h: number) => void, right?: (w: number, h: number) => void, ends = 0.05) => {
    if (!t) return wallBlock(p, s, sb, za, zz, left, right, ends);
    logBox(p, sb[0], sb[1], sb[2], sb[3], za, zz, t.wall, ends);
    if (left) p.leftFace(sb[0], sb[2], sb[3], za, left, zz - za);
    if (right) p.rightFace(sb[1], sb[3], sb[2], za, right, zz - za);
  };
  stage(b, z0, z1, o.face);
  const prev = p.material;
  p.material = 'shingle';
  // Flared skirt over the lower stage, seating the belfry.
  bellRoof(p, uc, vc, r + 0.1, z1, 26, roof, { top: 0.62 });
  const ri = r * 0.62;
  const inner: Block = [uc - ri, vc - ri, uc + ri, vc + ri];
  const zb = z1 + 10;
  const z2 = zb + o.upper;
  if (o.inside) {
    p.ground(inner[0], inner[1], inner[2], inner[3], shade(c.timber, 1.1), zb);
    for (const [u, v] of [[inner[0], inner[1]], [inner[2], inner[1]], [inner[0], inner[3]]] as const) post(p, u + 0.02, v + 0.02, zb, z2, 2.4, c.darkWood);
    o.inside(zb);
    // Breastwork rails on the near sides.
    p.box(inner[0], inner[3] - 0.04, inner[2], inner[3], zb, zb + 11, { color: c.darkWood, detail: 'planks' }, c.darkWood);
    p.box(inner[2] - 0.04, inner[1], inner[2], inner[3], zb, zb + 11, { color: c.darkWood, detail: 'planks' }, c.darkWood);
    post(p, inner[2] - 0.02, inner[3] - 0.02, zb, z2, 2.4, c.darkWood);
  } else {
    stage(inner, zb - 2, z2, louvres(p, 1), louvres(p, R), 0.03);
  }
  let top: number;
  if (nordic(s).belfry === 'lantern') {
    // Bell roof, a small octagonal lantern, a little bell cap and the spire.
    const capTop = bellRoof(p, uc, vc, ri + 0.06, z2, 34, roof, { top: 0.36, hips: trim });
    const lr = (ri + 0.06) * 0.36;
    octPrism(p, uc, vc, lr, capTop, capTop + 16, trim, 'plain', (w, h, light) => {
      p.ctx.fillStyle = css(shade(0x1c1612, light));
      p.ctx.fillRect(w / 2 - 1.5, -h + 3, 3, h - 6);
    });
    const tip = tentRoof(p, uc, vc, lr, capTop + 16, 14, roof, { material: 'shingle', eave: 0.03 });
    finial(p, uc, vc, tip - 2, 16);
    top = tip + 14;
  } else {
    // Shingled pyramid with a ball finial.
    p.hipRoof(inner[0], inner[1], inner[2], inner[3], z2, 40, roof, 0.06);
    finial(p, uc, vc, z2 + 38, 14);
    top = z2 + 52;
  }
  p.material = prev;
  return top;
}
