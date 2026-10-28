import type { IsoPainter } from '../../isoPainter';
import { lerp } from '../../isoProps';
import { N_LEFT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import type { Ctx } from '../../canvas';
import { CHARGES } from '../charges';
import { archedOpening, crest, R } from '../facade';
import { needleSpire } from '../kits/needleSpire';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, scaffold } from '../wonderParts';
import { crossFinial, domBlock, octPrism, rhombHelm, type Block, type DomLook, type DomWallOpts } from './kaiserdomParts';
import { arcadeStorey, dwarfGallery, lombardBand } from './romanesqueParts';

/*
 * The German Wonder: an imperial cathedral after Speyer — a Romanesque
 * basilica of red sandstone with yellow bands, its nave and aisles
 * running towards the viewer, a transept with an octagonal crossing
 * tower, two tower pairs with rhomboid helms (east, flanking the choir,
 * and west, flanking the Westbau with its own octagon), dwarf galleries
 * under the eaves. Stages: footings with the crane and the choir rising,
 * then the choir and east towers up with the nave in its walls, then
 * the roofed church with the west towers still in scaffolding.
 */

const BASE = 6;
const WALL = 104;
const NAVE_WALL = 116;
const AISLE_WALL = 62;
const RISE = 46;
const EAST_TOP = 196;
const WEST_TOP = 238;
const HELM_GABLE = 26;
const HELM = 70;
const CROSSING_TOP = 176;
const WESTBAU = 140;

const E_TOWER_L: Block = [1.05, 0.42, 1.45, 0.82];
const CHOIR: Block = [1.45, 0.3, 2.55, 1.45];
const E_TOWER_R: Block = [2.55, 0.42, 2.95, 0.82];
const TRANSEPT: Block = [0.55, 1.45, 3.45, 2.25];
const AISLE_L: Block = [1.05, 2.25, 1.45, 3.3];
const NAVE: Block = [1.45, 2.25, 2.55, 3.3];
const AISLE_R: Block = [2.55, 2.25, 2.95, 3.3];
const W_TOWER_L: Block = [0.9, 3.28, 1.32, 3.7];
const WESTBAU_BLOCK: Block = [1.32, 3.3, 2.68, 3.72];
const W_TOWER_R: Block = [2.68, 3.28, 3.1, 3.7];

const TALL: DomWallOpts = { rows: [[46, 30]], gallery: true };

