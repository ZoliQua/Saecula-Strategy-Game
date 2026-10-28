import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { R } from '../facade';
import { shutteredDark } from '../kits/insula';
import { chimney, forgeLight, forgeMouth, goldPile, logPile, plankStack } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { cypressLine, vineRows, wheat } from './fields';
import { bifora, brickWall, cypress, type Block } from './italianParts';
import { crenellatedRoof, lowHip, pointedOpening, sieneseBlock, towerHouse, yardWall } from './comuneParts';
import { loggia } from './loggia';

/*
 * Italian age-2 workplaces: every yard keeps a brick tower with a
 * forked crown on its back corner, so a Comune town reads as a skyline
 * of towers. The farm is a walled podere with wheat, vines and
 * cypresses; the timber yard stores its logs under a brick loggia; the
 * mine's ore house sits behind a swallowtail wall; the smithy has a flat
 * crenellated roof and a tall stack.
 */

function farm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.ground(0.05, 0.05, 1.95, 1.95, 0x7a5a36);
  wheat(p, 0.2, 1.05, 0.95, 1.85);
  vineRows(p, 1.1, 1.05, 1.82, 1.85, 0.2);
  towerHouse(p, s, [0.16, 0.16, 0.56, 0.56], 92, { crown: 'swallowtail', lit: 1 });
  const house: Block = [0.56, 0.22, 1.35, 0.9];
  sieneseBlock(p, s, house, 18, 40, (w) => p.door(w * 0.22, 12, 16, shade(team, 0.75)), undefined, (w) => p.window(w * 0.6, -16, 7, 10, true));
  lowHip(p, s, house, 40, 18, c.roof, 0.07);
  cypressLine(p, 1.78, 0.18, 1.8, 0.85, 3, 50);
  p.flag(1.9, 1.9, 0, 22, team);
}

function lumberCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
  towerHouse(p, s, [0.14, 0.14, 0.52, 0.52], 96, { crown: 'swallowtail', lit: 0 });
  const shed: Block = [0.52, 0.2, 1.62, 0.95];
  const o = { wall: brickWall(s), trim: c.ashlar, bays: [3, 2] as const, pier: 0.05 };
  loggia(p, shed, 0, 40, 'back', o);
  plankStack(p, 0.62, 0.32, 1.5, 0.82, 22);
  loggia(p, shed, 0, 40, 'front', o);
  lowHip(p, s, shed, 40, 20, c.roof, 0.06);
  logPile(p, 1.2, 1.7, 9);
  cypress(p, 1.8, 0.3, 0, 46);
  p.flag(0.35, 1.8, 0, 26, team);
  // Chopping block with the axe.
  const [x, y] = p.p(0.7, 1.35, 0);
  ellipse(p.ctx, x, y - 5, 6, 3);
  p.ctx.fillStyle = '#d9b07a';
  p.ctx.fill();
}

function miningCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
  towerHouse(p, s, [0.14, 0.14, 0.5, 0.5], 90, { crown: 'swallowtail', lit: 0 });
  const house: Block = [0.5, 0.2, 1.4, 1.0];
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
  towerHouse(p, s, [0.14, 0.18, 0.54, 0.58], 100, { crown: 'swallowtail', lit: 0 });
  const b: Block = [0.54, 0.3, 1.75, 1.5];
  sieneseBlock(p, s, b, 26, 52, (w) => {
    forgeMouth(p, w * 0.4, 26, 22);
    p.door(w * 0.1, 12, 18, shade(team, 0.75));
  }, undefined, (w) => bifora(p, c.ashlar, w * 0.3, -22, 11, 14, 1), (w) => bifora(p, c.ashlar, w * 0.4, -22, 11, 14, R, false));
  crenellatedRoof(p, s, b, 52, () => chimney(p, 1.3, 0.4, 1.56, 0.66, 52, 112, brickWall(s)));
  forgeLight(p, 1.0, 1.6);
  const [x, y] = p.p(1.3, 1.72, 0);
  p.ctx.fillStyle = '#3a3a40';
  p.ctx.fillRect(x - 8, y - 9, 16, 4);
  p.ctx.fillRect(x - 3, y - 6, 6, 6);
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
