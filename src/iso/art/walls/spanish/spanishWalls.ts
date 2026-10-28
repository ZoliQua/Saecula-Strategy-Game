import type { WallStyleId } from '../../../../config/civs';
import { archPath } from '../../architecture/kits/patio';
import { drumOpening, drumWall } from '../../architecture/kits/drum';
import { disc, ringBack } from '../../architecture/towerParts';
import { R } from '../../architecture/facade';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { armShadow, drumStart, frontEdge, padShadow } from '../kits/wallParts';
import { prism, type UV } from '../prism';
import { stations, type WallAgeStyle } from '../wallKit';
import { GARITA_BASTION } from './garitaBastion';
import { almena, brickQuoins, rubbleFace, tapialFace } from './spanishWallParts';

/*
 * Spanish walls (M5), one character per age, matched to the Spanish
 * towers and palettes: a Celtiberian dry-stone wall of big unmortared
 * blocks under a ragged crest of capstones, with round flat-topped
 * rubble towers (the castros of the north, Numantia) — no timber, no
 * roof; an ochre rammed-earth (tapial) curtain on a stone socle with
 * its putlog holes, crowned by big stepped pyramidal merlons, and
 * square tapial towers with horseshoe lights in alfiz frames; and a
 * whitewashed bastion trace whose every pier hangs a domed garita
 * (garitaBastion.ts).
 */

/** Warm grey-ochre granite of the dry-stone walls. */
const DRY = 0xab9574;
const EARTH = 0x7d6446;
const CELT_R = 0.29;
const CELT_HALF = 0.17;
const CELT_CREST = 38;
/** Roof of the round tower, where the banner pole stands. */
const CELT_ROOF = 74;

/** One rough capstone centred on (u, v), `a` tiles to each side, on the crest at z. */
function capstone(p: IsoPainter, u: number, v: number, z: number): void {
  const a = 0.05 + p.random() * 0.035;
  const h = 4 + p.random() * 6;
  const c = shade(DRY, 0.9 + p.random() * 0.18);
  p.box(u - a, v - a, u + a, v + a, z - 1, z + h, { color: c }, shade(c, 1.1));
}

/** Ragged ring of capstones on the back or front half of a round tower's parapet. */
function raggedRing(p: IsoPainter, r: number, z: number, half: 'back' | 'front'): void {
  const n = 11;
  const angles = [...Array(n).keys()].map((k) => ((k + 0.3) / n) * Math.PI * 2).sort((x, y) => Math.cos(x) + Math.sin(x) - (Math.cos(y) + Math.sin(y)));
  for (const t of angles) {
    if (Math.cos(t) + Math.sin(t) > 0 !== (half === 'front')) continue;
    capstone(p, 0.5 + r * Math.cos(t), 0.5 + r * Math.sin(t), z);
  }
}

/** Age 1 (Római kor): Celtiberian dry stone, a ragged crest; round flat-topped rubble towers. */
const CELTIBERIAN: WallAgeStyle = {
  readback: true,
  postBody: CELT_R,
  armStart: drumStart(CELT_R, CELT_HALF),
  postHalf: 0.33,
  postTop: CELT_ROOF,
  shadow: (p, arm) => armShadow(p, arm, 0.28 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.25 * g, 0, 5, { color: EARTH, top: shade(EARTH, 1.08), batter: 0.07 });
    prism(p, arm.a, arm.b, CELT_HALF * g, 3, CELT_CREST, { color: DRY, top: shade(DRY, 0.86), batter: 0.045, face: (w, h, l) => rubbleFace(p.ctx, w, h, l, DRY, () => p.random()) });
    for (const c of stations(arm, 0.09, 0.02)) capstone(p, c[0], c[1], CELT_CREST);
  },
  post: (p) => {
    padShadow(p, 0.38);
    drumWall(p, 0.5, 0.5, CELT_R + 0.045, 0, 14, shade(DRY, 0.86), 'stone');
    drumWall(p, 0.5, 0.5, CELT_R, 14, CELT_ROOF, DRY, 'stone');
    drumOpening(p, 0.5, 0.5, CELT_R, Math.PI / 4, 0.07, 14, 20, shade(DRY, 0.7), 'dark');
    disc(p, 0.5, 0.5, CELT_R - 0.01, CELT_ROOF, shade(EARTH, 0.9));
    ringBack(p, 0.5, 0.5, CELT_R, CELT_ROOF, 4, DRY);
    raggedRing(p, CELT_R - 0.035, CELT_ROOF, 'back');
    raggedRing(p, CELT_R - 0.035, CELT_ROOF, 'front');
  },
};