/** Slate gable roof over a block (ridge along `axis`) with an oculus in its gable. */
function domRoof(p: IsoPainter, k: DomLook, [u0, v0, u1, v1]: Block, eave: number, axis: 'u' | 'v', rise = RISE): void {
  p.material = 'slate';
  p.gableRoof(u0, v0, u1, v1, eave, rise, k.roof, k.stone, axis, 0.05, (w, r) => {
    const ctx = p.ctx;
    lombardBand(ctx, w, 4, k.stone, axis === 'u' ? R : 1, 6);
    ctx.fillStyle = css(shade(k.band, axis === 'u' ? R : 1));
    ctx.beginPath();
    ctx.arc(w / 2, -r * 0.42, Math.min(7, r * 0.15) + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a110c';
    ctx.beginPath();
    ctx.arc(w / 2, -r * 0.42, Math.min(7, r * 0.15), 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Lean-to aisle roof against the nave: high at the nave wall, falling outwards (towards -u on the left aisle, +u on the right). */
function aisleRoof(p: IsoPainter, k: DomLook, [u0, v0, u1, v1]: Block, right: boolean): void {
  const rise = 26;
  const top = AISLE_WALL + rise;
  const o = 0.05;
  const [hiU, loU] = right ? [u0, u1 + o] : [u1, u0 - o];
  const slope = [p.p(hiU, v0 - o, top), p.p(loU, v0 - o, AISLE_WALL), p.p(loU, v1 + o, AISLE_WALL), p.p(hiU, v1 + o, top)];
  const gable = [p.p(u0, v1, AISLE_WALL), p.p(u1, v1, AISLE_WALL), p.p(hiU, v1, top)];
  p.fillPoly(gable, css(k.stone));
  p.normals.fill(gable, N_LEFT);
  p.material = 'slate';
  const run = u1 - u0 + o;
  p.roofSlope(slope, k.roof, right ? 0.75 : 0.95, p.slope(right ? 1 : -1, 0, run, rise), (t) => [lerp(slope[0]!, slope[1]!, t), lerp(slope[3]!, slope[2]!, t)]);
  p.recordRoof(Math.min(hiU, loU), v0 - o, Math.max(hiU, loU), v1 + o, AISLE_WALL, [p.p(hiU, v0, 0), p.p(hiU, v1, 0)], top);
}

/** A tower of the two pairs: square shaft with arcaded belfry storeys, then (finished) a rhomboid helm. */
function tower(p: IsoPainter, k: DomLook, b: Block, top: number, helm: boolean, empty: boolean): void {
  domBlock(p, k, b, BASE, top - 56, { rows: [[60, 16]], empty, bay: 13 });
  const [u0, v0, u1, v1] = b;
  p.box(u0, v0, u1, v1, top - 56, top, { color: k.stone, detail: 'stone' });
  const belfry = (light: number) => (w: number) => {
    arcadeStorey(p, w, 2, 26, k.stone, light, false, 9);
    arcadeStorey(p, w, 28, 52, k.stone, light, false, 9);
    lombardBand(p.ctx, w, 54, k.stone, light, 5);
  };
  p.leftFace(u0, u1, v1, top - 56, belfry(1), 56);
  p.rightFace(v0, v1, u1, top - 56, belfry(R), 56);
  if (!helm) {
    p.ground(u0, v0, u1, v1, shade(k.stone, 0.8), top);
    return;
  }
  const apex = rhombHelm(p, k, b, top, HELM_GABLE, HELM);
  crossFinial(p, apex, 11);
}

/** Octagonal tower stage with a dwarf gallery and tall lights, capped by a low octagonal copper tent. */
function octagon(p: IsoPainter, k: DomLook, uc: number, vc: number, r: number, z0: number, z1: number, done: boolean): void {
  octPrism(p, uc, vc, r, z0, z1, k.stone, (w, h, light) => {
    const ctx = p.ctx;
    ctx.fillStyle = css(shade(k.stone, light * 1.14));
    ctx.fillRect(0, -h, 2.5, h);
    if (done) p.window(w / 2 - 3, -h + 18, 6, 14, true);
    else {
      ctx.fillStyle = '#1a110c';
      ctx.fillRect(w / 2 - 3, -h + 18, 6, 14);
    }
    dwarfGallery(ctx, w, h - 13, k.stone, light, 8);
  });
  if (!done) return;
  const top = needleSpire(p, uc, vc, r * 1.04, z1, r * 100, k.helm, 'copper');
  crossFinial(p, p.p(uc, vc, top + 2), 9);
}

/** Long team banner with the style's charge, hung from a rod at (x, y) (face-local). */
function banner(ctx: Ctx, s: ArchStyle, x: number, y: number, team: number): void {
  ctx.fillStyle = '#2a1e14';
  ctx.fillRect(x - 6, y - 1.5, 12, 1.6);
  ctx.fillStyle = css(team);
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x + 5, y + 38);
  ctx.lineTo(x, y + 33);
  ctx.lineTo(x - 5, y + 38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9b14a';
  ctx.fillRect(x - 5, y, 10, 1.4);
  CHARGES[s.charge](ctx, x, y + 14, 4.2);
}

/** West front of the Westbau: stepped portal, eagle crest in the tympanum, a rose of small lights. */
function westFront(p: IsoPainter, s: ArchStyle, k: DomLook, team: number, done: boolean): void {
  const [u0, , u1, v1] = WESTBAU_BLOCK;
  p.leftFace(u0, u1, v1, BASE, (w) => {
    const ctx = p.ctx;
    for (let i = 3; i >= 0; i--) archedOpening(ctx, w / 2 - 10 - i * 3, 20 + i * 6, 40 + i * 3, shade(k.band, 1 - i * 0.06), i ? shade(k.stone, 0.75) : 0x1a110c);
    ctx.fillStyle = css(s.palette.doors.main);
    ctx.fillRect(w / 2 - 10, -26, 20, 26);
    if (done) {
      crest(ctx, s, w / 2, -33, 4.5, team);
      for (const x of [w * 0.12, w * 0.88]) banner(ctx, s, x, -100, team);
    }
    for (const x of [w * 0.3, w * 0.7]) p.window(x - 3, -92, 6, 18, true);
  }, WESTBAU - BASE);
}

function paintDom(p: IsoPainter, s: ArchStyle, team: number, stage: number): void {
  const c = s.palette;
  const k: DomLook = { stone: 0xa65b48, band: 0xcfa070, roof: 0x4c535c, helm: c.metal };
  const done = stage > WONDER_STAGES;
  const empty = stage <= WONDER_STAGES;
  p.footShadow();
  p.ground(0.05, 0.05, 3.95, 3.95, 0x6f8a46);
  p.ground(1.6, 3.72, 2.4, 3.95, 0xb8ab90);
  if (stage === 1) {
    domBlock(p, k, E_TOWER_L, 0, 40, { open: true });
    domBlock(p, k, CHOIR, 0, 58, { open: true, rows: [[34, 22]], empty });
    domBlock(p, k, E_TOWER_R, 0, 40, { open: true });
    scaffold(p, ...CHOIR, 0, 58);
    for (const b of [TRANSEPT, [1.05, 2.25, 2.95, 3.3] as Block, [0.9, 3.28, 3.1, 3.72] as Block]) domBlock(p, k, b, 0, 14, { open: true });
    p.box(3.2, 2.7, 3.6, 3.0, 0, 12, { color: k.band, detail: 'stone' }, k.band);
    crane(p, 3.4, 3.4, 150, 2.0, 1.0, 64);
    return;
  }
  tower(p, k, E_TOWER_L, EAST_TOP, stage >= 3, empty);
  domBlock(p, k, CHOIR, BASE, WALL, { ...TALL, empty });
  domRoof(p, k, CHOIR, WALL, 'v');
  tower(p, k, E_TOWER_R, EAST_TOP, stage >= 3, empty);
  if (stage === 2) {
    for (const b of [E_TOWER_L, E_TOWER_R]) scaffold(p, ...b, EAST_TOP - 60, EAST_TOP);
    domBlock(p, k, TRANSEPT, BASE, 70, { open: true, rows: [[46, 30]], empty });
    domBlock(p, k, [1.05, 2.25, 2.95, 3.3], BASE, 48, { open: true });
    domBlock(p, k, [0.9, 3.28, 3.1, 3.72], BASE, 24, { open: true });
    scaffold(p, ...TRANSEPT, 30, 70);
    crane(p, 3.5, 3.0, 190, 2.0, 1.85, 90);
    return;
  }
  domBlock(p, k, TRANSEPT, BASE, WALL, { ...TALL, empty });
  domRoof(p, k, TRANSEPT, WALL, 'u');
  octagon(p, k, 2.0, 1.85, 0.42, WALL + 10, CROSSING_TOP, done);
  domBlock(p, k, AISLE_L, BASE, AISLE_WALL, { rows: [[20, 24]], empty });
  aisleRoof(p, k, AISLE_L, false);
  domBlock(p, k, NAVE, BASE, NAVE_WALL, { rows: [[AISLE_WALL + 4, 30]], empty, gallery: true });
  domRoof(p, k, NAVE, NAVE_WALL, 'v');
  domBlock(p, k, AISLE_R, BASE, AISLE_WALL, { rows: [[20, 24]], empty });
  aisleRoof(p, k, AISLE_R, true);
  const westTop = done ? WEST_TOP : WEST_TOP - 70;
  tower(p, k, W_TOWER_L, westTop, done, empty);
  domBlock(p, k, WESTBAU_BLOCK, BASE, WESTBAU, { gallery: true, empty });
  westFront(p, s, k, team, done);
  octagon(p, k, 2.0, 3.51, 0.3, WESTBAU, WESTBAU + 38, done);
  tower(p, k, W_TOWER_R, westTop, done, empty);
  if (!done) {
    for (const b of [W_TOWER_L, W_TOWER_R]) scaffold(p, ...b, westTop - 50, westTop);
    crane(p, 3.55, 3.55, 230, 2.9, 3.5, westTop + 20);
    return;
  }
  lantern(p, 1.62, 3.74, 30, 1.62, 3.9);
  lantern(p, 2.38, 3.74, 30, 2.38, 3.9);
}

/** The German Wonder (age-3 style): finished in the team colour, or a construction stage. */
export function kaiserdom(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 400,
    paint: (p, team) => paintDom(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintDom(p, s, 0xffffff, stage),
  };
}
