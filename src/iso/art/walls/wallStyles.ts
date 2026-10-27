import { WALL_E, WALL_N, WALL_NE, WALL_NW, WALL_S, WALL_SE, WALL_SW, WALL_W } from '../../../game/wallNeighbours';
import { CIV_DEFS, type WallStyleId } from '../../../config/civs';
import type { AgeId, CivId } from '../../../types';
import { HUNGARIAN_BAROQUE } from '../architecture/hungarianStyles';
import { helm } from '../architecture/roofs';
import { HW, type IsoPainter } from '../isoPainter';
import { css, shade } from '../palette';
import { prism, type UV } from './prism';

/** Rusticated plinth stone of the baroque bastion. */
const PLINTH = HUNGARIAN_BAROQUE.palette.stone;

/** One arm of a wall piece: from `a` (post face or tile centre) to the shared edge / corner `b`. */
export interface Arm {
  /** Thickness factor: 45° runs are built thicker so they still read when seen end-on. */
  readonly girth: number;
  readonly a: UV;
  readonly b: UV;
  /** Length from the tile centre to `b` (tiles). */
  readonly full: number;
  readonly diagonal: boolean;
}

export interface WallAgeStyle {
  /** Half the post's footprint edge (tiles). */
  readonly postHalf: number;
  /** Height of the post's top, where the banner pole stands (art px). */
  readonly postTop: number;
  /** Soft contact shadow under an arm (painted first). */
  shadow(p: IsoPainter, arm: Arm): void;
  arm(p: IsoPainter, arm: Arm): void;
  /** `arms` = the joined neighbour bits (corner towers vs. run piers). */
  post(p: IsoPainter, arms: number): void;
}

/**
 * Evenly spaced points along an arm, counted from its far end so the
 * rhythm (stakes, merlons) carries on across the tile edge into the
 * neighbour; points closer than `clear` to the arm's start are skipped.
 * Sorted back to front.
 */
export function stations(arm: Arm, spacing: number, clear = 0): UV[] {
  const n = Math.max(1, Math.round(arm.full / spacing));
  const step = arm.full / n;
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]);
  const du = (arm.a[0] - arm.b[0]) / (len || 1);
  const dv = (arm.a[1] - arm.b[1]) / (len || 1);
  const out: UV[] = [];
  for (let d = step / 2; d < len - clear; d += step) out.push([arm.b[0] + du * d, arm.b[1] + dv * d]);
  return out.sort((x, y) => x[0] + x[1] - (y[0] + y[1]));
}

/** A short piece of the arm's line centred on `c` (for merlons, cordons). */
function along(arm: Arm, c: UV, halfLen: number): [UV, UV] {
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]) || 1;
  const du = ((arm.b[0] - arm.a[0]) / len) * halfLen;
  const dv = ((arm.b[1] - arm.a[1]) / len) * halfLen;
  return [[c[0] - du, c[1] - dv], [c[0] + du, c[1] + dv]];
}

function contactShadow(p: IsoPainter, arm: Arm, half: number): void {
  const ctx = p.ctx;
  const a = p.p(arm.a[0], arm.a[1], 0);
  const b = p.p(arm.b[0], arm.b[1], 0);
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = 'rgba(14,20,10,0.32)';
  ctx.lineWidth = half * HW * 2.2;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1] + 2);
  ctx.lineTo(b[0], b[1] + 2);
  ctx.stroke();
  ctx.restore();
}

