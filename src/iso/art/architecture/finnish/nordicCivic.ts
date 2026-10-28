import type { IsoPainter } from '../../isoPainter';
import { N_LEFT } from '../../lighting/viewSpace';
import { css, shade } from '../../palette';
import { cornice, crest, pilasters, R } from '../facade';
import { mansardRoof } from '../roofs';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { belfry } from './nordicBelfry';
import { aitta, boulders, flagstaff, footing, kota, mainRoof, nDoor, nordic, nWindow, roundShield, wallBlock, type Block } from './nordicParts';

/*
 * Finnish town centres by age:
 * - a longhouse hall of grey logs under a long turf roof, with a bark
 *   kota and a storehouse on stilts in its yard (age 1);
 * - a grey granite castle hall under a steep shingle roof with a square
 *   corner tower, and beside it the wooden bell tower (age 2);
 * - a yellow-ochre Gustavian manor (kartano) under a broken hipped
 *   roof with a pedimented frontispiece, between two falu-red wings (age 3).
 */

function paintLonghouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const hall: Block = [0.3, 1.0, 2.7, 2.12];
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x857858);
  kota(p, 0.72, 0.6, 0.3, 66, c.roofAlt);
  aitta(p, s, [1.75, 0.22, 2.3, 0.68], 'v', 13);
  boulders(p, s, 0.15, 2.4, 1.0, 2.85, 5, 4);
  const z0 = footing(p, s, hall, 5);
  wallBlock(p, s, hall, z0, z0 + 32, (w, h) => {
    for (const x of [0.16, 0.44]) nWindow(p, s, w * x, -h + 11, 7, 6, 1);
    nDoor(p, s, w * 0.68, 13, 22, c.doors.main, 1);
    for (const x of [0.06, 0.3, 0.56, 0.86]) roundShield(p, w * x + 6, -h + 7, 4.2, team, 1);
  }, (w, h) => {
    crest(p.ctx, s, w / 2, -h * 0.5, 8, team);
  });
  const ridge = mainRoof(p, s, hall, z0 + 32, 'u', { scale: 1.15 });
  for (const u of [0.9, 2.0]) p.addSmoke(u, 1.56, ridge);
  flagstaff(p, 2.78, 2.78, 0, 74, team);
}

function paintCastle(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const keep: Block = [0.38, 0.55, 2.02, 1.6];
  const corner: Block = [0.26, 0.2, 0.82, 0.76];
  const granite = { color: c.ashlar, detail: 'stone' as const };
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x8a8478);
  // Corner tower behind the hall.
  p.box(...corner, 0, 162, granite, c.ashlar);
  p.leftFace(corner[0], corner[2], corner[3], 0, (w, h) => {
    p.ctx.fillStyle = '#1a1612';
    p.ctx.fillRect(w / 2 - 2, -h + 14, 4, 11);
  }, 162);
  const prev = p.material;
  p.material = 'shingle';
  p.hipRoof(...corner, 162, 52, c.roof, 0.06);
  p.material = prev;
  flagstaff(p, 0.54, 0.48, 212, 26, team);
  // The granite hall.
  p.box(...keep, 0, 90, granite, c.ashlar);
  p.leftFace(keep[0], keep[2], keep[3], 0, (w, h) => {
    for (const x of [0.12, 0.3, 0.48]) {
      nWindow(p, s, w * x, -h + 22, 7, 13, 1);
      p.ctx.fillStyle = '#1a1612';
      p.ctx.fillRect(w * x + 2, -h + 56, 3, 9);
    }
    crest(p.ctx, s, w * 0.66, -h + 30, 9, team);
    nDoor(p, s, w * 0.62, 15, 26, c.doors.gate, 1);
  }, 90);
  p.rightFace(keep[1], keep[3], keep[2], 0, (w, h) => {
    nWindow(p, s, w * 0.68, -h + 22, 7, 13, R);
    nWindow(p, s, w * 0.3, -h + 22, 7, 13, R, false);
  }, 90);
  p.material = 'shingle';
  // Steep saddle roof, the gable in granite.
  p.gableRoof(...keep, 90, 74, c.roof, c.ashlar, 'u', 0.06, (w, rise) => {
    p.ctx.fillStyle = css(shade(c.ashlar, R * 0.7), 0.6);
    for (let y = 9; y < rise; y += 9) p.ctx.fillRect(0, -y, w, 0.9);
    p.ctx.fillStyle = '#1a1612';
    p.ctx.fillRect(w / 2 - 2, -rise * 0.45, 4, 9);
  });
  p.material = prev;
  // The bell tower stands apart in the yard.
  belfry(p, s, [2.18, 1.98, 2.72, 2.52], 0, {
    lower: 58,
    upper: 30,
    face: (w) => nDoor(p, s, w / 2 - 5, 10, 20, c.doors.main, 1),
  });
  boulders(p, s, 0.2, 2.3, 1.4, 2.85, 6, 4.5);
}

