import type { WallStyleId } from '../../../../config/civs';
import { R } from '../../architecture/facade';
import { coneRoof, drumOpening, drumWall } from '../../architecture/kits/drum';
import { alem } from '../../architecture/kits/leadDome';
import { bandedFace, roundPath } from '../../architecture/ottoman/ottomanParts';
import { OTTOMAN_BYZANTINE, OTTOMAN_OSMANLI, OTTOMAN_SELJUK } from '../../architecture/ottoman/ottomanStyles';
import type { Ctx } from '../../canvas';
import { css, shade } from '../../palette';
import { reachBody } from '../kits/bankPalisade';
import { armShadow, drumStart, frontEdge, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import { OTTOMAN_BASTION } from './ottomanBastion';
import { along, stations, type WallAgeStyle } from '../wallKit';

/*
 * Ottoman walls (M21), one character per age, matched to the Ottoman
 * towns: the Theodosian land wall of Constantinople — a curtain of opus
 * mixtum, red brick bands laced through pale limestone, under square
 * merlons, its square towers banded the same, with round-headed
 * windows in brick voussoirs and a crenellated top (age 1); the
 * Rumelihisarı curtain of grey rubble stone, its big round towers
 * under tall lead cones carrying a gilt crescent finial (age 2); and a
 * bastion trace in pale cut limestone, the star-fort kit in ashlar, its
 * corner bastions crowned by domed köşks (ottomanBastion.ts, age 3).
 */

const BYZ = OTTOMAN_BYZANTINE;
const B = BYZ.palette;

/** Wall-walk of the banded curtain; the merlons stand on it. */
export const MIXTUM_WALK = 46;
const MIXTUM_HALF = 0.19;
const MIXTUM_MERLON = 10;
/** The square tower: body, then the crenellated parapet over it. */
const TOWER: readonly [number, number, number, number] = [0.16, 0.16, 0.84, 0.84];
const TOWER_BODY = 0.34;
/** Top of the banded tower shaft (art px). */
export const MIXTUM_TOWER = 88;
const TOWER_PARAPET = 8;
const TOWER_MERLON = 10;
const MIXTUM_TOP = MIXTUM_TOWER + TOWER_PARAPET + TOWER_MERLON;

/** Banded face, then a round-headed window or two in brick voussoirs. */
function towerFace(ctx: Ctx, w: number, h: number, light: number): void {
  bandedFace(ctx, BYZ, w, h, light);
  for (const [x, y, ww, hh] of [[w / 2 - 5, -h + 30, 10, 16], [w / 2 - 3, -h * 0.42, 6, 10]] as const) {
    ctx.fillStyle = css(shade(B.brick, light * 0.95));
    roundPath(ctx, x - 2, y + 1, ww + 4, hh + 3);
    ctx.fill();
    ctx.fillStyle = css(shade(0x1a120c, light));
    roundPath(ctx, x, y, ww, hh);
    ctx.fill();
  }
}

/** Age 1 (Római kor): Theodosian opus mixtum curtain under square merlons; square banded towers, crenellated. */
const OPUS_MIXTUM: WallAgeStyle = {
  readback: true,
  postHalf: 0.36,
  postBody: TOWER_BODY,
  postTop: MIXTUM_TOP,
  armStart: reachBody(TOWER_BODY),
  shadow: (p, arm) => armShadow(p, arm, 0.24 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    const half = MIXTUM_HALF * g;
    prism(p, arm.a, arm.b, half + 0.03, 0, 8, { color: B.stone, detail: 'stone', batter: 0.03 });
    prism(p, arm.a, arm.b, half, 8, MIXTUM_WALK, { color: B.brick, top: shade(B.stone, 0.8), face: (w, h, l) => bandedFace(p.ctx, BYZ, w, h, l) });
    for (const c of stations(arm, 0.2, 0.05)) {
      const [a, b] = along(arm, frontEdge(arm, c, half - 0.05), 0.06);
      prism(p, a, b, 0.05 * g, MIXTUM_WALK, MIXTUM_WALK + MIXTUM_MERLON, { color: B.stone, top: B.trim, face: (w, h, l) => bandedFace(p.ctx, BYZ, w, h, l) });
    }
  },
  post: (p) => {
    padShadow(p, 0.4);
    const [u0, v0, u1, v1] = TOWER;
    frustum(p, u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 8, 0.03, { color: B.stone, detail: 'stone', top: shade(B.stone, 0.85) });
    p.box(u0, v0, u1, v1, 8, MIXTUM_TOWER, { color: B.brick }, shade(B.stone, 0.8));
    p.leftFace(u0, u1, v1, 8, (w, h) => towerFace(p.ctx, w, h, 1), MIXTUM_TOWER - 8);
    p.rightFace(v0, v1, u1, 8, (w, h) => towerFace(p.ctx, w, h, R), MIXTUM_TOWER - 8);
    // Parapet slightly corbelled out, then eight square merlons round it.
    const o = 0.02;
    p.box(u0 - o, v0 - o, u1 + o, v1 + o, MIXTUM_TOWER, MIXTUM_TOWER + TOWER_PARAPET, { color: B.stone }, shade(B.stone, 0.78));
    p.leftFace(u0 - o, u1 + o, v1 + o, MIXTUM_TOWER, (w, h) => bandedFace(p.ctx, BYZ, w, h, 1), TOWER_PARAPET);
    p.rightFace(v0 - o, v1 + o, u1 + o, MIXTUM_TOWER, (w, h) => bandedFace(p.ctx, BYZ, w, h, R), TOWER_PARAPET);
    const m = 0.15;
    const lo = u0 - o;
    const hi = u1 + o - m;
    const mid = 0.5 - m / 2;
    for (const [u, v] of [[lo, lo], [mid, lo], [hi, lo], [lo, mid], [hi, mid], [lo, hi], [mid, hi], [hi, hi]] as const) {
      p.box(u, v, u + m, v + m, MIXTUM_TOWER + TOWER_PARAPET, MIXTUM_TOP, { color: B.stone }, B.trim);
    }
  },
};

const S = OTTOMAN_SELJUK.palette;
/** Grey rubble of the Rumelihisarı curtain and towers, with dressed limestone courses. */
const RUBBLE = 0x9e988a;
const DRESSED = S.ashlar;
/** Lead of the tower cones (the Osmanlı domes' lead). */
const LEAD = OTTOMAN_OSMANLI.palette.metal;
export const RUMELI_WALK = 50;
const RUMELI_HALF = 0.19;
const RUMELI_MERLON = 10;
/** The big round tower: drum radius, its corbelled top, the lead cone (the age-2 skyline cue). */
export const RUMELI_R = 0.34;
const RUMELI_DRUM = 80;
const RUMELI_CROWN = RUMELI_DRUM + 6;
export const RUMELI_CONE = 40;
const RUMELI_APEX = RUMELI_CROWN + RUMELI_CONE;

/** Curtain face: courses of dressed stone every so often, and arrow slits. */
function rumeliFace(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(DRESSED, light * 0.95), 0.85);
  for (let y = 12; y < h - 4; y += 14) ctx.fillRect(0, -y - 1.6, w, 1.6);
  for (let x = 18; x < w - 8; x += 36) {
    ctx.fillStyle = css(shade(DRESSED, light));
    ctx.fillRect(x - 3, -h * 0.5 - 12, 6, 13);
    ctx.fillStyle = '#18130f';
    ctx.fillRect(x - 1, -h * 0.5 - 10, 2, 9);
  }
}

