import { ellipse } from '../../canvas';
import { HW, type IsoPainter } from '../../isoPainter';
import { N_RIGHT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { shutteredDark } from '../kits/insula';
import { chimney, forgeLight, forgeMouth, goldPile, logPile, plankStack } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { cypressLine, vineRows, wheat } from './fields';
import { anvil, bifora, brickWall, lowHip, type Block } from './italianParts';

type Pt = readonly [number, number];
import { crenellatedRoof, pointedOpening, sieneseBlock, towerHouse, yardWall } from './comuneParts';
import { loggia } from './loggia';

/*
 * Italian age-2 workplaces. The tall forked towers belong to the town
 * centre, houses, barracks and the tower; the workplaces carry their
 * trade on the skyline instead: the podere's low plain dovecote among
 * wheat, vines and cypresses, the saw shed's waterwheel in its mill
 * race, the mine's timber headframe with its pulley, and the smithy's
 * lone forge stack over its crenellated roof.
 */

function farm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.ground(0.05, 0.05, 1.95, 1.95, 0x7a5a36);
  wheat(p, 0.2, 1.05, 0.95, 1.85);
  vineRows(p, 1.1, 1.05, 1.82, 1.85, 0.2);
  towerHouse(p, s, [0.16, 0.16, 0.56, 0.56], 66, { crown: 'plain', lit: 1 });
  const house: Block = [0.56, 0.22, 1.35, 0.9];
  sieneseBlock(p, s, house, 18, 40, (w) => p.door(w * 0.22, 12, 16, shade(team, 0.75)), undefined, (w) => p.window(w * 0.6, -16, 7, 10, true));
  lowHip(p, s, house, 40, 18, c.roof, 0.07);
  cypressLine(p, 1.78, 0.18, 1.8, 0.85, 3, 50);
  p.flag(1.9, 1.9, 0, 22, team);
}

/**
 * Wheel standing in the plane u = const (a mill's waterwheel, a hoist's
 * pulley): a solid rim and web, spokes, a hub and optional paddles;
 * centre (vc, zc), radius r art px.
 */
function wheel(p: IsoPainter, u: number, vc: number, zc: number, r: number, wood: number, paddles: boolean): void {
  const ctx = p.ctx;
  const rv = r / (HW * 1.118);
  const ring = (k: number): Pt[] => Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return p.p(u, vc + Math.cos(a) * rv * k, zc + Math.sin(a) * r * k);
  });
  const outer = ring(1);
  p.fillPoly(outer, css(shade(wood, R * 0.8)));
  p.normals.fill(outer, N_RIGHT);
  p.fillPoly(ring(0.84), css(shade(wood, R * 1.15)));
  ctx.strokeStyle = css(shade(wood, 0.55));
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    const [x0, y0] = p.p(u, vc + Math.cos(a) * rv * 0.84, zc + Math.sin(a) * r * 0.84);
    const [x1, y1] = p.p(u, vc - Math.cos(a) * rv * 0.84, zc - Math.sin(a) * r * 0.84);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  if (paddles) {
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const [x0, y0] = p.p(u, vc + Math.cos(a) * rv, zc + Math.sin(a) * r);
      const [x1, y1] = p.p(u, vc + Math.cos(a) * rv * 1.16, zc + Math.sin(a) * r * 1.16);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
  const [hx, hy] = p.p(u, vc, zc);
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(hx, hy, 3, 0, Math.PI * 2);
  ctx.fill();
  p.addVolumePoint(u, vc, zc + r * (paddles ? 1.16 : 1));
}

function lumberCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
  // Mill race along the saw shed's right end.
  p.ground(1.5, 0.1, 1.7, 1.9, 0x4f7f95);
  const shed: Block = [0.3, 0.2, 1.45, 0.95];
  const o = { wall: brickWall(s), trim: c.ashlar, bays: [3, 2] as const, pier: 0.05 };
  loggia(p, shed, 0, 40, 'back', o);
  plankStack(p, 0.4, 0.32, 1.35, 0.82, 22);
  loggia(p, shed, 0, 40, 'front', o);
  lowHip(p, s, shed, 40, 20, c.roof, 0.06);
  // The saw's waterwheel turning in the race.
  wheel(p, 1.58, 0.58, 30, 32, c.timber, true);
  logPile(p, 0.9, 1.65, 9);
  p.flag(0.35, 1.8, 0, 26, team);
  // Chopping block with the axe.
  const [x, y] = p.p(0.45, 1.3, 0);
  ellipse(p.ctx, x, y - 5, 6, 3);
  p.ctx.fillStyle = '#d9b07a';
  p.ctx.fill();
}

