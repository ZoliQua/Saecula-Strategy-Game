import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { crest, R } from '../facade';
import { dummy } from '../families/familyParts';
import { shutteredDark } from '../kits/insula';
import { target, torch } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { banner, bifora, brickWall, cypress, lowHip, type Block } from './italianParts';
import { crenellatedRoof, pointedOpening, sieneseBlock, towerHouse, yardWall } from './comuneParts';
import { loggia } from './loggia';

/*
 * Italian age-2 military buildings: the barracks as a Palazzo del
 * Capitano (a crenellated brick palace with its tall corner tower), the
 * archery range under a brick loggia behind a swallowtail wall, and the
 * stable in a walled yard entered under a gate tower.
 */

function barracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa89c84);
  towerHouse(p, s, [0.25, 0.25, 0.85, 0.85], 150, { crown: 'swallowtail', lit: 1 });
  const hall: Block = [0.85, 0.3, 2.65, 1.55];
  sieneseBlock(p, s, hall, 26, 74, (w) => {
    pointedOpening(ctx, w * 0.4, 22, 26, c.ashlar, 1, shade(team, 0.55));
    for (const x of [0.12, 0.78]) pointedOpening(ctx, w * x, 12, 16, c.ashlar, 1);
  }, (w) => pointedOpening(ctx, w * 0.4, 12, 16, c.ashlar, R), (w) => {
    for (const x of [0.15, 0.45, 0.75]) bifora(p, c.ashlar, w * x, -32, 11, 14, 1, x !== 0.45);
    crest(ctx, s, w * 0.5 + 5, -12, 5, team);
    banner(ctx, w * 0.3, -46, 7, 18, team, 1);
    banner(ctx, w * 0.66, -46, 7, 18, team, 1);
  }, (w) => {
    bifora(p, c.ashlar, w * 0.25, -32, 11, 14, R, false);
    shutteredDark(ctx, w * 0.65, -30, 9, 12, c.shutter, R);
  });
  crenellatedRoof(p, s, hall, 74);
  for (const u of [0.9, 1.6, 2.3]) dummy(p, u, 2.2);
  yardWall(p, s, 'u', 0.25, 2.75, 2.75, 14);
  torch(p, 1.4, 1.58, 30, 1.4, 1.9);
  p.flag(2.8, 2.8, 14, 34, team, true);
}

function archeryRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
  yardWall(p, s, 'u', 0.2, 2.8, 0.16, 18);
  yardWall(p, s, 'v', 0.22, 2.8, 0.16, 18);
  towerHouse(p, s, [2.3, 0.22, 2.74, 0.66], 80, { crown: 'plain', lit: 0, team });
  const b: Block = [0.35, 0.35, 1.75, 1.1];
  const o = { wall: brickWall(s), trim: c.ashlar, bays: [4, 2] as const, pier: 0.05 };
  loggia(p, b, 0, 42, 'back', o);
  loggia(p, b, 0, 42, 'front', o);
  lowHip(p, s, b, 42, 20, c.roof, 0.06);
  for (const [u, v] of [[2.5, 0.7], [2.5, 1.5], [2.5, 2.3]] as const) target(p, u, v);
  cypress(p, 0.5, 2.6, 0, 44);
  p.flag(0.45, 1.6, 0, 36, team, true);
}

function stable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa3946a);
  const hall: Block = [0.3, 0.3, 2.7, 1.4];
  sieneseBlock(p, s, hall, 30, 50, (w) => {
    for (let i = 0; i < 5; i++) pointedOpening(ctx, 10 + i * (w - 20) / 5, 16, 24, c.ashlar, 1, c.doors.gate);
  }, (w) => pointedOpening(ctx, w * 0.4, 16, 24, c.ashlar, R, c.doors.gate), (w) => {
    for (let i = 0; i < 5; i++) shutteredDark(ctx, 14 + i * (w - 20) / 5, -15, 10, 9, c.shutter, 1);
  });
  lowHip(p, s, hall, 50, 24, c.roof, 0.07);
  // Walled yard entered under a gate tower.
  yardWall(p, s, 'v', 1.4, 2.8, 0.25, 16);
  for (const u of [0.55, 0.9]) p.box(u, 1.7, u + 0.3, 2.0, 0, 13, { color: 0xd9b55a }, 0xe8c873);
  p.box(1.3, 1.65, 2.1, 1.8, 0, 8, { color: c.ashlar }, 0x4f7f95);
  yardWall(p, s, 'u', 0.25, 1.9, 2.78, 16);
  towerHouse(p, s, [1.9, 2.4, 2.42, 2.92], 92, { crown: 'swallowtail', lit: 0, team });
  yardWall(p, s, 'v', 1.4, 2.42, 2.72, 16);
  p.flag(0.35, 2.75, 16, 30, team);
}

/** The Italian age-2 military buildings. */
export function comuneMilArt(s: ArchStyle): AgeArtSet {
  return {
    barracks: { size: 3, maxHeight: 190, paint: (p, team) => barracks(p, s, team) },
    archery_range: { size: 3, maxHeight: 160, paint: (p, team) => archeryRange(p, s, team) },
    stable: { size: 3, maxHeight: 170, paint: (p, team) => stable(p, s, team) },
  };
}
