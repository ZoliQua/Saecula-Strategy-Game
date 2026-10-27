import type { WallStyleId } from '../../../../config/civs';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR, NORMAN_RAGSTONE } from '../../architecture/english/englishStyles';
import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { prism, type UV } from '../prism';
import { along, stations, type Arm, type WallAgeStyle } from '../wallKit';
import { armShadow, crossLoop, frustum, line, padShadow, plank } from './englishWallParts';

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

const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

/**
 * English posts recede above their footprint (mounds, battered plinths,
 * sloping scarps), so arms reach to the post's body: behind arms start
 * at the centre (the post, painted after them, covers the overlap) and
 * front arms at the body's face (its corner on diagonals).
 */
function reachBody(body: number): (diagonal: boolean, behind: boolean) => number {
  return (diagonal, behind) => (behind ? 0 : body * (diagonal ? Math.SQRT2 : 1));
}

/** Offset of a station across an arm's line (tiles, + = the arm's left). */
function across(arm: Arm, c: UV, off: number): UV {
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]) || 1;
  return [c[0] - ((arm.b[1] - arm.a[1]) / len) * off, c[1] + ((arm.b[0] - arm.a[0]) / len) * off];
}

const BANK = 0x6b573b;
const TURF = 0x5f7e36;
const OAK = 0x76593d;

/** Grass lip over the top of an earth face, darker earth at the foot. */
function turfFace(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(TURF, light * 0.95));
  ctx.beginPath();
  ctx.moveTo(0, -h);
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x, -h + 3 + ((x * 7) % 5));
  ctx.lineTo(w, -h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(30,22,12,.22)';
  ctx.fillRect(0, -3, w, 3);
}

/** Age 1 (Római kor): split-oak palisade on a turfed earth bank; thatched timber watch-posts on mounds. */
const BANK_PALISADE: WallAgeStyle = {
  readback: true,
  postBody: 0.22,
  armStart: reachBody(0.22),
  postHalf: 0.3,
  postTop: 100,
  shadow: (p, arm) => armShadow(p, arm, 0.3 * arm.girth),
  arm: (p, arm) => {
    prism(p, arm.a, arm.b, 0.31 * arm.girth, 0, 13, { color: BANK, top: TURF, batter: 0.14, face: (w, h, l) => turfFace(p.ctx, w, h, l) });
    // Planks on the crest: a staggered double row on 45° runs so they still read end-on.
    const rows = arm.diagonal ? [-0.065, 0.065] : [0];
    const pts = rows
      .flatMap((off) => stations(arm, 0.075, 0.015).map((c) => across(arm, c, off)))
      .sort((x, y) => x[0] + x[1] - (y[0] + y[1]));
    const rail = (z: number) => line(p, p.p(arm.a[0], arm.a[1], z), p.p(arm.b[0], arm.b[1], z), 'rgba(40,28,16,.75)', 2.4);
    rail(32);
    for (const c of pts) plank(p, c, 12, 37, OAK);
    rail(20);
    for (const q of [arm.a, arm.b]) p.addVolumePoint(q[0], q[1], 52);
  },
  post: (p) => {
    padShadow(p, 0.34);
    frustum(p, 0.1, 0.1, 0.9, 0.9, 0, 14, 0.12, { color: BANK, top: TURF, face: (w, h, l) => turfFace(p.ctx, w, h, l) });
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
const COPING = shade(NORMAN_RAGSTONE, 0.86);
/** The sloped turf glacis in front of the scarp (the Hungarian runs carry their green on top). */
const GLACIS = 0x5a7a33;
const GLACIS_TOP = 0x6f9440;

/** Long-and-short stone quoins at both ends of a face (the bastion's angles). */
function quoins(ctx: Ctx, w: number, h: number, light: number): void {
  for (let y = 0, i = 0; y < h - 2; y += 6, i++) {
    const qw = i % 2 ? 5 : 9;
    ctx.fillStyle = css(shade(DRESSING, light * 0.98));
    ctx.fillRect(0, -y - 5.5, qw, 5);
    ctx.fillRect(w - qw, -y - 5.5, qw, 5);
  }
}

/** Rounded stone cordon: a lit band over a shadowed underside. */
function cordonFace(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = 'rgba(240,244,248,.35)';
  ctx.fillRect(0, -h, w, 1.2);
  ctx.fillStyle = 'rgba(30,26,24,.4)';
  ctx.fillRect(0, -1.2, w, 1.2);
}

/** Splayed gun embrasures cut down into the brick parapet at intervals, over its coping line. */
function embrasures(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(COPING, light), 0.9);
  ctx.fillRect(0, -h, w, 1.6);
  for (let x = 14; x < w - 8; x += 28) {
    ctx.fillStyle = css(shade(0x1c1512, light));
    ctx.beginPath();
    ctx.moveTo(x - 4.5, -h);
    ctx.lineTo(x + 4.5, -h);
    ctx.lineTo(x + 2, -h + 4.5);
    ctx.lineTo(x - 2, -h + 4.5);
    ctx.closePath();
    ctx.fill();
  }
}

/** Grass blades along the foot of the glacis, darker turf at the top break of slope. */
function glacisFace(ctx: Ctx, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(GLACIS_TOP, light * 1.08), 0.55);
  for (let x = 2; x < w; x += 5) ctx.fillRect(x, -2 - ((x * 7) % 3), 1, 2 + ((x * 3) % 3));
  ctx.fillStyle = 'rgba(20,30,10,.25)';
  ctx.fillRect(0, -h, w, 1.4);
}

