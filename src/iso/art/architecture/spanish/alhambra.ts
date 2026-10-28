import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest } from '../facade';
import { cypress, patioFloor, patioShade, pool } from '../kits/patio';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, scaffold } from '../wonderParts';
import { comares, courtArcade, lionsFountain, MARBLE, myrtles, pavilion, rangeRoof, TAPIAL, tapialBlock } from './alhambraParts';
import { espadana } from './hispaniaOrnament';
import { terrace, type Block } from './hispaniaParts';

/*
 * The Spanish Wonder: the Alhambra's Nasrid palaces. The Comares tower
 * stands at the back with its portico of seven arches over the Court of
 * the Myrtles, whose long pool runs between clipped hedges towards the
 * viewer; beside it the Court of the Lions opens behind low red ranges —
 * cusped arcades on slender marble columns, two pavilions with pyramid
 * roofs and the Fountain of the Lions in the middle. Red rammed earth
 * outside, ivory stucco within. Stages: footings and the tower's stump
 * with a crane, then the shells risen in scaffolding, then the tower and
 * ranges finished with the Lions court still scaffolded.
 */

const Z0 = 6;
const TOWER: Block = [0.3, 0.3, 1.3, 1.3];
const TOWER_TOP = 150;
const HALL: Block = [1.3, 0.3, 3.0, 1.05];
const VELA: Block = [3.0, 0.22, 3.8, 1.02];
const VELA_TOP = 118;
const DIVIDER: Block = [1.3, 1.05, 1.55, 3.45];
const PORTICO: Block = [0.3, 1.3, 1.3, 1.6];
const MYRTLE_FRONT: Block = [0.3, 3.45, 1.55, 3.75];
const RIGHT: Block = [3.45, 1.05, 3.75, 3.45];
const FRONT: Block = [1.55, 3.1, 3.45, 3.45];
const WEST: Block = [1.55, 1.8, 1.9, 2.35];
const EAST: Block = [3.1, 1.8, 3.45, 2.35];
const HALL_TOP = 58;
const RANGE_TOP = 40;

function lionsCourt(p: IsoPainter, s: ArchStyle, stage: number): void {
  const done = stage > WONDER_STAGES;
  patioFloor(p, 1.55, 1.05, 3.45, 3.1, Z0, { color: 0xe8e0cf, pattern: 'flags', cell: 0.27 });
  patioShade(p, 1.55, 1.05, 3.45, 3.1, Z0, 0.3, 0.35);
  if (stage >= 3) {
    // The four channels running from the galleries to the fountain.
    for (const [u0, v0, u1, v1] of [[2.47, 1.1, 2.53, 3.05], [1.6, 2.05, 3.4, 2.11]] as const) p.ground(u0, v0, u1, v1, done ? 0x5d9bb2 : 0xb9b09c, Z0);
  }
  pavilion(p, s, WEST, Z0, 46, done);
  if (stage >= 3) lionsFountain(p, 2.5, 2.08, Z0, done);
  pavilion(p, s, EAST, Z0, 46, done);
  if (stage === 3) scaffold(p, 1.6, 1.1, 3.4, 3.05, Z0, Z0 + 40);
}

function ranges(p: IsoPainter, s: ArchStyle, stage: number): void {
  const raw = stage <= 2;
  const top = (full: number) => (stage === 1 ? Z0 + 14 : full);
  tapialBlock(p, s, HALL, Z0, top(HALL_TOP), undefined, undefined, raw);
  if (!raw) {
    p.leftFace(1.55, 3.0, HALL[3], Z0, (w, h) => courtArcade(p.ctx, w, h, 6, 1), 36);
    p.leftFace(1.55, 3.0, HALL[3], Z0, (w, h) => {
      for (const x of [0.2, 0.4, 0.6, 0.8]) p.window(w * x - 3, -h + 8, 6, 9, true);
    }, HALL_TOP - Z0);
    rangeRoof(p, s, HALL, HALL_TOP);
  } else if (stage === 2) scaffold(p, ...HALL, Z0, HALL_TOP);
  // Torre de la Vela on the back-right corner, its watch bell in a belfry on top.
  const velaTop = [0, Z0 + 30, 90, VELA_TOP][stage] ?? VELA_TOP;
  tapialBlock(p, s, VELA, Z0, velaTop, { xs: [0.5], y: 30 }, { xs: [0.3, 0.7], y: 30 }, stage <= 2);
  if (stage > 2) {
    terrace(p, s, VELA, velaTop, { parapet: 5, merlons: true, color: TAPIAL });
    espadana(p, s, 3.2, 3.6, 0.62, velaTop, 36, 1);
  }
  tapialBlock(p, s, DIVIDER, Z0, top(RANGE_TOP + 4), undefined, undefined, raw);
  if (!raw) {
    p.rightFace(1.05, 3.1, DIVIDER[2], Z0, (w, h) => courtArcade(p.ctx, w, h, 6, 0.72), 34);
    rangeRoof(p, s, DIVIDER, RANGE_TOP + 4);
  }
}

