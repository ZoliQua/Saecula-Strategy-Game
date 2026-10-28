import type { WallStyleId } from '../../../../config/civs';
import { R } from '../../architecture/facade';
import { ITALIAN_COMUNE, ITALIAN_ETRURIA } from '../../architecture/italian/italianStyles';
import { machicolation, putlogs } from '../../architecture/italian/italianParts';
import { loggia } from '../../architecture/italian/loggia';
import { lowHip } from '../../architecture/kits/lowHip';
import { swallowtailCrown } from '../../architecture/kits/swallowtail';
import type { Ctx } from '../../canvas';
import { css, shade } from '../../palette';
import { armShadow, frontEdge, padShadow } from '../kits/wallParts';
import { prism, type UV } from '../prism';
import { stations, type Arm, type WallAgeStyle } from '../wallKit';
import { ashlarFace, forkedMerlon, pointedSlit, type MerlonSize } from './italianWallParts';
import { TRACE_ITALIENNE } from './traceItalienne';

/*
 * Italian walls (M5), one character per age, matched to the Italian
 * towers and palettes: the Servian wall of Rome — big regular blocks of
 * yellow tufa in opus quadratum under a travertine coping, its square
 * ashlar towers opening into an arcaded fighting room under a low
 * terracotta pyramid (the sky shows through the arches); a communal
 * brick curtain on a stone base crowned by big forked swallowtail
 * (Ghibelline) merlons, its square brick towers corbelled out into a
 * forked crown like the torri of San Gimignano; and a trace italienne
 * of brick bastions with a white stone cordon, a lantern-domed garitta
 * on every pier (traceItalienne.ts).
 */

const E = ITALIAN_ETRURIA.palette;
const C = ITALIAN_COMUNE.palette;

/**
 * Yellow-grey tufa (cappellaccio) of the Servian wall, travertine of its coping and cornices.
 * Low in red, so the orange dusk light keeps it a warm stone, not a pink brick.
 */
const TUFA = 0xc6bd86;
const TRAVERTINE = E.ashlar;
const SERVIAN_TOP = 44;
const SERVIAN_HALF = 0.17;
/** The tower's arcaded fighting room, from its cornice to the eaves. */
const ROOM_Z = 60;
const EAVE_Z = 88;
/** Apex of the low pyramid over the arcades, where the banner pole stands. */
const SERVIAN_ROOF = EAVE_Z + Math.round(30 * ITALIAN_ETRURIA.roof.pitch);

/** Tower face: ashlar courses and two arched slits, one above the other. */
function servianTowerFace(ctx: Ctx, w: number, h: number, light: number, rand: () => number): void {
  ashlarFace(ctx, w, h, light, TUFA, rand);
  for (const y of [h * 0.3, h * 0.68]) {
    ctx.fillStyle = css(shade(TRAVERTINE, light));
    ctx.fillRect(w / 2 - 4, -y - 13, 8, 14);
    ctx.fillStyle = '#1e150e';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 1.6, -y - 1);
    ctx.lineTo(w / 2 - 1.6, -y - 9);
    ctx.arc(w / 2, -y - 9, 1.6, Math.PI, 0);
    ctx.lineTo(w / 2 + 1.6, -y - 1);
    ctx.fill();
  }
}

/** Age 1 (Római kor): the Servian wall in tufa opus quadratum; square towers with an open arcaded top under a low pyramid. */
const SERVIAN: WallAgeStyle = {
  readback: true,
  postHalf: 0.3,
  postTop: SERVIAN_ROOF,
  shadow: (p, arm) => armShadow(p, arm, 0.24 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.21 * g, 0, 6, { color: shade(TUFA, 0.86), top: shade(TUFA, 0.9), face: (w, h, l) => ashlarFace(p.ctx, w, h, l, shade(TUFA, 0.86), () => p.random(), 6) });
    prism(p, arm.a, arm.b, SERVIAN_HALF * g, 6, SERVIAN_TOP - 3, { color: TUFA, top: TUFA, batter: 0.012, face: (w, h, l) => ashlarFace(p.ctx, w, h, l, TUFA, () => p.random()) });
    prism(p, arm.a, arm.b, (SERVIAN_HALF + 0.02) * g, SERVIAN_TOP - 3, SERVIAN_TOP, { color: TRAVERTINE, top: shade(TUFA, 0.64) });
  },
  post: (p) => {
    padShadow(p, 0.35);
    p.box(0.17, 0.17, 0.83, 0.83, 0, 8, { color: shade(TUFA, 0.86) }, shade(TUFA, 0.86));
    p.box(0.2, 0.2, 0.8, 0.8, 8, ROOM_Z - 4, { color: TUFA }, TUFA);
    p.leftFace(0.2, 0.8, 0.8, 8, (w, h) => servianTowerFace(p.ctx, w, h, 1, () => p.random()), ROOM_Z - 12);
    p.rightFace(0.2, 0.8, 0.8, 8, (w, h) => servianTowerFace(p.ctx, w, h, R, () => p.random()), ROOM_Z - 12);
    // Travertine cornice carrying the arcaded fighting room.
    p.box(0.17, 0.17, 0.83, 0.83, ROOM_Z - 4, ROOM_Z, { color: TRAVERTINE }, shade(TRAVERTINE, 0.9));
    const room = [0.2, 0.2, 0.8, 0.8] as const;
    const o = { wall: { color: TUFA }, trim: TRAVERTINE, bays: [2, 2] as const, pier: 0.045, band: 4 };
    loggia(p, room, ROOM_Z, EAVE_Z, 'back', o);
    loggia(p, room, ROOM_Z, EAVE_Z, 'front', o);
    lowHip(p, ITALIAN_ETRURIA, room, EAVE_Z, 30, E.roof, 0.07);
    p.addVolumePoint(0.5, 0.5, SERVIAN_ROOF);
  },
};

