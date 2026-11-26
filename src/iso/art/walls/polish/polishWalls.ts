import type { WallStyleId } from '../../../../config/civs';
import { R } from '../../architecture/facade';
import { coneRoof, drumOpening, drumWall } from '../../architecture/kits/drum';
import { reedHip } from '../../architecture/polish/biskupinParts';
import { diaper, stringCourse } from '../../architecture/polish/krakowParts';
import { POLISH_BISKUPIN, POLISH_KRAKOW } from '../../architecture/polish/polishStyles';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { reachBody, turfFace } from '../kits/bankPalisade';
import { armShadow, drumStart, frontEdge, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import { along, stations, type WallAgeStyle } from '../wallKit';
import { breakwater, cribFace, stakeBreastwork, turretRing, type TurretRing } from './polishWallParts';
import { ZAMOSC_BASTION } from './zamoscBastion';

export { BASTION_ATTIC, BASTION_CREST_TOP, BASTION_PARAPET, RUN_ATTIC, RUN_CREST_TOP, RUN_PARAPET } from './zamoscBastion';

/*
 * Polish walls (M21), one character per age, matched to the Polish
 * towns: the Biskupin box rampart — oak cribs filled with earth, their
 * grid of logs and log ends on both faces, a plank walk behind a stake
 * breastwork, a breakwater of oblique stakes at the foot — and its
 * timber gate tower of cribbed logs under a broad, low reed-thatched
 * hip (age 1); a Kraków brick curtain with a diaper of glazed headers
 * on a white stone plinth under white-capped merlons, its round brick
 * towers crowned like the Barbican by a ring of small turrets with
 * copper needle spires round a low tile cone (age 2); and the Zamość
 * bastion trace in brick under a crested white-stone attic (zamoscBastion.ts).
 */

const B = POLISH_BISKUPIN.palette;
const K = POLISH_KRAKOW.palette;

/** Earth of the crib fill and the footing bank. */
const EARTH = B.stone;
const TURF = 0x667f38;
const OAK = B.darkWood;
const TIMBER = B.timber;

/** Top of the box rampart's footing bank and of its crib wall (art px). */
const BANK_TOP = 6;
export const CRIB_TOP = 32;
const CRIB_HALF = 0.2;
/** The gate tower: cribbed shaft, then the low thatched hip over it. */
const GATE: readonly [number, number, number, number] = [0.22, 0.22, 0.78, 0.78];
const GATE_EAVE = 64;
/** Rise of the gate tower's reed hip: broad and low (the age-1 skyline cue, unlike the steep Russian gables). */
export const HIP_RISE = 22;
const GATE_TOP = GATE_EAVE + HIP_RISE * POLISH_BISKUPIN.roof.pitch;

/** Dark loophole of the gate tower, face-local. */
const gateFace = (p: IsoPainter, light: number) => (w: number, h: number) => {
  cribFace(p.ctx, w, h, light, OAK, TIMBER, EARTH);
  p.ctx.fillStyle = css(shade(0x1a130c, light));
  p.ctx.fillRect(w / 2 - 4, -h + 7, 8, 6);
  p.ctx.fillRect(w / 2 - 3, -h * 0.45, 6, 5);
};

/** Age 1 (Római kor): the Biskupin box rampart of earth-filled oak cribs; a cribbed gate tower under a broad reed hip. */
const BOX_RAMPART: WallAgeStyle = {
  readback: true,
  postHalf: 0.36,
  postBody: 0.28,
  postTop: GATE_TOP,
  armStart: reachBody(0.28),
  shadow: (p, arm) => armShadow(p, arm, 0.3 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.3 * g, 0, BANK_TOP, { color: EARTH, top: TURF, batter: 0.12, face: (w, h, l) => turfFace(p.ctx, w, h, l, TURF) });
    breakwater(p, arm, 0.3 * g, OAK);
    const half = CRIB_HALF * g;
    prism(p, arm.a, arm.b, half, BANK_TOP, CRIB_TOP, { color: OAK, top: shade(B.planks, 1.08), face: (w, h, l) => cribFace(p.ctx, w, h, l, OAK, TIMBER, EARTH) });
    stakeBreastwork(p, arm, half - 0.01, CRIB_TOP, 11, OAK);
  },
  post: (p) => {
    padShadow(p, 0.42);
    frustum(p, 0.12, 0.12, 0.88, 0.88, 0, BANK_TOP, 0.06, { color: EARTH, top: TURF, face: (w, h, l) => turfFace(p.ctx, w, h, l, TURF) });
    p.box(GATE[0], GATE[1], GATE[2], GATE[3], BANK_TOP, GATE_EAVE, { color: OAK }, shade(B.planks, 0.9));
    p.leftFace(GATE[0], GATE[2], GATE[3], BANK_TOP, gateFace(p, 1), GATE_EAVE - BANK_TOP);
    p.rightFace(GATE[1], GATE[3], GATE[2], BANK_TOP, gateFace(p, R), GATE_EAVE - BANK_TOP);
    const prev = p.material;
    reedHip(p, POLISH_BISKUPIN, [GATE[0] - 0.04, GATE[1] - 0.04, GATE[2] + 0.04, GATE[3] + 0.04], GATE_EAVE, HIP_RISE, 0.1);
    p.material = prev;
  },
};