function postShadow(p: IsoPainter, half: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(0.5, 0.5, 0);
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = 'rgba(14,20,10,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, half * HW * 1.9, half * HW, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One sharpened log stake standing at ground point c. */
function stake(p: IsoPainter, c: UV, z0: number, height: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(c[0], c[1], z0);
  const r = 3.3;
  const h = height * (0.92 + p.random() * 0.14);
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, '#9a6d3f');
  g.addColorStop(0.45, '#7a532e');
  g.addColorStop(1, '#43301c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - r, y + 1);
  ctx.lineTo(x - r, y - h);
  ctx.lineTo(x, y - h - 6);
  ctx.lineTo(x + r, y - h);
  ctx.lineTo(x + r, y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(232,200,150,.55)';
  ctx.beginPath();
  ctx.moveTo(x - r, y - h);
  ctx.lineTo(x, y - h - 6);
  ctx.lineTo(x - 0.4, y - h + 0.5);
  ctx.closePath();
  ctx.fill();
  p.normalCylinder(x - r, y - h - 6, r * 2, h + 7);
}

const EARTH = 0x7a6646;
const TURF = 0x6d8a3c;
const LOGS = 0x7a5232;

/** Age 1 (Római kor): timber palisade on a turf bank, log watch-posts with shingle caps. */
const PALISADE: WallAgeStyle = {
  postHalf: 0.27,
  postTop: 84,
  shadow: (p, arm) => contactShadow(p, arm, 0.2 * arm.girth),
  arm: (p, arm) => {
    prism(p, arm.a, arm.b, 0.2 * arm.girth, 0, 7, { color: EARTH, top: TURF, batter: 0.06 });
    const ctx = p.ctx;
    // 45° runs get a second, staggered row so they still read when seen end-on.
    const rows = arm.diagonal ? [-0.055, 0.055] : [0];
    const pts = rows.flatMap((off, i) => stations(arm, 0.085, 0.02).map((c, j): UV => {
      const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]) || 1;
      const shift = i * 0.04 * (j % 2 ? 1 : -1);
      return [c[0] - ((arm.b[1] - arm.a[1]) / len) * off + shift, c[1] + ((arm.b[0] - arm.a[0]) / len) * off + shift];
    })).sort((x, y) => x[0] + x[1] - (y[0] + y[1]));
    // Rear binding rail, then the stakes back to front, then the front rail.
    const rail = (z: number, alpha: number) => {
      const a = p.p(arm.a[0], arm.a[1], z);
      const b = p.p(arm.b[0], arm.b[1], z);
      ctx.strokeStyle = `rgba(48,32,18,${alpha})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    };
    rail(26, 0.6);
    for (const c of pts) stake(p, c, 6, 44);
    rail(18, 0.85);
    rail(36, 0.85);
    for (const q of [arm.a, arm.b]) p.addVolumePoint(q[0], q[1], 50);
  },
  post: (p) => {
    postShadow(p, 0.27);
    p.box(0.23, 0.23, 0.77, 0.77, 0, 8, { color: EARTH }, TURF);
    p.box(0.26, 0.26, 0.74, 0.74, 8, 60, { color: LOGS, detail: 'logs' });
    // Lookout under the cap.
    p.leftFace(0.26, 0.74, 0.74, 8, (w) => {
      p.ctx.fillStyle = '#1e140c';
      p.ctx.fillRect(w / 2 - 5, -48, 10, 8);
    }, 52);
    p.material = 'shingle';
    p.hipRoof(0.26, 0.26, 0.74, 0.74, 60, 24, 0x6a5440, 0.07);
  },
};

const ASHLAR = 0xa59d8c;
const WALK = 0x8a8273;

/** Age 2 (Középkor): ashlar curtain wall, battered plinth, crenellations; square towers. */
const CURTAIN: WallAgeStyle = {
  postHalf: 0.31,
  postTop: 84,
  shadow: (p, arm) => contactShadow(p, arm, 0.21 * arm.girth),
  arm: (p, arm) => {
    prism(p, arm.a, arm.b, 0.21 * arm.girth, 0, 10, { color: shade(ASHLAR, 0.9), detail: 'fieldstone', batter: 0.03 });
    prism(p, arm.a, arm.b, 0.18 * arm.girth, 10, 54, {
      color: ASHLAR,
      detail: 'stone',
      top: WALK,
      face: (w) => {
        // Weathering streaks and moss along the foot.
        const ctx = p.ctx;
        const g = ctx.createLinearGradient(0, -14, 0, 0);
        g.addColorStop(0, 'rgba(70,90,40,0)');
        g.addColorStop(1, 'rgba(70,90,40,.35)');
        ctx.fillStyle = g;
        ctx.fillRect(0, -14, w, 14);
      },
    });
    for (const c of stations(arm, 0.25, 0.05)) {
      const [m0, m1] = along(arm, c, 0.055);
      prism(p, m0, m1, 0.18 * arm.girth, 54, 64, { color: ASHLAR, top: shade(ASHLAR, 1.05) });
    }
  },
  post: (p) => {
    postShadow(p, 0.31);
    p.box(0.17, 0.17, 0.83, 0.83, 0, 10, { color: shade(ASHLAR, 0.9), detail: 'fieldstone' }, WALK);
    p.box(0.19, 0.19, 0.81, 0.81, 10, 74, { color: ASHLAR, detail: 'stone' }, WALK);
    const slit = (w: number) => {
      p.ctx.fillStyle = '#1a1410';
      p.ctx.fillRect(w / 2 - 1.5, -50, 3, 14);
      p.ctx.fillRect(w / 2 - 4, -44, 8, 2.5);
    };
    p.leftFace(0.19, 0.81, 0.81, 10, slit, 64);
    p.rightFace(0.19, 0.81, 0.81, 10, slit, 64);
    // Corbelled parapet with merlons at the corners and mid-sides.
    p.box(0.16, 0.16, 0.84, 0.84, 70, 76, { color: shade(ASHLAR, 1.04) }, WALK);
    const m = 0.15;
    for (const [u, v] of [[0.16, 0.16], [0.5 - m / 2, 0.16], [0.84 - m, 0.16], [0.16, 0.5 - m / 2], [0.84 - m, 0.5 - m / 2], [0.16, 0.84 - m], [0.5 - m / 2, 0.84 - m], [0.84 - m, 0.84 - m]] as const) {
      p.box(u, v, u + m, v + m, 76, 84, { color: ASHLAR }, shade(ASHLAR, 1.05));
    }
  },
};

const BRICK = 0xa65a3c;
const STONE_TRIM = 0xd8ceb8;
const RAMPART = 0x6b8a3d;

/** Guérite (sentry turret) corbelled out at the front corner of a bastion pier. */
function guerite(p: IsoPainter, z: number): void {
  const u = 0.79;
  const v = 0.79;
  helm(p, u, v, z - 10, [[0, 0.02], [10, 0.11]], STONE_TRIM, false);
  helm(p, u, v, z, [[0, 0.11], [20, 0.11]], 0xe2d6bd, false);
  const [x, y] = p.p(u, v, z + 11);
  p.ctx.fillStyle = '#1d1712';
  p.ctx.fillRect(x - 1.5, y - 5, 3, 9);
  helm(p, u, v, z + 20, [[0, 0.13], [3, 0.12], [9, 0.07], [13, 0.02], [16, 0.005]], 0x5f6a72);
}

/** Age 3 (Felvilágosodás): battered brick bastion with stone cordon and turf rampart; quoined piers. */
const BASTION: WallAgeStyle = {
  postHalf: 0.3,
  postTop: 62,
  shadow: (p, arm) => contactShadow(p, arm, 0.25 * arm.girth),
  arm: (p, arm) => {
    prism(p, arm.a, arm.b, 0.25 * arm.girth, 0, 8, { color: PLINTH, detail: 'stone', batter: 0.02 });
    prism(p, arm.a, arm.b, 0.235 * arm.girth, 8, 40, { color: BRICK, detail: 'brick', batter: 0.045 });
    prism(p, arm.a, arm.b, 0.2 * arm.girth, 40, 44, { color: STONE_TRIM, top: STONE_TRIM });
    prism(p, arm.a, arm.b, 0.18 * arm.girth, 44, 52, { color: shade(BRICK, 1.04), detail: 'brick', top: RAMPART, batter: 0.03 });
  },
  post: (p, arms) => {
    postShadow(p, 0.3);
    p.box(0.18, 0.18, 0.82, 0.82, 0, 9, { color: PLINTH, detail: 'stone' }, PLINTH);
    p.box(0.2, 0.2, 0.8, 0.8, 9, 56, { color: BRICK, detail: 'brick' });
    const quoin = (w: number, light: number) => {
      const ctx = p.ctx;
      for (let y = 0, i = 0; y < 46; y += 7, i++) {
        const qw = i % 2 ? 6 : 10;
        ctx.fillStyle = css(shade(STONE_TRIM, light * 0.95));
        ctx.fillRect(0, -y - 6.5, qw, 6);
        ctx.fillRect(w - qw, -y - 6.5, qw, 6);
      }
    };
    p.leftFace(0.2, 0.8, 0.8, 9, (w) => quoin(w, 1), 47);
    p.rightFace(0.2, 0.8, 0.8, 9, (w) => quoin(w, 0.75), 47);
    p.box(0.17, 0.17, 0.83, 0.83, 56, 62, { color: STONE_TRIM }, STONE_TRIM);
    const straight = [WALL_E | WALL_W, WALL_N | WALL_S, WALL_NE | WALL_SW, WALL_NW | WALL_SE].includes(arms);
    if (straight) {
      helm(p, 0.5, 0.5, 62, [[0, 0.09], [3, 0.06], [5, 0.05], [9, 0.09], [14, 0.06], [16, 0.01]], STONE_TRIM, false);
    } else {
      guerite(p, 44);
    }
  },
};

export const WALL_STYLES: Record<AgeId, WallAgeStyle> = { 1: PALISADE, 2: CURTAIN, 3: BASTION };

/** Wall styles by registry id (config/civs.ts wallStyle). */
export const WALL_STYLE_BY_ID: Record<WallStyleId, WallAgeStyle> = { palisade: PALISADE, curtain: CURTAIN, bastion: BASTION };

/** The wall style a civ builds in an age. */
export function wallStyleFor(age: AgeId, civ: CivId): WallAgeStyle {
  return WALL_STYLE_BY_ID[CIV_DEFS[civ].wallStyle[age]];
}
