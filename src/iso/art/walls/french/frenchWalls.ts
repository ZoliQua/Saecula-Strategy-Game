import type { WallStyleId } from '../../../../config/civs';
import { FRENCH_GOTHIC } from '../../architecture/french/frenchStyles';
import { coneRoof, drumWall } from '../../architecture/kits/drum';
import { turret } from '../../architecture/kits/pepperpot';
import { post as timberPost } from '../../architecture/parts';
import type { Ctx } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { armShadow, padShadow } from '../kits/wallParts';
import { prism } from '../prism';
import { along, stations, type WallAgeStyle } from '../wallKit';
import { beamEnds, drumBeamEnds, loop, machicolations, wattleFace } from './frenchWallParts';
import { VAUBAN } from './vauban';

/*
 * French walls (M5), one character per age, matched to the French
 * towers and palettes: the murus gallicus — a pale dry-stone face laced
 * with timber whose beam ends show in rows, on an earth rampart, under
 * a wattle breastwork — with round timber-laced towers under broad
 * thatch cones; a white tuffeau curtain with machicolations whose round
 * towers carry the Loire's candle-snuffer slate cones (kits/pepperpot);
 * and a Vauban trace (vauban.ts): pale limestone scarp, a round cordon,
 * a turfed parapet and a stone échauguette on every bastion.
 */

const GO = FRENCH_GOTHIC.palette;

/** A front arm next to a round post starts where its outer edge meets the drum (no ground shows between). */
function drumStart(r: number, half: number): (diagonal: boolean, behind: boolean) => number {
  return (diagonal, behind) => (behind ? 0 : Math.sqrt(Math.max(0, r * r - (half * (diagonal ? 1.25 : 1)) ** 2)));
}

const EARTH = 0x6e5a3e;
const TURF = 0x5f7f36;
/** Pale dry limestone of the Gaulish face (lighter and cooler than the timber palisades of HU / EN / DE). */
const GAUL_STONE = 0xbdb39c;
const BEAMS = 0x5e4430;
const WATTLE = 0x8a6b45;
const THATCH = 0xb39a5e;

const GAUL_R = 0.28;
const GAUL_HALF = 0.19;
/** Apex of the thatch cone, where the banner pole stands. */
const GAUL_TOP = 104;

/** Murus gallicus run face: weathering at the foot, the rows of beam ends. */
function gaulFace(ctx: Ctx, w: number, h: number, light: number): void {
  const g = ctx.createLinearGradient(0, -10, 0, 0);
  g.addColorStop(0, 'rgba(60,50,30,0)');
  g.addColorStop(1, 'rgba(60,50,30,.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, -10, w, 10);
  beamEnds(ctx, w, h, light, BEAMS);
}

/** Age 1 (Római kor): murus gallicus on its rampart, wattle breastwork; round timber-laced towers under thatch cones. */
const MURUS_GALLICUS: WallAgeStyle = {
  readback: true,
  postBody: GAUL_R,
  armStart: drumStart(GAUL_R, GAUL_HALF),
  postHalf: 0.32,
  postTop: GAUL_TOP,
  shadow: (p, arm) => armShadow(p, arm, 0.3 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.31 * g, 0, 9, { color: EARTH, top: TURF, batter: 0.1 });
    prism(p, arm.a, arm.b, GAUL_HALF * g, 6, 36, { color: GAUL_STONE, detail: 'fieldstone', top: shade(EARTH, 1.05), batter: 0.02, face: (w, h, l) => gaulFace(p.ctx, w, h, l) });
    // Wattle breastwork on the crest, staked at intervals.
    for (const c of stations(arm, 0.2, 0.03)) timberPost(p, c[0], c[1], 36, 49, 1.6, BEAMS);
    prism(p, arm.a, arm.b, 0.035 * g, 36, 47, { color: WATTLE, top: shade(WATTLE, 0.8), face: (w, h, l) => wattleFace(p.ctx, w, h, l, WATTLE) });
  },
  post: (p) => {
    padShadow(p, 0.36);
    drumWall(p, 0.5, 0.5, GAUL_R + 0.03, 0, 8, shade(GAUL_STONE, 0.86), 'stone');
    drumWall(p, 0.5, 0.5, GAUL_R, 8, 58, GAUL_STONE, 'stone');
    drumBeamEnds(p, 0.5, 0.5, GAUL_R, 8, 58, BEAMS);
    // Wattle breastwork round the lookout, a dark gap under the thatch.
    drumWall(p, 0.5, 0.5, GAUL_R + 0.02, 58, 68, WATTLE, 'wattle');
    drumWall(p, 0.5, 0.5, GAUL_R - 0.03, 68, 72, 0x2a1d12, 'daub');
    coneRoof(p, 0.5, 0.5, GAUL_R + 0.11, 72, GAUL_TOP - 72, THATCH, 'thatch');
  },
};

