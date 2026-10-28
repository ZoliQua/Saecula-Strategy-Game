import type { WallStyleId } from '../../../../config/civs';
import { FINNISH_FINNIC, FINNISH_GREYSTONE } from '../../architecture/finnish/finnishStyles';
import { coneRoof, drumOpening, drumWall } from '../../architecture/kits/drum';
import { logBox } from '../../architecture/kits/logWall';
import { turfRoof } from '../../architecture/kits/turfRoof';
import { R } from '../../architecture/facade';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { reachBody, turfFace } from '../kits/bankPalisade';
import { galleryRoof } from '../kits/armRoof';
import { armShadow, drumStart, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import type { WallAgeStyle } from '../wallKit';
import { boulderFace, footBoulders, turfCrest } from './finnishWallParts';
import { GRANITE_BASTION } from './graniteBastion';

export { BASTION_TURF_TOP } from './graniteBastion';

/*
 * Finnish walls (M5), one character per age, matched to the Finnish
 * towns: a muinaislinna — a low, rounded heap of granite rubble on a
 * hilltop, its crest grown over with turf, its gates watched from log
 * lookouts under turf roofs on boulder cairns; a curtain of big grey
 * granite boulders under a shingle cap, with round boulder towers
 * whose timber hoarding carries a low, broad shingle cone (Olavinlinna,
 * Häme); and a granite bastion trace under turf ramparts
 * (graniteBastion.ts, Suomenlinna).
 */

const F = FINNISH_FINNIC.palette;
const G = FINNISH_GREYSTONE.palette;

/** Grey granite rubble of the hill fort. */
const RUBBLE = F.stone;
const TURF = F.roof;
const SOIL = 0x4a3a27;

/** Height of the hill fort's turf crest (art px). */
export const HEAP_TOP = 26;
const HEAP_HALF = 0.38;

/** The cairn under the lookout: its top, and the half-width there. */
const CAIRN_TOP = 24;
const CAIRN_BODY = 0.3;
const HUT_Z1 = 50;
/** Rise of the lookout's turf roof: the age-1 skyline cue. */
export const HUT_TURF_RISE = 18;

/** Dark slit of a lookout, face-local. */
const slit = (p: IsoPainter, light: number) => (w: number, h: number) => {
  p.ctx.fillStyle = css(shade(0x1a130c, light));
  p.ctx.fillRect(w / 2 - 5, -h + 6, 10, 5);
};

/** Age 1 (Római kor): a low rounded heap of granite rubble, its crest grown over with turf; log lookouts under turf roofs on boulder cairns. */
const HILLFORT: WallAgeStyle = {
  readback: true,
  postHalf: 0.4,
  postBody: CAIRN_BODY,
  postTop: HUT_Z1 + HUT_TURF_RISE,
  armStart: reachBody(CAIRN_BODY),
  shadow: (p, arm) => armShadow(p, arm, 0.36 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    const face = (size: number) => (w: number, h: number, l: number) => boulderFace(p.ctx, w, h, l, RUBBLE, () => p.random(), size);
    prism(p, arm.a, arm.b, HEAP_HALF * g, 0, 9, { color: RUBBLE, top: shade(RUBBLE, 0.9), batter: 0.1, face: face(1.1) });
    prism(p, arm.a, arm.b, 0.27 * g, 9, 19, { color: RUBBLE, top: shade(RUBBLE, 0.9), batter: 0.08, face: face(0.9) });
    prism(p, arm.a, arm.b, 0.18 * g, 19, HEAP_TOP, { color: SOIL, top: TURF, batter: 0.07, face: (w, h, l) => turfFace(p.ctx, w, h + 2, l, TURF) });
    turfCrest(p, arm, 0.11 * g, HEAP_TOP, TURF);
    footBoulders(p, arm, HEAP_HALF * g, 0.2, 3.6, RUBBLE);
  },
  post: (p) => {
    padShadow(p, 0.44);
    const face = (w: number, h: number, l: number) => boulderFace(p.ctx, w, h, l, RUBBLE, () => p.random(), 1.1);
    frustum(p, 0.08, 0.08, 0.92, 0.92, 0, 14, 0.12, { color: RUBBLE, top: TURF, face });
    frustum(p, 0.2, 0.2, 0.8, 0.8, 14, CAIRN_TOP, 0.05, { color: RUBBLE, top: TURF, face });
    logBox(p, 0.31, 0.31, 0.69, 0.69, CAIRN_TOP, HUT_Z1, F.darkWood, 0.06);
    p.leftFace(0.31, 0.69, 0.69, CAIRN_TOP, slit(p, 1), HUT_Z1 - CAIRN_TOP);
    p.rightFace(0.31, 0.69, 0.69, CAIRN_TOP, slit(p, R), HUT_Z1 - CAIRN_TOP);
    turfRoof(p, 0.31, 0.31, 0.69, 0.69, HUT_Z1, HUT_TURF_RISE, 'v', { turf: TURF, gable: F.darkWood, bark: F.trim, overhang: 0.08 });
  },
};

/** Grey granite of the medieval curtain, its darker footing and the tarred shingles. */
const GRANITE = G.ashlar;
const FOOT = G.stone;
const SHINGLE = 0x6e6252;
const HOARD = G.timber;
const CURTAIN_HALF = 0.19;
/** Top of the boulder curtain, under its shingle cap. */
export const CURTAIN_WALK = 46;
const CAP_RIDGE = 57;

const TOWER_R = 0.29;
const DRUM_TOP = 70;
const HOARD_TOP = 80;
/** The tower's shingle cone: broad (overhanging the drum) and low, the age-2 skyline cue. */
export const CONE = { r: TOWER_R + 0.12, rise: 30 } as const;

/** Age 2 (Középkor): a curtain of big granite boulders under a shingle cap; round boulder towers with a timber hoarding under a low, broad shingle cone. */
const GRANITE_CURTAIN: WallAgeStyle = {
  readback: true,
  postBody: TOWER_R,
  armStart: drumStart(TOWER_R, CURTAIN_HALF),
  postHalf: 0.33,
  postTop: HOARD_TOP + CONE.rise,
  shadow: (p, arm) => armShadow(p, arm, 0.24 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.23 * g, 0, 10, { color: FOOT, top: FOOT, batter: 0.04, face: (w, h, l) => boulderFace(p.ctx, w, h, l, FOOT, () => p.random(), 1.2) });
    prism(p, arm.a, arm.b, CURTAIN_HALF * g, 10, CURTAIN_WALK, { color: GRANITE, top: shade(GRANITE, 0.9), face: (w, h, l) => boulderFace(p.ctx, w, h, l, GRANITE, () => p.random()) });
    galleryRoof(p, arm, CURTAIN_HALF * g + 0.035, CURTAIN_WALK, CAP_RIDGE, SHINGLE);
  },
  post: (p) => {
    padShadow(p, 0.38);
    drumWall(p, 0.5, 0.5, TOWER_R + 0.045, 0, 12, FOOT, 'stone');
    drumWall(p, 0.5, 0.5, TOWER_R, 12, DRUM_TOP, GRANITE, 'stone');
    for (const [phi, z] of [[Math.PI / 4, 30], [0.2, 48], [1.35, 48]] as const) drumOpening(p, 0.5, 0.5, TOWER_R, phi, 1.6, z, 9, shade(GRANITE, 0.7), 'dark');
    // The timber hoarding: a boarded ring a little proud of the drum, with loops.
    drumWall(p, 0.5, 0.5, TOWER_R + 0.035, DRUM_TOP, HOARD_TOP, HOARD, 'wattle');
    for (const phi of [0.15, Math.PI / 4, 1.42]) drumOpening(p, 0.5, 0.5, TOWER_R + 0.035, phi, 1.4, DRUM_TOP + 2, 5, HOARD, 'dark');
    const prev = p.material;
    p.material = 'shingle';
    coneRoof(p, 0.5, 0.5, CONE.r, HOARD_TOP, CONE.rise, SHINGLE, 'slate');
    p.material = prev;
  },
};

/** The Finnish wall styles by registry id (config/civs.ts wallStyle). */
export const FINNISH_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'hillfort' | 'granite_curtain' | 'granite_bastion'>, WallAgeStyle>> = {
  hillfort: HILLFORT,
  granite_curtain: GRANITE_CURTAIN,
  granite_bastion: GRANITE_BASTION,
};