const STONE = C.stone;
const BRICK = C.brick;
const WALK = shade(BRICK, 0.72);
/** Wall-walk of the Ghibelline curtain: the merlons stand on it. */
export const GHIBELLINE_WALK = 50;
const GHIB_HALF = 0.17;
/** The forked merlons of the run: sized so the V notch reads on the skyline at zoom 1. */
export const MERLON: MerlonSize = { width: 0.26, thick: 0.08, body: 9, horn: 14 };
/** Tower-crown copings: brick a shade lighter (a pale travertine top reads as a row of spikes from afar). */
const MERLON_CAP = shade(BRICK, 1.12);
/** The run merlons' notch copings: dark, so each V reads as a dark wedge between paired horns (not a stepped peak). */
const NOTCH = shade(BRICK, 0.38);
/** The tower's corbelled platform and its crown. */
const TOWER_PLATFORM = 96;
const SHAFT = [0.22, 0.22, 0.78, 0.78] as const;

/** Unit ground direction of an arm (towards its far end). */
function dir(arm: Arm): UV {
  const len = Math.hypot(arm.b[0] - arm.a[0], arm.b[1] - arm.a[1]) || 1;
  return [(arm.b[0] - arm.a[0]) / len, (arm.b[1] - arm.a[1]) / len];
}

/** Curtain face: weathering at the foot, putlog holes, a pointed slit at intervals. */
function curtainFace(ctx: Ctx, w: number, h: number, light: number): void {
  putlogs(ctx, w, h, light);
  for (let x = 22; x < w - 10; x += 44) pointedSlit(ctx, x, -12, 13, TRAVERTINE, light);
}

/** Age 2 (Középkor): communal brick curtain on a stone base, forked swallowtail merlons; corbelled brick towers with a forked crown. */
const GHIBELLINE: WallAgeStyle = {
  readback: true,
  postHalf: 0.3,
  postTop: TOWER_PLATFORM,
  shadow: (p, arm) => armShadow(p, arm, 0.22 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.2 * g, 0, 12, { color: STONE, detail: 'stone', batter: 0.025 });
    prism(p, arm.a, arm.b, GHIB_HALF * g, 12, GHIBELLINE_WALK, { color: BRICK, detail: 'brick', top: WALK, face: (w, h, l) => curtainFace(p.ctx, w, h, l) });
    const d = dir(arm);
    const m = { ...MERLON, thick: MERLON.thick * g };
    for (const c of stations(arm, 0.32, 0.06)) {
      forkedMerlon(p, frontEdge(arm, c, GHIB_HALF * g - m.thick / 2), d, GHIBELLINE_WALK, m, BRICK, NOTCH);
    }
  },
  post: (p) => {
    padShadow(p, 0.35);
    p.box(0.17, 0.17, 0.83, 0.83, 0, 18, { color: STONE, detail: 'stone' }, STONE);
    const face = (light: number) => (w: number, h: number) => {
      putlogs(p.ctx, w, h, light);
      pointedSlit(p.ctx, w / 2, -h * 0.42, 14, TRAVERTINE, light);
      pointedSlit(p.ctx, w / 2, -h + 10, 12, TRAVERTINE, light);
    };
    p.box(...SHAFT, 18, TOWER_PLATFORM - 12, { color: BRICK, detail: 'brick' }, WALK);
    p.leftFace(SHAFT[0], SHAFT[2], SHAFT[3], 18, face(1), TOWER_PLATFORM - 30);
    p.rightFace(SHAFT[1], SHAFT[3], SHAFT[2], 18, face(R), TOWER_PLATFORM - 30);
    p.box(...SHAFT, TOWER_PLATFORM - 12, TOWER_PLATFORM, { color: BRICK, detail: 'brick' }, WALK);
    const slab = machicolation(p, SHAFT, TOWER_PLATFORM, 12, 0.07, TRAVERTINE);
    // Brick floor of the fighting platform over the corbels' slab.
    p.box(slab[0] + 0.02, slab[1] + 0.02, slab[2] - 0.02, slab[3] - 0.02, TOWER_PLATFORM, TOWER_PLATFORM + 0.5, { color: WALK }, WALK);
    const crown = { color: BRICK, cap: MERLON_CAP, parapet: 4, body: 8, horn: 8, width: 0.15, gap: 0.07, thickness: 0.06 };
    swallowtailCrown(p, ...slab, TOWER_PLATFORM, 'back', crown);
    swallowtailCrown(p, ...slab, TOWER_PLATFORM, 'front', crown);
  },
};

/** The Italian wall styles by registry id (config/civs.ts wallStyle). */
export const ITALIAN_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'servian' | 'ghibelline' | 'trace_italienne'>, WallAgeStyle>> = {
  servian: SERVIAN,
  ghibelline: GHIBELLINE,
  trace_italienne: TRACE_ITALIENNE,
};