/** The manor's frontispiece: a shallow projection with a pediment over the door, the crest in its tympanum. */
function frontispiece(p: IsoPainter, s: ArchStyle, u0: number, u1: number, v: number, h: number, team: number): void {
  const c = s.palette;
  const d = 0.08;
  p.box(u0, v - 0.02, u1, v + d, 0, h, { color: c.plaster }, c.plaster);
  p.leftFace(u0, u1, v + d, 0, (w, fh) => {
    pilasters(p.ctx, fh, [3, w - 3], c.trim, 5);
    nDoor(p, s, w / 2 - 7, 14, 26, c.doors.main, 1);
    nWindow(p, s, w / 2 - 5, -fh + 12, 10, 14, 1);
  }, h);
  // Pediment.
  const a = p.p(u0 - 0.02, v + d, h);
  const b = p.p(u1 + 0.02, v + d, h);
  const apex = p.p((u0 + u1) / 2, v + d, h + 20);
  p.fillPoly([a, b, apex], css(c.plaster));
  p.normals.fill([a, b, apex], N_LEFT);
  p.strokePoly([a, b, apex], css(shade(c.trim, 1)), 2);
  p.leftFace(u0, u1, v + d, h, (w) => crest(p.ctx, s, w / 2, -7, 5.5, team), 20);
  p.addVolumePoint((u0 + u1) / 2, v + d, h + 20);
}

/** A falu-red wing (flygel) with its gambrel gable to the court. */
function wing(p: IsoPainter, s: ArchStyle, b: Block): void {
  const z0 = footing(p, s, b, 5);
  wallBlock(p, s, b, z0, z0 + 26, (w, h) => nWindow(p, s, w / 2 - 4, -h + 10, 8, 10, 1, false), (w, h) => {
    for (const x of [0.25, 0.65]) nWindow(p, s, w * x, -h + 10, 8, 10, R, false);
  });
  mainRoof(p, s, b, z0 + 26, 'v', { scale: 0.95 });
}

function paintManor(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const main: Block = [0.5, 0.5, 2.5, 1.45];
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x9a8d6c);
  // Sanded court in front of the manor.
  p.ground(0.95, 1.5, 2.05, 2.9, 0xc8b68e);
  const H = 58;
  footing(p, s, main, 4);
  p.box(main[0], main[1], main[2], main[3], 4, H, { color: c.plaster, detail: 'plaster' }, c.plaster);
  p.leftFace(main[0], main[2], main[3], 4, (w, h) => {
    pilasters(p.ctx, h, [3, w - 3], c.trim, 6);
    cornice(p.ctx, w, h - 6, c.trim, 1, 5);
    cornice(p.ctx, w, h * 0.5, c.trim, 1, 3);
    for (const x of [0.09, 0.23, 0.77, 0.91]) {
      nWindow(p, s, w * x - 4, -h + 12, 8, 12, 1);
      nWindow(p, s, w * x - 4, -h * 0.5 + 8, 8, 13, 1, x < 0.5);
    }
  }, H - 4);
  p.rightFace(main[1], main[3], main[2], 4, (w, h) => {
    pilasters(p.ctx, h, [3, w - 3], c.trim, 6, R);
    cornice(p.ctx, w, h - 6, c.trim, R, 5);
    for (const x of [0.3, 0.62]) nWindow(p, s, w * x, -h + 12, 8, 12, R, false);
  }, H - 4);
  frontispiece(p, s, 1.24, 1.76, main[3], H, team);
  const prev = p.material;
  p.material = 'shingle';
  // Broken hipped roof (säteritak): a steep lower hip, a short shallow upper one.
  mansardRoof(p, main[0], main[1], main[2], main[3], H, 24, 0.12, 22, c.roof, shade(c.roof, 1.08), 0.08, c.trim);
  p.material = prev;
  // Two white-rendered stacks astride the ridge.
  for (const u of [1.0, 2.0]) {
    p.box(u - 0.06, 0.92, u + 0.06, 1.04, H + 30, H + 58, { color: c.stack, detail: 'plaster' }, 0x3a3530);
    p.addSmoke(u, 0.98, H + 58);
  }
  wing(p, s, [0.2, 1.95, 0.8, 2.85]);
  wing(p, s, [2.2, 1.95, 2.8, 2.85]);
  flagstaff(p, 1.5, 2.6, 0, 62, team);
}

/** The Finnish town centre of the style's age. */
export function nordicTownCentre(s: ArchStyle): BuildingArt {
  const civic = nordic(s).civic;
  if (civic === 'castle') return { size: 3, maxHeight: 280, paint: (p, team) => paintCastle(p, s, team) };
  if (civic === 'manor') return { size: 3, maxHeight: 190, paint: (p, team) => paintManor(p, s, team) };
  return { size: 3, maxHeight: 160, paint: (p, team) => paintLonghouse(p, s, team) };
}