/** A stone guérite (sentry box) on the bastion's right-hand salient: a small grey turret with a lead cap. */
function guerite(p: IsoPainter, z: number): void {
  const [u0, v0, u1, v1] = [0.6, 0.2, 0.78, 0.38];
  p.box(u0, v0, u1, v1, z, z + 11, { color: DRESSING, detail: 'stone' }, COPING);
  const slit = (w: number) => {
    p.ctx.fillStyle = '#16120f';
    p.ctx.fillRect(w / 2 - 0.9, -8.5, 1.8, 5.5);
  };
  p.leftFace(u0, u1, v1, z, slit, 11);
  p.rightFace(v0, v1, u1, z, slit, 11);
  p.hipRoof(u0, v0, u1, v1, z + 11, 9, 0x4c5359, 0.03);
}

/** A field gun on the bastion's terreplein, its muzzle over the salient. */
function gun(p: IsoPainter, z: number): void {
  p.box(0.5, 0.5, 0.68, 0.68, z, z + 4.5, { color: 0x4a3524 }, 0x5a4230);
  for (const [u, v] of [[0.52, 0.68], [0.68, 0.52]] as const) {
    const [x, y] = p.p(u, v, z + 2.5);
    p.ctx.fillStyle = '#2b2018';
    p.ctx.beginPath();
    p.ctx.ellipse(x, y, 3.2, 3.6, 0, 0, Math.PI * 2);
    p.ctx.fill();
  }
  const a = p.p(0.54, 0.54, z + 7);
  const b = p.p(0.84, 0.84, z + 7.5);
  line(p, a, b, '#202226', 7.5);
  line(p, [a[0], a[1] - 2], [b[0], b[1] - 2], '#757a80', 1.8);
  p.ctx.fillStyle = '#0d0e10';
  p.ctx.beginPath();
  p.ctx.arc(b[0], b[1], 2.4, 0, Math.PI * 2);
  p.ctx.fill();
  p.normalCylinder(Math.min(a[0], b[0]) - 3, Math.min(a[1], b[1]) - 3, Math.abs(b[0] - a[0]) + 6, Math.abs(b[1] - a[1]) + 6);
}

/**
 * Age 3 (Felvilágosodás): a low star-fort trace — a sloped turf glacis in
 * front, a battered plum-brick scarp, a grey stone cordon and a brick
 * parapet with gun embrasures under grey coping; quoined bastions with a
 * stone guérite and a gun on corner and end bastions.
 */
const STAR_FORT: WallAgeStyle = {
  readback: true,
  postBody: 0.22,
  armStart: reachBody(0.22),
  postHalf: 0.37,
  postTop: 46,
  shadow: (p, arm) => armShadow(p, arm, 0.36 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.44 * g, 0, 7, { color: GLACIS, top: GLACIS_TOP, batter: 0.15, face: (w, h, l) => glacisFace(p.ctx, w, h, l) });
    prism(p, arm.a, arm.b, 0.29 * g, 7, 27, { color: BRICK, detail: 'brick', batter: 0.07 });
    prism(p, arm.a, arm.b, 0.235 * g, 27, 30, { color: DRESSING, top: COPING, face: (w, h) => cordonFace(p.ctx, w, h) });
    prism(p, arm.a, arm.b, 0.22 * g, 30, 37.5, { color: BRICK, detail: 'brick', top: COPING, batter: 0.03, face: (w, h, l) => embrasures(p.ctx, w, h, l) });
  },
  post: (p, arms) => {
    padShadow(p, 0.44);
    frustum(p, 0.02, 0.02, 0.98, 0.98, 0, 7, 0.14, { color: GLACIS, top: GLACIS_TOP, face: (w, h, l) => glacisFace(p.ctx, w, h, l) });
    frustum(p, 0.15, 0.15, 0.85, 0.85, 7, 30, 0.075, { color: BRICK, detail: 'brick', face: (w, h, l) => quoins(p.ctx, w, h, l) });
    frustum(p, 0.21, 0.21, 0.79, 0.79, 30, 33, 0, { color: DRESSING, top: COPING, face: (w, h) => cordonFace(p.ctx, w, h) });
    frustum(p, 0.22, 0.22, 0.78, 0.78, 33, 41, 0.02, { color: BRICK, detail: 'brick', top: COPING, face: (w, h, l) => embrasures(p.ctx, w, h, l) });
    // Corner and end bastions mount a gun and a guérite on their salient; rhythm piers of a straight run carry only the flag.
    if (STRAIGHT.includes(arms)) return;
    gun(p, 41);
    guerite(p, 41);
  },
};

/** The English wall styles by registry id (config/civs.ts wallStyle). */
export const ENGLISH_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'bank_palisade' | 'norman_curtain' | 'star_fort'>, WallAgeStyle>> = {
  bank_palisade: BANK_PALISADE,
  norman_curtain: NORMAN_CURTAIN,
  star_fort: STAR_FORT,
};
