import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { archedOpening, crest, R } from '../facade';
import { dummy } from '../families/familyParts';
import { drumOpening, drumWall } from '../kits/drum';
import { shutteredDark, stringCourse } from '../kits/insula';
import { target, torch } from '../parts';
import { helm } from '../roofs';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { banner, block, brickWall, cypress, lowHip, stuccoWall } from './italianParts';
import { loggia } from './loggia';

/*
 * Italian age-1 military buildings: the barracks behind a Roman city
 * gate (after the Porta Palatina, two sixteen-sided brick towers and a
 * two-tier arched gallery), the archery range under an open arcaded
 * portico, and the stable whose yard opens through a four-way arch
 * (after the Arch of Janus).
 */

/** Polygonal brick gate tower with two tiers of arched windows and a low tile cone. */
function gateTower(p: IsoPainter, s: ArchStyle, u: number, v: number, r: number, h: number): void {
  const c = s.palette;
  drumWall(p, u, v, r, 0, h, c.brick, 'brick');
  helm(p, u, v, h - 40, [[0, r + 0.015], [2.5, r + 0.015]], c.ashlar, false);
  for (const z of [h - 34, h - 16]) {
    for (const phi of [Math.PI / 4 - 0.75, Math.PI / 4, Math.PI / 4 + 0.75]) drumOpening(p, u, v, r, phi, 3.2, z, 11, c.ashlar, 'dark');
  }
  helm(p, u, v, h, [[0, r + 0.04], [3, r + 0.04], [4, r + 0.07], [9, r - 0.06], [17, r * 0.5], [24, 0.03]], c.roof, false);
}

function barracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa89c84);
  gateTower(p, s, 0.62, 0.88, 0.38, 112);
  const gate = [0.62, 0.48, 2.38, 1.28] as const;
  block(p, gate, 0, 84, brickWall(s), (w) => {
    for (const x of [0.16, 0.58]) archedOpening(ctx, w * x, w * 0.26, 38, c.ashlar, 0x1f150e, 1);
    for (const x of [0.12, 0.84]) banner(ctx, w * x - 4, -38, 8, 18, team, 1);
    crest(ctx, s, w * 0.5, -32, 5.5, team);
    for (const [k, y] of [[0, 44], [1, 64]] as const) {
      stringCourse(ctx, w, y - 2, c.ashlar, 1, 3);
      for (let i = 0; i < 6; i++) {
        const x = ((i + 0.5) * w) / 6 - 4;
        if (k === 0 && i % 2 === 0) p.window(x, -y - 15, 8, 13, true);
        else archedOpening(ctx, x, 8, 13, c.ashlar, 0x2a1d14, 1);
      }
    }
  }, (w) => {
    stringCourse(ctx, w, 42, c.ashlar, R, 3);
    shutteredDark(ctx, w * 0.42, -60, 9, 12, c.shutter, R);
  });
  lowHip(p, s, gate, 84, 18, c.roof, 0.06);
  gateTower(p, s, 2.38, 0.88, 0.38, 112);
  // Training yard behind a low brick wall.
  p.box(0.25, 2.78, 2.75, 2.86, 0, 12, brickWall(s), c.ashlar);
  p.box(2.75, 1.55, 2.83, 2.86, 0, 12, brickWall(s), c.ashlar);
  for (const u of [0.8, 1.5, 2.2]) dummy(p, u, 2.1);
  torch(p, 1.2, 1.3, 40, 1.2, 1.6);
  torch(p, 1.8, 1.3, 40, 1.8, 1.6);
  p.flag(2.8, 2.8, 12, 36, team, true);
}

function archeryRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
  p.ground(0.22, 0.22, 1.78, 1.13, 0xc2b494);
  const b = [0.3, 0.3, 1.7, 1.05] as const;
  const o = { wall: brickWall(s), trim: c.ashlar, bays: [4, 2] as const, pier: 0.05 };
  loggia(p, b, 0, 44, 'back', o);
  for (const u of [0.6, 1.0, 1.4]) p.box(u - 0.12, 0.55, u + 0.12, 0.62, 0, 7, { color: c.timber }, c.board);
  loggia(p, b, 0, 44, 'front', o);
  lowHip(p, s, b, 44, 22, c.roof, 0.06);
  for (const [u, v] of [[2.5, 0.6], [2.5, 1.4], [2.5, 2.2]] as const) target(p, u, v);
  cypress(p, 2.75, 0.25, 0, 50);
  cypress(p, 2.78, 2.75, 0, 44);
  p.flag(0.4, 2.6, 0, 36, team, true);
}

function stable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa3946a);
  // Columbarium tower at the hall's far end.
  const tower = [2.25, 0.22, 2.72, 0.69] as const;
  block(p, tower, 0, 96, stuccoWall(s), (w) => holes(p, w, 1), (w) => holes(p, w, R));
  lowHip(p, s, tower, 96, 24, c.roof, 0.07);
  const hall = [0.3, 0.3, 2.25, 1.45] as const;
  block(p, hall, 0, 34, brickWall(s), (w) => {
    for (let i = 0; i < 5; i++) archedOpening(ctx, 10 + i * (w - 20) / 5, 18, 26, c.ashlar, 0x2a1b10, 1);
  }, (w) => archedOpening(ctx, w * 0.35, 18, 26, c.ashlar, 0x2a1b10, R));
  block(p, hall, 34, 56, stuccoWall(s), (w) => {
    stringCourse(ctx, w, 0, c.ashlar, 1);
    for (let i = 0; i < 5; i++) shutteredDark(ctx, 14 + i * (w - 20) / 5, -18, 10, 9, c.shutter, 1);
  }, (w) => stringCourse(ctx, w, 0, c.ashlar, R));
  lowHip(p, s, hall, 56, 24, c.roof, 0.07);
  // Four-way arch into the yard, its attic bearing the arms.
  const arch = [1.55, 1.9, 2.4, 2.75] as const;
  const o = { wall: { color: c.ashlar, detail: 'stone' as const }, trim: c.trim, bays: [1, 1] as const, pier: 0.11, band: 4 };
  loggia(p, arch, 0, 56, 'back', o);
  loggia(p, arch, 0, 56, 'front', o);
  block(p, [arch[0] - 0.04, arch[1] - 0.04, arch[2] + 0.04, arch[3] + 0.04], 56, 76, { color: c.ashlar, detail: 'stone' }, (w) => crest(ctx, s, w / 2, -8, 4.5, team), undefined, shade(c.ashlar, 1.05));
  // Trough and hay.
  p.box(0.5, 1.75, 1.2, 1.9, 0, 8, { color: c.ashlar }, 0x4f7f95);
  for (const u of [0.55, 0.9]) p.box(u, 2.3, u + 0.3, 2.6, 0, 13, { color: 0xd9b55a }, 0xe8c873);
  p.flag(0.35, 2.75, 0, 34, team);
}

/** Nest holes in rows near the top of a dovecote face (face-local). */
function holes(p: IsoPainter, w: number, light: number): void {
  p.ctx.fillStyle = css(shade(0x2a1d14, light));
  for (let r = 0; r < 3; r++) for (let x = 4 + (r % 2) * 3; x < w - 3; x += 6) p.ctx.fillRect(x, -88 + r * 5, 2.4, 2.4);
}

/** The Italian age-1 military buildings. */
export function etruriaMilArt(s: ArchStyle): AgeArtSet {
  return {
    barracks: { size: 3, maxHeight: 160, paint: (p, team) => barracks(p, s, team) },
    archery_range: { size: 3, maxHeight: 110, paint: (p, team) => archeryRange(p, s, team) },
    stable: { size: 3, maxHeight: 150, paint: (p, team) => stable(p, s, team) },
  };
}
