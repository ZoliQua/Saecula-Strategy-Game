import type { WallStyleId } from '../../../../config/civs';
import { ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR, NORMAN_RAGSTONE } from '../../architecture/english/englishStyles';
import type { Ctx } from '../../canvas';
import { css, shade } from '../../palette';
import { bankPalisadeArm, bankPalisadeShadow, reachBody, turfFace } from '../kits/bankPalisade';
import { starFortWall } from '../kits/starFort';
import { armShadow, frustum, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import { along, stations, type WallAgeStyle } from '../wallKit';
import { crossLoop } from './englishWallParts';

/*
 * English walls (M4 design decision 4), one character per age, matched
 * to the English towers and palettes: a split-oak palisade on a turfed
 * earth bank with thatched timber watch-posts (Romano-British), a grey
 * ashlar curtain with square merlons, cross-slit loops and square
 * Norman towers with clasping buttresses (Norman), and a low star-fort
 * trace (Georgian): a turf glacis, a battered plum-brick scarp, a grey
 * stone cordon and an embrasured brick parapet, with quoined bastions
 * carrying a stone guérite and a gun.
 */

const RB = ENGLISH_ROMANO_BRITISH.palette;
const TU = ENGLISH_TUDOR.palette;

const BANK = 0x6b573b;
const TURF = 0x5f7e36;
const OAK = 0x76593d;

/** Age 1 (Római kor): split-oak palisade on a turfed earth bank; thatched timber watch-posts on mounds. */
const BANK_PALISADE: WallAgeStyle = {
  readback: true,
  postBody: 0.22,
  armStart: reachBody(0.22),
  postHalf: 0.3,
  postTop: 100,
  shadow: bankPalisadeShadow,
  arm: (p, arm) => bankPalisadeArm(p, arm, { bank: BANK, turf: TURF, timber: OAK }),
  post: (p) => {
    padShadow(p, 0.34);
    frustum(p, 0.1, 0.1, 0.9, 0.9, 0, 14, 0.12, { color: BANK, top: TURF, face: (w, h, l) => turfFace(p.ctx, w, h, l, TURF) });
    p.box(0.28, 0.28, 0.72, 0.72, 13, 60, { color: OAK, detail: 'planks' });
    // Plank breastwork, a dark lookout gap under the eaves.
    p.box(0.25, 0.25, 0.75, 0.75, 56, 68, { color: shade(OAK, 1.08), detail: 'planks' });
    const gap = (w: number) => {
      p.ctx.fillStyle = '#1b130b';
      p.ctx.fillRect(4, -10, w - 8, 3);
    };
    const corners = (w: number, h: number) => {
      p.ctx.fillStyle = css(shade(RB.timber, 0.8));
      p.ctx.fillRect(0, -h, 4, h);
      p.ctx.fillRect(w - 4, -h, 4, h);
      p.ctx.fillRect(0, -h * 0.55, w, 2.5);
    };
    p.leftFace(0.28, 0.72, 0.72, 13, corners, 47);
    p.rightFace(0.28, 0.72, 0.72, 13, corners, 47);
    p.leftFace(0.25, 0.75, 0.75, 56, gap, 12);
    p.rightFace(0.25, 0.75, 0.75, 56, gap, 12);
    p.material = 'thatch';
    p.hipRoof(0.25, 0.25, 0.75, 0.75, 68, 32, RB.thatch, 0.08);
  },
};

/** Cool grey Kentish ragstone ashlar, shared with the Norman tower (the Hungarian curtain is a warm limestone). */
const ASHLAR = NORMAN_RAGSTONE;
const RUBBLE = TU.stone;
const WALK = shade(ASHLAR, 0.82);

/** Wall face: weathering at the foot, cross-slit loops at intervals. */
function curtainFace(ctx: Ctx, w: number, h: number, light: number): void {
  const g = ctx.createLinearGradient(0, -12, 0, 0);
  g.addColorStop(0, 'rgba(60,72,40,0)');
  g.addColorStop(1, 'rgba(60,72,40,.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, -12, w, 12);
  for (let x = 22; x < w - 10; x += 44) crossLoop(ctx, x, -h + 26, 16, light);
}

/** Age 2 (Középkor): grey ashlar curtain, battered plinth, string course, square merlons; square Norman towers. */
const NORMAN_CURTAIN: WallAgeStyle = {
  readback: true,
  postBody: 0.33,
  armStart: reachBody(0.33),
  postHalf: 0.34,
  postTop: 108,
  shadow: (p, arm) => armShadow(p, arm, 0.22 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.235 * g, 0, 16, { color: RUBBLE, detail: 'fieldstone', batter: 0.055 });
    prism(p, arm.a, arm.b, 0.18 * g, 16, 58, { color: ASHLAR, detail: 'stone', top: WALK, face: (w, h, l) => curtainFace(p.ctx, w, h, l) });
    // Projecting string course under the parapet, then the merlons.
    prism(p, arm.a, arm.b, 0.2 * g, 55, 58.5, { color: shade(ASHLAR, 1.06), top: WALK });
    for (const c of stations(arm, 0.2, 0.04)) {
      const [m0, m1] = along(arm, c, 0.06);
      prism(p, m0, m1, 0.18 * g, 58.5, 71, { color: ASHLAR, top: shade(ASHLAR, 1.06) });
    }
  },
  post: (p) => {
    padShadow(p, 0.36);
    frustum(p, 0.12, 0.12, 0.88, 0.88, 0, 16, 0.05, { color: RUBBLE, detail: 'fieldstone', top: WALK });
    p.box(0.17, 0.17, 0.83, 0.83, 16, 92, { color: ASHLAR, detail: 'stone' });
    const face = (w: number) => {
      const ctx = p.ctx;
      crossLoop(ctx, w / 2, -18, 16, 1);
      // Paired round-headed belfry lights.
      for (const dx of [-5, 5]) {
        ctx.fillStyle = '#17120e';
        ctx.beginPath();
        ctx.moveTo(w / 2 + dx - 2.5, -54);
        ctx.lineTo(w / 2 + dx - 2.5, -64);
        ctx.arc(w / 2 + dx, -64, 2.5, Math.PI, 0);
        ctx.lineTo(w / 2 + dx + 2.5, -54);
        ctx.fill();
      }
    };
    p.leftFace(0.17, 0.83, 0.83, 16, face, 76);
    p.rightFace(0.17, 0.83, 0.83, 16, face, 76);
    // Clasping buttresses on the three visible corners, string course wrapped round them.
    const strip = { color: shade(ASHLAR, 1.04), detail: 'stone' } as const;
    p.box(0.14, 0.73, 0.27, 0.86, 16, 84, strip);
    p.box(0.73, 0.14, 0.86, 0.27, 16, 84, strip);
    p.box(0.73, 0.73, 0.86, 0.86, 16, 84, strip);
    p.box(0.15, 0.15, 0.85, 0.85, 66, 69, { color: shade(ASHLAR, 1.08) }, WALK);
    // Corbel table, parapet and square merlons.
    p.box(0.15, 0.15, 0.85, 0.85, 88, 96, { color: shade(ASHLAR, 1.02) }, WALK);
    const corbels = (w: number) => {
      p.ctx.fillStyle = 'rgba(25,20,15,.5)';
      for (let x = 3; x < w - 2; x += 7) p.ctx.fillRect(x, -3, 3.5, 3);
    };
    p.leftFace(0.15, 0.85, 0.85, 88, corbels, 8);
    p.rightFace(0.15, 0.85, 0.85, 88, corbels, 8);
    const m = 0.16;
    for (const [u, v] of [[0.15, 0.15], [0.5 - m / 2, 0.15], [0.85 - m, 0.15], [0.15, 0.5 - m / 2], [0.85 - m, 0.5 - m / 2], [0.15, 0.85 - m], [0.5 - m / 2, 0.85 - m], [0.85 - m, 0.85 - m]] as const) {
      p.box(u, v, u + m, v + m, 96, 108, { color: ASHLAR }, shade(ASHLAR, 1.06));
    }
  },
};

/**
 * Georgian fortification brick: a dark plum stock brick, well apart from
 * the bright red Hungarian brick, with grey ragstone dressings instead of
 * pale limestone, so the age-3 runs read English from afar.
 */
const BRICK = 0x733832;
const DRESSING = shade(NORMAN_RAGSTONE, 0.94);
/** Darker than the dressings, so the wall-walk does not read as a pale paved strip from afar. */
const COPING = shade(NORMAN_RAGSTONE, 0.68);
/** The sloped turf glacis in front of the scarp (the Hungarian runs carry their green on top). */
const GLACIS = 0x5a7a33;
const GLACIS_TOP = 0x6f9440;

/**
 * Age 3 (Felvilágosodás): a low star-fort trace (kits/starFort.ts) in
 * plum brick with grey ragstone dressings and lead-capped guérites.
 */
const STAR_FORT: WallAgeStyle = starFortWall({
  scarp: BRICK,
  scarpDetail: 'brick',
  dressing: DRESSING,
  coping: COPING,
  glacis: GLACIS,
  glacisTop: GLACIS_TOP,
  sentryRoof: 0x4c5359,
});

/** The English wall styles by registry id (config/civs.ts wallStyle). */
export const ENGLISH_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'bank_palisade' | 'norman_curtain' | 'star_fort'>, WallAgeStyle>> = {
  bank_palisade: BANK_PALISADE,
  norman_curtain: NORMAN_CURTAIN,
  star_fort: STAR_FORT,
};