function myrtleCourt(p: IsoPainter, s: ArchStyle, stage: number): void {
  const raw = stage <= 2;
  tapialBlock(p, s, PORTICO, Z0, stage === 1 ? Z0 + 14 : 46, undefined, undefined, raw);
  if (!raw) {
    p.leftFace(PORTICO[0], PORTICO[2], PORTICO[3], Z0, (w, h) => courtArcade(p.ctx, w, h, 7, 1), 46 - Z0);
    rangeRoof(p, s, PORTICO, 46);
  }
  p.ground(0.3, 1.6, 1.3, 3.45, 0xe2d8c4, Z0);
  if (stage >= 2) {
    pool(p, 0.6, 1.72, 1.0, 3.3, Z0, MARBLE);
    if (stage > 2) {
      myrtles(p, 0.42, 1.78, 0.55, 3.25, Z0);
      myrtles(p, 1.05, 1.78, 1.18, 3.25, Z0);
    }
  }
}

function front(p: IsoPainter, s: ArchStyle, team: number | null, stage: number): void {
  const raw = stage <= 2;
  const top = (full: number) => (stage === 1 ? Z0 + 14 : full);
  tapialBlock(p, s, RIGHT, Z0, top(RANGE_TOP), undefined, { xs: [0.2, 0.5, 0.8], y: 16 }, raw);
  if (!raw) rangeRoof(p, s, RIGHT, RANGE_TOP);
  tapialBlock(p, s, FRONT, Z0, top(RANGE_TOP - 4), { xs: [0.15, 0.85], y: 14 }, undefined, raw);
  tapialBlock(p, s, MYRTLE_FRONT, Z0, top(RANGE_TOP - 6), { xs: [0.3, 0.75], y: 14 }, undefined, raw);
  if (raw) return;
  rangeRoof(p, s, FRONT, RANGE_TOP - 4);
  rangeRoof(p, s, MYRTLE_FRONT, RANGE_TOP - 6);
  // Gate of the Lions court: a horseshoe arch in a stucco alfiz, the arms over it and the owner's banners.
  const ctx = p.ctx;
  p.leftFace(FRONT[0], FRONT[2], FRONT[3], Z0, (w, h) => {
    const x = w / 2 - 9;
    ctx.fillStyle = css(MARBLE);
    ctx.fillRect(x - 5, -h + 4, 28, h - 4);
    ctx.fillStyle = css(shade(TAPIAL, 0.35));
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, -16);
    ctx.arc(x + 9, -18, 9.6, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(x + 18, 0);
    ctx.fill();
    if (team === null) return;
    crest(ctx, s, w / 2, -h + 9, 4.5, team);
    for (const bx of [x - 20, x + 33]) {
      ctx.fillStyle = css(team);
      ctx.fillRect(bx, -h + 4, 7, 18);
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(bx, -h + 4, 7, 2);
    }
  }, RANGE_TOP - 4 - Z0);
}

function paintAlhambra(p: IsoPainter, s: ArchStyle, team: number | null, stage: number): void {
  const done = stage > WONDER_STAGES;
  p.footShadow();
  p.ground(0.05, 0.05, 3.95, 3.95, 0x6f8a46);
  p.box(0.15, 0.15, 3.85, 3.85, 0, Z0, { color: shade(TAPIAL, 0.85), detail: 'stone' }, 0xcfc3a8);
  const towerTop = [0, Z0 + 38, 110, TOWER_TOP][stage] ?? TOWER_TOP;
  comares(p, s, TOWER, Z0, towerTop, done ? team : null);
  if (stage === 2) scaffold(p, ...TOWER, towerTop - 40, towerTop);
  ranges(p, s, stage);
  myrtleCourt(p, s, stage);
  if (stage >= 2) lionsCourt(p, s, stage);
  front(p, s, done ? team : null, stage);
  if (!done) {
    for (const [u, v] of [[3.2, 3.6], [3.45, 3.62], [2.0, 3.65]] as const) p.box(u, v, u + 0.18, v + 0.14, Z0, Z0 + 10, { color: TAPIAL }, shade(TAPIAL, 1.1));
    crane(p, 3.7, 3.75, [0, 100, 135, 155][stage] ?? 155, 1.2, 1.0, stage === 3 ? 150 : 80);
    return;
  }
  for (const u of [0.5, 1.9, 2.6, 3.5]) cypress(p, u, 3.82, Z0, 40);
  lantern(p, 2.2, FRONT[3] + 0.02, 26, 2.2, 3.7);
  lantern(p, 2.8, FRONT[3] + 0.02, 26, 2.8, 3.7);
}

/** The Spanish Wonder (age-3 style): the Alhambra, finished in the team colour, or a construction stage. */
export function alhambra(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 210,
    paint: (p, team) => paintAlhambra(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintAlhambra(p, s, null, stage),
  };
}
