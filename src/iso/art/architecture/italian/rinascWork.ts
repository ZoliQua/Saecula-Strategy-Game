import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { R } from '../facade';
import { shutteredDark } from '../kits/insula';
import { forgeLight, forgeMouth, goldPile, logPile, plankStack } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { cypressLine, oliveRows, vineRows } from './fields';
import { anvil, block, cornicione, cupola, lowHip, rustication, type Block } from './italianParts';
import { loggia } from './loggia';
import { colombaia, fumaiolo, openTop, palazzo, whiteWall } from './rinascParts';

/*
 * Italian age-3 workplaces: the Tuscan casa colonica with its dovecote
 * tower rising from the middle of the roof among olives, vines and
 * cypresses; the Palladian barchessa (an arcaded farm wing) storing the
 * timber beside its dovecote; the mine's corniced ore house with a
 * small domed winding house; the smithy with a flared Venetian chimney.
 */

function farm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.ground(0.05, 0.05, 1.95, 1.95, 0x7d6a42);
  oliveRows(p, 1.65, 0.25, 1.75, 0.75, 0.45);
  const house: Block = [0.25, 0.25, 1.4, 1.0];
  block(p, house, 0, 44, whiteWall(s), (w) => {
    p.door(w * 0.2, 12, 17, shade(team, 0.75));
    for (const x of [0.5, 0.78]) p.window(w * x, -36, 7, 10, true);
    for (const x of [0.5, 0.78]) shutteredDark(p.ctx, w * x, -16, 7, 9, c.shutter, 1);
  }, (w) => shutteredDark(p.ctx, w * 0.4, -34, 7, 9, c.shutter, R));
  cornicione(p, house, 44, 4, 0.05, c.trim);
  lowHip(p, s, house, 48, 16, c.roof, 0.03);
  // The dovecote tower out of the middle of the roof.
  const tower: Block = [0.62, 0.42, 1.02, 0.82];
  block(p, tower, 50, 74, whiteWall(s));
  openTop(p, s, tower, 74, 92, [2, 2], whiteWall(s));
  vineRows(p, 0.25, 1.25, 1.7, 1.85, 0.2);
  cypressLine(p, 1.82, 0.2, 1.82, 1.2, 4, 54);
  p.flag(0.15, 1.9, 0, 22, team);
}

function lumberCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
  colombaia(p, s, [0.16, 0.18, 0.56, 0.58], 64);
  const wing: Block = [0.56, 0.24, 1.82, 0.88];
  const o = { wall: whiteWall(s), trim: c.trim, bays: [4, 2] as const, pier: 0.045 };
  loggia(p, wing, 0, 42, 'back', o);
  plankStack(p, 0.66, 0.34, 1.7, 0.78, 22);
  loggia(p, wing, 0, 42, 'front', o);
  cornicione(p, wing, 42, 4, 0.04, c.trim);
  lowHip(p, s, wing, 46, 18, c.roof, 0.03);
  logPile(p, 1.2, 1.7, 9);
  p.flag(0.35, 1.8, 0, 26, team);
}

function miningCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
  // Winding house under a small dome.
  const wind: Block = [1.25, 0.2, 1.78, 0.73];
  block(p, wind, 0, 46, whiteWall(s), (w) => shutteredDark(ctx, w * 0.35, -30, 8, 10, c.shutter, 1));
  cornicione(p, wind, 46, 4, 0.04, c.trim);
  cupola(p, (wind[0] + wind[2]) / 2, (wind[1] + wind[3]) / 2, 50, 0.3, 16, c.plaster, c.metal, c.trim);
  const house: Block = [0.22, 0.25, 1.22, 1.1];
  block(p, house, 0, 46, { color: c.stone }, (w, h) => {
    rustication(ctx, w, 0, h, c.stone, 1, 8);
    for (const x of [0.15, 0.6]) {
      ctx.fillStyle = '#21160e';
      ctx.beginPath();
      ctx.moveTo(w * x, 0);
      ctx.lineTo(w * x, -18);
      ctx.arc(w * x + 9, -18, 9, Math.PI, 0);
      ctx.lineTo(w * x + 18, 0);
      ctx.fill();
    }
  }, (w, h) => rustication(ctx, w, 0, h, c.stone, R, 8), c.stone);
  cornicione(p, house, 46, 5, 0.05, shade(c.ashlar, 1.05));
  lowHip(p, s, house, 51, 16, c.roof, 0.03);
  p.box(0.95, 1.38, 1.5, 1.72, 5, 19, { color: 0x6b4a2a, detail: 'planks' });
  goldPile(p, 1.3, 1.55);
  p.flag(1.85, 1.85, 0, 26, team);
}

function blacksmith(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
  const b: Block = [0.3, 0.3, 1.7, 1.45];
  const top = palazzo(p, s, b, {
    ground: 28, storey: 24, storeys: 1, finish: 'white', bays: [2, 2],
    groundLeft: (w) => {
      forgeMouth(p, w * 0.4, 26, 22);
      p.door(w * 0.1, 12, 18, shade(team, 0.75));
    },
  }, false);
  fumaiolo(p, s, 1.28, 0.5, top - 6, top + 34);
  lowHip(p, s, b, top, 16, c.roof, 0.05);
  fumaiolo(p, s, 0.55, 1.2, top - 2, top + 22);
  forgeLight(p, 1.0, 1.6);
  anvil(p, 1.3, 1.72);
  p.flag(1.85, 1.85, 0, 26, team);
}

/** The Italian age-3 workplaces. */
export function rinascWorkArt(s: ArchStyle): AgeArtSet {
  return {
    farm: { size: 2, maxHeight: 140, paint: (p, team) => farm(p, s, team) },
    lumber_camp: { size: 2, maxHeight: 140, paint: (p, team) => lumberCamp(p, s, team) },
    mining_camp: { size: 2, maxHeight: 160, paint: (p, team) => miningCamp(p, s, team) },
    blacksmith: { size: 2, maxHeight: 140, paint: (p, team) => blacksmith(p, s, team) },
  };
}