const BRICK = K.brick;
const STONE = K.ashlar;
const TRIM = K.trim;
/** Wall-walk of the brick curtain: the merlons stand on it. */
export const CURTAIN_WALK = 48;
const CURTAIN_HALF = 0.18;
const MERLON_H = 11;
const TOWER_R = 0.3;
const DRUM_TOP = 74;
/** The corbelled crown ring, the low tile cone inside it and the ring of spired turrets (the age-2 skyline cue). */
const CROWN_TOP = DRUM_TOP + 8;
export const TURRETS: TurretRing = { at: TOWER_R - 0.03, r: 0.055, count: 7, z0: CROWN_TOP, z1: CROWN_TOP + 12, spire: 22, brick: BRICK, copper: K.metal };
const BARBICAN_TOP = TURRETS.z1 + TURRETS.spire;

/** Brick curtain face: the diaper of dark glazed headers, a white string course, slits at intervals. */
const curtainFace = (p: IsoPainter) => (w: number, h: number, light: number) => {
  diaper(p.ctx, w, h, BRICK, light);
  stringCourse(p.ctx, w, -h + 4, TRIM, light);
  for (let x = 20; x < w - 8; x += 40) {
    p.ctx.fillStyle = css(shade(TRIM, light));
    p.ctx.fillRect(x - 3, -h * 0.55 - 12, 6, 13);
    p.ctx.fillStyle = '#1b130e';
    p.ctx.fillRect(x - 1, -h * 0.55 - 10, 2, 9);
  }
};

/** Age 2 (Középkor): Kraków brick curtain on a white plinth, white-capped merlons; round brick towers crowned by a ring of spired turrets. */
const BARBICAN_CURTAIN: WallAgeStyle = {
  readback: true,
  postHalf: 0.33,
  postBody: TOWER_R,
  postTop: BARBICAN_TOP,
  armStart: drumStart(TOWER_R, CURTAIN_HALF),
  shadow: (p, arm) => armShadow(p, arm, 0.22 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    const half = CURTAIN_HALF * g;
    prism(p, arm.a, arm.b, half + 0.02, 0, 10, { color: STONE, detail: 'stone', batter: 0.02 });
    prism(p, arm.a, arm.b, half, 10, CURTAIN_WALK, { color: BRICK, top: shade(BRICK, 0.72), face: curtainFace(p) });
    for (const c of stations(arm, 0.2, 0.05)) {
      const [a, b] = along(arm, frontEdge(arm, c, half - 0.045), 0.065);
      prism(p, a, b, 0.045 * g, CURTAIN_WALK, CURTAIN_WALK + MERLON_H, { color: BRICK, detail: 'brick', top: TRIM });
    }
  },
  post: (p) => {
    padShadow(p, 0.38);
    drumWall(p, 0.5, 0.5, TOWER_R + 0.03, 0, 12, STONE, 'stone');
    drumWall(p, 0.5, 0.5, TOWER_R, 12, DRUM_TOP, BRICK, 'brick');
    drumWall(p, 0.5, 0.5, TOWER_R + 0.005, 40, 43, TRIM, 'ashlar');
    for (const [phi, z] of [[Math.PI / 4, 24], [0.25, 52], [1.3, 52]] as const) drumOpening(p, 0.5, 0.5, TOWER_R, phi, 1.5, z, 10, TRIM, 'dark');
    drumWall(p, 0.5, 0.5, TOWER_R + 0.03, DRUM_TOP, CROWN_TOP, BRICK, 'brick');
    drumWall(p, 0.5, 0.5, TOWER_R + 0.035, CROWN_TOP - 2, CROWN_TOP, TRIM, 'ashlar');
    turretRing(p, TURRETS, 'back');
    const prev = p.material;
    p.material = 'tile';
    coneRoof(p, 0.5, 0.5, TOWER_R - 0.06, CROWN_TOP, 18, K.roof, 'slate');
    p.material = prev;
    turretRing(p, TURRETS, 'front');
  },
};

/** The Polish wall styles by registry id (config/civs.ts wallStyle). */
export const POLISH_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'box_rampart' | 'barbican_curtain' | 'zamosc_bastion'>, WallAgeStyle>> = {
  box_rampart: BOX_RAMPART,
  barbican_curtain: BARBICAN_CURTAIN,
  zamosc_bastion: ZAMOSC_BASTION,
};