/** Ochre rammed earth of the tapial curtain, its lime-crusted wall-walk and the stone socle. */
const TAPIAL = 0xc29a68;
const BRICK = 0xae5f3c;
const WALK = 0xa47a4c;
const SOCLE = 0xa59782;
const ALFIZ = 0xd8b07a;
/** Wall-walk of the tapial curtain: the almenas stand on it. */
export const TAPIAL_WALK = 46;
const TAPIAL_HALF = 0.185;
const ALMENA = 0.19;
/** The tower's almenas: three a side on its 0.6-tile roof. */
const TOWER_ALMENA = 0.17;
/** Roof of the square tapial tower, where the banner pole stands. */
const TOWER_ROOF = 88;

/** A horseshoe light in an alfiz frame, centred at x, its sill at y (face-local). */
function horseshoeLight(ctx: Ctx, x: number, y: number, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(ALFIZ, light));
  ctx.fillRect(x - w / 2 - 2.5, y - h - 2.5, w + 5, h + 2.5);
  ctx.save();
  ctx.translate(0, y);
  archPath(ctx, x - w / 2, w, h, 'horseshoe');
  ctx.fillStyle = '#1e140e';
  ctx.fill();
  ctx.restore();
}

/** A tapial tower face: the lifts and putlog holes, a horseshoe light under the parapet. */
function towerFace(ctx: Ctx, w: number, h: number, light: number): void {
  tapialFace(ctx, w, h, light, TAPIAL);
  brickQuoins(ctx, w, h, light, BRICK);
  horseshoeLight(ctx, w / 2, -h + 22, 7, 13, light);
}

/** Age 2 (Középkor): ochre tapial on a stone socle, stepped pyramidal merlons; square tapial towers. */
const TAPIAL_CURTAIN: WallAgeStyle = {
  readback: true,
  postHalf: 0.3,
  postTop: TOWER_ROOF,
  shadow: (p, arm) => armShadow(p, arm, 0.23 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.215 * g, 0, 10, { color: SOCLE, detail: 'fieldstone', batter: 0.03 });
    prism(p, arm.a, arm.b, TAPIAL_HALF * g, 10, TAPIAL_WALK, { color: TAPIAL, top: WALK, face: (w, h, l) => tapialFace(p.ctx, w, h, l, TAPIAL) });
    for (const c of stations(arm, 0.3, 0.06)) {
      const [u, v] = frontEdge(arm, c, TAPIAL_HALF * g - ALMENA / 2);
      almena(p, u, v, TAPIAL_WALK, ALMENA, TAPIAL, shade(TAPIAL, 1.1));
    }
  },
  post: (p) => {
    padShadow(p, 0.35);
    p.box(0.18, 0.18, 0.82, 0.82, 0, 10, { color: SOCLE, detail: 'fieldstone' }, WALK);
    p.box(0.2, 0.2, 0.8, 0.8, 10, TOWER_ROOF, { color: TAPIAL }, WALK);
    p.leftFace(0.2, 0.8, 0.8, 10, (w, h) => towerFace(p.ctx, w, h, 1), TOWER_ROOF - 10);
    p.rightFace(0.2, 0.8, 0.8, 10, (w, h) => towerFace(p.ctx, w, h, R), TOWER_ROOF - 10);
    // Almenas round the roof's edge, back to front.
    const lo = 0.2 + TOWER_ALMENA / 2;
    const hi = 0.8 - TOWER_ALMENA / 2;
    const ring: UV[] = [];
    for (const t of [0, 0.5, 1]) {
      const m = lo + (hi - lo) * t;
      ring.push([m, lo], [m, hi], [lo, m], [hi, m]);
    }
    const seen = new Set<string>();
    const merlons = ring.filter(([u, v]) => (seen.has(`${u},${v}`) ? false : (seen.add(`${u},${v}`), true)));
    merlons.sort((x, y) => x[0] + x[1] - (y[0] + y[1]));
    for (const [u, v] of merlons) almena(p, u, v, TOWER_ROOF, TOWER_ALMENA, TAPIAL, shade(TAPIAL, 1.1));
  },
};

/** The Spanish wall styles by registry id (config/civs.ts wallStyle). */
export const SPANISH_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'celtiberian' | 'tapial' | 'garita_bastion'>, WallAgeStyle>> = {
  celtiberian: CELTIBERIAN,
  tapial: TAPIAL_CURTAIN,
  garita_bastion: GARITA_BASTION,
};