/** Timber headframe over the shaft on b: four posts with braces, a pulley wheel and a small tile roof. */
function headframe(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, top: number): void {
  const c = s.palette;
  const a = 0.035;
  const post = (u: number, v: number) => p.box(u - a, v - a, u + a, v + a, 0, top, { color: c.timber }, c.board);
  post(u0, v0);
  post(u1, v0);
  post(u0, v1);
  const ctx = p.ctx;
  ctx.strokeStyle = css(c.timber);
  ctx.lineWidth = 2;
  for (const [a0, a1] of [[p.p(u0, v1, 0), p.p(u1, v1, top * 0.6)], [p.p(u1, v1, 0), p.p(u1, v0, top * 0.6)], [p.p(u1, v1, top * 0.6), p.p(u0, v1, top)]] as const) {
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.lineTo(a1[0], a1[1]);
    ctx.stroke();
  }
  wheel(p, (u0 + u1) / 2, (v0 + v1) / 2, top - 12, 11, c.darkWood, false);
  post(u1, v1);
  p.box(u0 - a, v0 - a, u1 + a, v1 + a, top, top + 5, { color: c.timber }, c.board);
  lowHip(p, s, [u0, v0, u1, v1], top + 5, 16, c.roof, 0.06);
}

function miningCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
  p.ground(0.2, 0.2, 0.58, 0.58, 0x2a221c);
  headframe(p, s, [0.18, 0.18, 0.6, 0.6], 82);
  const house: Block = [0.6, 0.2, 1.45, 1.0];
  sieneseBlock(p, s, house, 22, 44, (w) => {
    pointedOpening(ctx, w * 0.15, 16, 18, c.ashlar, 1);
    pointedOpening(ctx, w * 0.6, 16, 18, c.ashlar, 1);
  }, undefined, undefined, (w) => shutteredDark(ctx, w * 0.4, -16, 8, 9, c.shutter, R));
  crenellatedRoof(p, s, house, 44);
  yardWall(p, s, 'v', 1.15, 1.8, 1.82, 14);
  goldPile(p, 1.3, 1.5);
  p.box(0.6, 1.35, 1.05, 1.65, 5, 18, { color: 0x6b4a2a, detail: 'planks' });
  p.flag(0.3, 1.85, 0, 26, team);
}

function blacksmith(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
  const b: Block = [0.3, 0.3, 1.7, 1.45];
  sieneseBlock(p, s, b, 26, 52, (w) => {
    forgeMouth(p, w * 0.4, 26, 22);
    p.door(w * 0.1, 12, 18, shade(team, 0.75));
  }, undefined, (w) => bifora(p, c.ashlar, w * 0.3, -22, 11, 14, 1), (w) => bifora(p, c.ashlar, w * 0.4, -22, 11, 14, R, false));
  // The forge stack alone over the crenellated roof.
  crenellatedRoof(p, s, b, 52, () => chimney(p, 1.1, 0.4, 1.42, 0.72, 52, 132, brickWall(s)));
  forgeLight(p, 0.9, 1.6);
  anvil(p, 1.3, 1.72);
  p.flag(1.85, 1.85, 0, 26, team);
}

/** The Italian age-2 workplaces. */
export function comuneWorkArt(s: ArchStyle): AgeArtSet {
  return {
    farm: { size: 2, maxHeight: 140, paint: (p, team) => farm(p, s, team) },
    lumber_camp: { size: 2, maxHeight: 140, paint: (p, team) => lumberCamp(p, s, team) },
    mining_camp: { size: 2, maxHeight: 140, paint: (p, team) => miningCamp(p, s, team) },
    blacksmith: { size: 2, maxHeight: 140, paint: (p, team) => blacksmith(p, s, team) },
  };
}
