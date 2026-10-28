import type { WallStyleId } from '../../../../config/civs';
import { oblam, plankGable, type Block } from '../../architecture/russian/izbaParts';
import { RUSSIAN_GORD, RUSSIAN_MUSCOVY } from '../../architecture/russian/russianStyles';
import { logBox } from '../../architecture/kits/logWall';
import { octPrism, tentRoof } from '../../architecture/kits/tentRoof';
import type { IsoPainter } from '../../isoPainter';
import { R } from '../../architecture/facade';
import { post } from '../../architecture/parts';
import { shade } from '../../palette';
import { reachBody, turfFace } from '../kits/bankPalisade';
import { facesViewer, galleryRoof } from '../kits/armRoof';
import { armShadow, frontEdge, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import { stations, type WallAgeStyle } from '../wallKit';
import { KREMLIN, KREMLIN_TENT } from './kremlinWall';
import { clampPost, logEndColumn, loopholes } from './russianWallParts';

export { KREMLIN_WALK } from './kremlinWall';

/*
 * Russian walls (M5), one character per age, matched to the Russian
 * towers: a gorod of horizontal pine logs held between split clamp
 * posts on the crest of an earth rampart, its log blockhouses under an
 * overhanging gallery (oblam) and a steep carved plank gable; a gorodnya — a
 * wall of log cribs, their stacked log ends marking each crib, a plank
 * roof over the fighting gallery — with log towers whose octagon
 * carries a tall shingled tent (shatyor); and a whitewashed brick
 * kremlin with forked merlons and green tented towers (kremlinWall.ts).
 */

const G = RUSSIAN_GORD.palette;
const M = RUSSIAN_MUSCOVY.palette;

const EARTH = 0x6f5b3e;
const TURF = 0x667f38;
/** Weathered pine of the logs. */
const PINE = G.darkWood;
/** Height of the earth rampart under the age-1 log wall (art px). */
export const RAMPART_TOP = 18;
const LOG_TOP = 46;

/** Tent heights of the tower tops by age (the age-2 and age-3 skyline cue). */
export const TENT_RISE = { 2: 64, 3: KREMLIN_TENT } as const;

/** Face of a log blockhouse: two loopholes, one above the other. */
const blockhouseFace = (p: IsoPainter, light: number) => (w: number, h: number) => {
  loopholes(p.ctx, w, -h * 0.35, 9, w, light);
  loopholes(p.ctx, w, -h + 8, 8, w, light);
};

const BH: Block = [0.24, 0.24, 0.76, 0.76];
const BH_GALLERY = 60;
const BH_EAVE = BH_GALLERY + 12;
/** Rise of the blockhouse's steep plank gable. */
const BH_RISE = 42;

/** Age 1 (Római kor): horizontal pine logs between clamp posts on an earth rampart; log blockhouses under a steep plank gable. */
const RUS_PALISADE: WallAgeStyle = {
  readback: true,
  postHalf: 0.37,
  postBody: 0.27,
  postTop: BH_EAVE + BH_RISE,
  armStart: reachBody(0.27),
  shadow: (p, arm) => armShadow(p, arm, 0.3 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.33 * g, 0, RAMPART_TOP, { color: EARTH, top: TURF, batter: 0.2, face: (w, h, l) => turfFace(p.ctx, w, h, l, TURF) });
    const half = 0.075 * g;
    prism(p, arm.a, arm.b, half, RAMPART_TOP, LOG_TOP, { color: PINE, detail: 'logs', top: shade(PINE, 0.8) });
    // A plank coping over the top log.
    prism(p, arm.a, arm.b, half + 0.015, LOG_TOP, LOG_TOP + 3, { color: shade(G.planks, 0.9), top: shade(G.planks, 1.05) });
    if (facesViewer(arm)) {
      for (const c of stations(arm, 0.34, 0.04)) clampPost(p, frontEdge(arm, c, half + 0.012), RAMPART_TOP - 2, LOG_TOP + 7, G.timber);
    }
  },
  post: (p) => {
    padShadow(p, 0.38);
    frustum(p, 0.13, 0.13, 0.87, 0.87, 0, RAMPART_TOP, 0.1, { color: EARTH, top: TURF, face: (w, h, l) => turfFace(p.ctx, w, h, l, TURF) });
    logBox(p, BH[0], BH[1], BH[2], BH[3], RAMPART_TOP, BH_GALLERY, PINE, 0.07);
    p.leftFace(BH[0], BH[2], BH[3], RAMPART_TOP, blockhouseFace(p, 1), BH_GALLERY - RAMPART_TOP);
    p.rightFace(BH[1], BH[3], BH[2], RAMPART_TOP, blockhouseFace(p, R), BH_GALLERY - RAMPART_TOP);
    const g = oblam(p, RUSSIAN_GORD, BH, BH_GALLERY, 12, 0.06);
    // The age-1 cue of the Russian buildings: a steep plank gable, its end carved.
    plankGable(p, RUSSIAN_GORD, g, BH_EAVE, BH_RISE, 'v', { window: false });
  },
};