const PLINTH = GO.stone;
/** White tuffeau ashlar, held a touch below the buildings' so it does not glare at noon. */
const TUFFEAU = shade(GO.ashlar, 0.96);
const WALK = shade(TUFFEAU, 0.72);
const LOIRE_R = 0.25;
const LOIRE_HALF = 0.18;
/** Drum top of the Loire tower, and its corbelled parapet (pepperpot turret: corbels add 12 px). */
const LOIRE_DRUM = 70;
const LOIRE_STEEP = 1.25;
/**
 * Apex of the tower's candle-snuffer cone, where the banner pole stands:
 * the turret's cone (radius r + 0.06 over the corbels) rises STEEP × its
 * diameter in art px from 1 px under the parapet top.
 */
const LOIRE_TOP = LOIRE_DRUM + 12 - 1 + (LOIRE_R + 0.06) * 2 * Math.SQRT2 * HW * LOIRE_STEEP;

/** Curtain face: weathering at the foot, loops at intervals. */
function curtainFace(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, -12, 0, 0);
  g.addColorStop(0, 'rgba(70,74,50,0)');
  g.addColorStop(1, 'rgba(70,74,50,.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, -12, w, 12);
  for (let x = 22; x < w - 10; x += 44) loop(ctx, x, -h + 30, 14);
}

/** Round tower of the Loire curtain: plinth, drum with loops, corbelled parapet, the slate pepperpot. */
function pepperpotTower(p: IsoPainter): void {
  padShadow(p, 0.34);
  drumWall(p, 0.5, 0.5, LOIRE_R + 0.04, 0, 12, PLINTH, 'ashlar');
  turret(p, FRENCH_GOTHIC, 0.5, 0.5, LOIRE_R, 12, LOIRE_DRUM, { corbels: true, steep: LOIRE_STEEP });
  const ctx = p.ctx;
  for (const [a, z] of [[0.35, 30], [1.25, 48]] as const) {
    const [x, y] = p.p(0.5 + LOIRE_R * Math.cos(a), 0.5 + LOIRE_R * Math.sin(a), z);
    loop(ctx, x, y, 12);
  }
}

/** Age 2 (Középkor): white tuffeau curtain with machicolations and merlons; round towers under candle-snuffer slate cones. */
const PEPPERPOT_CURTAIN: WallAgeStyle = {
  readback: true,
  postBody: LOIRE_R,
  armStart: drumStart(LOIRE_R, LOIRE_HALF),
  postHalf: 0.3,
  postTop: LOIRE_TOP,
  shadow: (p, arm) => armShadow(p, arm, 0.22 * arm.girth),
  arm: (p, arm) => {
    const g = arm.girth;
    prism(p, arm.a, arm.b, 0.225 * g, 0, 12, { color: PLINTH, detail: 'fieldstone', batter: 0.05 });
    prism(p, arm.a, arm.b, LOIRE_HALF * g, 12, 50, { color: TUFFEAU, detail: 'stone', top: WALK, face: (w, h) => curtainFace(p.ctx, w, h) });
    // Oversailing parapet on its machicolation corbels, then the merlons.
    prism(p, arm.a, arm.b, 0.215 * g, 50, 58, { color: TUFFEAU, top: WALK, face: (w, h, l) => machicolations(p.ctx, w, h, l, TUFFEAU) });
    for (const c of stations(arm, 0.25, 0.05)) {
      const [m0, m1] = along(arm, c, 0.07);
      prism(p, m0, m1, 0.2 * g, 58, 67, { color: shade(TUFFEAU, 0.94), top: TUFFEAU });
    }
  },
  post: pepperpotTower,
};

/** The French wall styles by registry id (config/civs.ts wallStyle). */
export const FRENCH_WALL_STYLES: Readonly<Record<Extract<WallStyleId, 'murus_gallicus' | 'pepperpot_curtain' | 'vauban'>, WallAgeStyle>> = {
  murus_gallicus: MURUS_GALLICUS,
  pepperpot_curtain: PEPPERPOT_CURTAIN,
  vauban: VAUBAN,
};
