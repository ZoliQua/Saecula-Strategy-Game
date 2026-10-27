import type { WallStyleId } from '../../../../config/civs';
import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../../game/wallNeighbours';
import { ENGLISH_GEORGIAN, ENGLISH_ROMANO_BRITISH, ENGLISH_TUDOR } from '../../architecture/english/englishStyles';
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
 * Norman towers with clasping buttresses (Norman), and a low brick
 * star-fort trace (Georgian): steeply battered brick scarp, Portland
 * stone cordon, turf parapet, and angled bastions with stone quoins
 * and a gun on the salient — the brick and stone of the Martello tower.
 */

const RB = ENGLISH_ROMANO_BRITISH.palette;
const TU = ENGLISH_TUDOR.palette;
const GE = ENGLISH_GEORGIAN.palette;

const STRAIGHT = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE];

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

/** Cool grey Kentish ragstone ashlar (the Hungarian curtain is a warm limestone). */
const ASHLAR = 0x9a9c99;
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

const BRICK = GE.brick;
const PORTLAND = GE.ashlar;
const PARAPET = 0x6a8a3e;
const PARAPET_TOP = 0x7c9d48;
/** Cordon top: the narrow ledge left in front of the turf parapet (kept dull so joins don't flash white). */
const CORDON_TOP = shade(GE.ashlar, 0.78);
/** Turfed berm on top of the plinth (seen from above on 45° runs). */
const BERM = shade(PARAPET, 0.82);

/** Long-and-short stone quoins at both ends of a face (the bastion's angles). */
function quoins(ctx: Ctx, w: number, h: number, light: number): void {
  for (let y = 0, i = 0; y < h - 2; y += 6, i++) {
    const qw = i % 2 ? 5 : 9;
    ctx.fillStyle = css(shade(PORTLAND, light * 0.96));
    ctx.fillRect(0, -y - 5.5, qw, 5);
    ctx.fillRect(w - qw, -y - 5.5, qw, 5);
  }
}

/** Rounded Portland cordon: a bright band over a shadowed underside. */
function cordonFace(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = 'rgba(255,252,240,.45)';
  ctx.fillRect(0, -h, w, 1.2);
  ctx.fillStyle = 'rgba(40,30,20,.35)';
  ctx.fillRect(0, -1.2, w, 1.2);
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

/** Age 3 (Felvilágosodás): low brick star-fort trace with stone cordon and turf parapet; quoined bastions with a gun. */
const STAR_FORT: WallAgeStyle = {
  readback: true,
  postHalf: 0.37,
  postTop: 46,
  shadow: (p, arm) => armShadow(p, arm, 0.3 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.31 * g, 0, 5, { color: PORTLAND, detail: 'stone', top: BERM });
    prism(p, arm.a, arm.b, 0.3 * g, 5, 28, { color: BRICK, detail: 'brick', batter: 0.07 });
    prism(p, arm.a, arm.b, 0.245 * g, 28, 31.5, { color: PORTLAND, top: CORDON_TOP, face: (w, h) => cordonFace(p.ctx, w, h) });
    prism(p, arm.a, arm.b, 0.235 * g, 31.5, 40, { color: PARAPET, top: PARAPET_TOP, batter: 0.09, face: (w, h, l) => turfFace(p.ctx, w, h, l) });
  },
  post: (p, arms) => {
    padShadow(p, 0.4);
    frustum(p, 0.12, 0.12, 0.88, 0.88, 0, 5, 0, { color: PORTLAND, detail: 'stone', top: BERM });
    frustum(p, 0.13, 0.13, 0.87, 0.87, 5, 32, 0.075, { color: BRICK, detail: 'brick', face: (w, h, l) => quoins(p.ctx, w, h, l) });
    frustum(p, 0.19, 0.19, 0.81, 0.81, 32, 35.5, 0, { color: PORTLAND, top: CORDON_TOP, face: (w, h) => cordonFace(p.ctx, w, h) });
    frustum(p, 0.2, 0.2, 0.8, 0.8, 35.5, 44, 0.08, { color: PARAPET, top: shade(PARAPET_TOP, 0.92), face: (w, h, l) => turfFace(p.ctx, w, h, l) });
    // Corner and end bastions mount a gun; rhythm piers of a straight run carry only the flag.
    if (!STRAIGHT.includes(arms)) gun(p, 44);
  },
};

/** The English wall styles by registry id (config/civs.ts wallStyle). */
export const ENGLISH_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'bank_palisade' | 'norman_curtain' | 'star_fort'>, WallAgeStyle>> = {
  bank_palisade: BANK_PALISADE,
  norman_curtain: NORMAN_CURTAIN,
  star_fort: STAR_FORT,
};