const CRIB = 0x7c5b39;
const GALLERY_Z = 52;
const GALLERY_EAVE = 62;
/** Ridge of the plank roof over the gorodnya's fighting gallery. */
export const GALLERY_RIDGE = 76;
/** Silver-grey aspen shingle of the timber tents. */
const ASPEN = 0x8a857a;

const SHAFT: Block = [0.2, 0.2, 0.8, 0.8];
const SHAFT_TOP = 70;
/** The tower's storeys above the shaft: the oblam gallery, the low shoulders, the log octagon, the open lookout. */
const OBLAM_H = 12;
const OCT_Z0 = SHAFT_TOP + OBLAM_H + 4;
const OCT_Z1 = OCT_Z0 + 16;
/** The open lookout (smotrovaya vyshka): four posts with sky between them, under the tent. */
const TENT_Z = OCT_Z1 + 30;
const OCT_R = 0.25;
/** Lookout posts, back to front (the front post is painted last). */
const LOOKOUT_POSTS = [[0.33, 0.33], [0.67, 0.33], [0.33, 0.67], [0.67, 0.67]] as const;

/** Small dark knob on the tent's apex, under the banner pole. */
function apexKnob(p: IsoPainter, z: number): void {
  const [x, y] = p.p(0.5, 0.5, z);
  p.ctx.fillStyle = '#3a2c1e';
  p.ctx.beginPath();
  p.ctx.arc(x, y - 1.5, 2.6, 0, Math.PI * 2);
  p.ctx.fill();
}

/** Age 2 (Középkor): log cribs with a roofed fighting gallery; log towers, an octagon and a tall shingled tent. */
const GORODNYA: WallAgeStyle = {
  readback: true,
  postHalf: 0.3,
  postTop: TENT_Z + TENT_RISE[2],
  shadow: (p, arm) => armShadow(p, arm, 0.26 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.27 * g, 0, 8, { color: EARTH, top: TURF, batter: 0.08 });
    const half = 0.17 * g;
    prism(p, arm.a, arm.b, half, 8, GALLERY_Z, { color: CRIB, detail: 'logs', top: shade(CRIB, 0.7), face: (w, _h, l) => loopholes(p.ctx, w, -12, 8, 26, l) });
    if (facesViewer(arm)) {
      for (const c of stations(arm, 0.5, 0.03)) logEndColumn(p, frontEdge(arm, c, half), 8, GALLERY_Z, CRIB);
    }
    // The fighting gallery overhangs the cribs a little, under its plank roof.
    prism(p, arm.a, arm.b, half + 0.03, GALLERY_Z, GALLERY_EAVE, { color: M.timber, detail: 'planks', top: M.timber, face: (w, _h, l) => loopholes(p.ctx, w, -2, 6, 13, l) });
    galleryRoof(p, arm, half + 0.07, GALLERY_EAVE, GALLERY_RIDGE, G.roof);
  },
  post: (p) => {
    padShadow(p, 0.34);
    p.box(0.16, 0.16, 0.84, 0.84, 0, 8, { color: EARTH }, TURF);
    logBox(p, SHAFT[0], SHAFT[1], SHAFT[2], SHAFT[3], 8, SHAFT_TOP, CRIB, 0.07);
    p.leftFace(SHAFT[0], SHAFT[2], SHAFT[3], 8, blockhouseFace(p, 1), SHAFT_TOP - 8);
    p.rightFace(SHAFT[1], SHAFT[3], SHAFT[2], 8, blockhouseFace(p, R), SHAFT_TOP - 8);
    const g = oblam(p, RUSSIAN_MUSCOVY, SHAFT, SHAFT_TOP, OBLAM_H, 0.06);
    const z = SHAFT_TOP + OBLAM_H;
    const prev = p.material;
    p.material = 'shingle';
    p.hipRoof(g[0], g[1], g[2], g[3], z, 10, ASPEN, 0.03);
    p.material = prev;
    octPrism(p, 0.5, 0.5, OCT_R, OCT_Z0, OCT_Z1, CRIB, 'logs', (w, _h, light) => loopholes(p.ctx, w, -3, 7, w, light));
    // The lookout's plank deck on the octagon, then its posts: the sky shows between them.
    p.ground(0.3, 0.3, 0.7, 0.7, shade(M.timber, 0.8), OCT_Z1);
    for (const [u, v] of LOOKOUT_POSTS) post(p, u, v, OCT_Z1, TENT_Z + 2, 2.2, M.timber);
    const apex = tentRoof(p, 0.5, 0.5, OCT_R, TENT_Z, TENT_RISE[2], ASPEN, { material: 'shingle', eave: 0.05, ribs: shade(ASPEN, 0.7) });
    apexKnob(p, apex);
  },
};

/** The Russian wall styles by registry id (config/civs.ts wallStyle). */
export const RUSSIAN_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'rus_palisade' | 'gorodnya' | 'kremlin'>, WallAgeStyle>> = {
  rus_palisade: RUS_PALISADE,
  gorodnya: GORODNYA,
  kremlin: KREMLIN,
};
