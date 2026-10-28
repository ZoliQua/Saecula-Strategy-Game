import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { dummy } from '../families/familyParts';
import { shutteredDark } from '../kits/insula';
import { target, torch } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { balustrade } from '../wonderParts';
import { banner, block, cornicione, cupola, cypress, lowHip, type Block } from './italianParts';
import { loggia } from './loggia';
import { colombaia, palazzo, whiteWall } from './rinascParts';

/*
 * Italian age-3 military buildings: the barracks as a rusticated
 * palazzo with a domed chapel lantern on its roof, the archery range
 * under a white arcaded loggia with a balustraded roof, and the stable
 * as a long corniced range with a cupola on its ridge and a dovecote
 * tower at its end (after Palladio's farm wings).
 */

function barracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xb2a586);
  const b: Block = [0.35, 0.3, 2.65, 1.5];
  const top = palazzo(p, s, b, {
    ground: 28, storey: 26, storeys: 2, finish: 'ashlar', bays: [5, 3], lit: 3,
    groundLeft: (w) => {
      ctx.fillStyle = css(shade(c.trim, 1));
      ctx.fillRect(w / 2 - 13, -26, 26, 26);
      p.door(w / 2 - 10, 20, 23, shade(team, 0.7));
    },
    nobileLeft: (w, h) => {
      crest(ctx, s, w / 2, -h + 44, 6, team);
      banner(ctx, w * 0.2, -h + 30, 7, 20, team, 1);
      banner(ctx, w * 0.8 - 7, -h + 30, 7, 20, team, 1);
    },
  });
  cupola(p, 1.5, 0.9, top + 2, 0.42, 24, c.plaster, c.metal, c.trim);
  for (const u of [0.9, 1.6, 2.3]) dummy(p, u, 2.25);
  torch(p, 1.2, 1.55, 30, 1.2, 1.9);
  torch(p, 1.8, 1.55, 30, 1.8, 1.9);
  p.flag(2.8, 2.8, 0, 38, team, true);
}

function archeryRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
  const b: Block = [0.3, 0.3, 1.75, 1.1];
  p.ground(b[0] - 0.05, b[1] - 0.05, b[2] + 0.05, b[3] + 0.05, 0xcdbf9f);
  const o = { wall: whiteWall(s), trim: c.trim, bays: [4, 2] as const, pier: 0.05 };
  loggia(p, b, 0, 44, 'back', o);
  loggia(p, b, 0, 44, 'front', o);
  cornicione(p, b, 44, 5, 0.04, c.trim);
  p.ground(b[0], b[1], b[2], b[3], 0xb7aa8c, 49);
  balustrade(p, b[0], b[1], b[2], b[3], 49);
  for (const [u, v] of [[2.5, 0.6], [2.5, 1.4], [2.5, 2.2]] as const) target(p, u, v);
  cypress(p, 2.75, 0.25, 0, 52);
  cypress(p, 0.35, 2.7, 0, 46);
  p.flag(0.6, 1.6, 0, 36, team, true);
}

function stable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa3946a);
  const hall: Block = [0.3, 0.3, 2.25, 1.35];
  block(p, hall, 0, 46, whiteWall(s), (w) => {
    for (let i = 0; i < 5; i++) {
      const x = 8 + i * (w - 16) / 5;
      ctx.fillStyle = css(c.trim);
      ctx.fillRect(x - 2, -30, 20, 30);
      ctx.fillStyle = css(c.doors.gate);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, -20);
      ctx.arc(x + 8, -20, 8, Math.PI, 0);
      ctx.lineTo(x + 16, 0);
      ctx.fill();
    }
  }, (w) => shutteredDark(ctx, w * 0.4, -36, 9, 10, c.shutter, R));
  cornicione(p, hall, 46, 5, 0.05, c.trim);
  lowHip(p, s, hall, 51, 20, c.roof, 0.04);
  cupola(p, 1.27, 0.82, 51 + 20 * s.roof.pitch - 3, 0.16, 8, c.plaster, c.metal, c.trim);
  colombaia(p, s, [2.25, 0.3, 2.72, 0.77], 70);
  for (const u of [0.6, 0.95]) p.box(u, 1.75, u + 0.3, 2.05, 0, 13, { color: 0xd9b55a }, 0xe8c873);
  p.box(1.4, 1.7, 2.2, 1.85, 0, 8, { color: c.ashlar }, 0x4f7f95);
  p.flag(2.8, 2.8, 0, 34, team);
}

/** The Italian age-3 military buildings. */
export function rinascMilArt(s: ArchStyle): AgeArtSet {
  return {
    barracks: { size: 3, maxHeight: 190, paint: (p, team) => barracks(p, s, team) },
    archery_range: { size: 3, maxHeight: 120, paint: (p, team) => archeryRange(p, s, team) },
    stable: { size: 3, maxHeight: 150, paint: (p, team) => stable(p, s, team) },
  };
}