/** Age 2 (Középkor): Rumelihisarı — grey rubble curtain; big round towers under tall lead cones with a crescent finial. */
const RUMELI: WallAgeStyle = {
  readback: true,
  postHalf: 0.37,
  postBody: RUMELI_R,
  postTop: RUMELI_APEX,
  armStart: drumStart(RUMELI_R, RUMELI_HALF),
  shadow: (p, arm) => armShadow(p, arm, 0.23 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    const half = RUMELI_HALF * g;
    prism(p, arm.a, arm.b, half + 0.03, 0, 10, { color: shade(RUBBLE, 0.9), detail: 'fieldstone', batter: 0.04 });
    prism(p, arm.a, arm.b, half, 10, RUMELI_WALK, { color: RUBBLE, detail: 'fieldstone', top: shade(RUBBLE, 0.78), face: (w, h, l) => rumeliFace(p.ctx, w, h, l) });
    for (const c of stations(arm, 0.18, 0.05)) {
      const [a, b] = along(arm, frontEdge(arm, c, half - 0.045), 0.055);
      prism(p, a, b, 0.045 * g, RUMELI_WALK, RUMELI_WALK + RUMELI_MERLON, { color: RUBBLE, detail: 'fieldstone', top: DRESSED });
    }
  },
  post: (p) => {
    padShadow(p, 0.42);
    drumWall(p, 0.5, 0.5, RUMELI_R + 0.03, 0, 12, shade(RUBBLE, 0.9), 'stone');
    drumWall(p, 0.5, 0.5, RUMELI_R, 12, RUMELI_DRUM, RUBBLE, 'stone');
    for (const z of [32, 56]) drumWall(p, 0.5, 0.5, RUMELI_R + 0.004, z, z + 2.5, DRESSED, 'ashlar');
    for (const [phi, z] of [[Math.PI / 4, 20], [0.3, 42], [1.25, 42], [Math.PI / 4, 64]] as const) drumOpening(p, 0.5, 0.5, RUMELI_R, phi, 1.4, z, 9, DRESSED, 'dark');
    // A corbelled crown, then the tall lead cone over the whole drum.
    drumWall(p, 0.5, 0.5, RUMELI_R + 0.025, RUMELI_DRUM, RUMELI_CROWN, DRESSED, 'ashlar');
    const prev = p.material;
    p.material = 'slate';
    coneRoof(p, 0.5, 0.5, RUMELI_R + 0.05, RUMELI_CROWN, RUMELI_CONE, LEAD, 'slate');
    p.material = prev;
    alem(p, 0.5, 0.5, RUMELI_APEX - 1, 10);
  },
};

/** The Ottoman wall styles by registry id (config/civs.ts wallStyle). */
export const OTTOMAN_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'opus_mixtum' | 'rumeli' | 'ottoman_bastion'>, WallAgeStyle>> = {
  opus_mixtum: OPUS_MIXTUM,
  rumeli: RUMELI,
  ottoman_bastion: OTTOMAN_BASTION,
};

export { BASTION_PARAPET } from './ottomanBastion';
