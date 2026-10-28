import { ellipse } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { drumOpening, drumWall } from '../kits/drum';
import { insula, shutteredDark, stringCourse } from '../kits/insula';
import { arcade } from '../kits/patio';
import { chimney, forgeLight, forgeMouth, goldPile, logPile } from '../parts';
import { helm } from '../roofs';
import type { ArchStyle } from '../style';
import type { AgeArtSet } from '../types';
import { crane } from '../wonderParts';
import { insulaOpts } from './etruriaHouse';
import { cypressLine, vineRows } from './fields';
import { block, brickWall, cypress, lowHip, stuccoWall } from './italianParts';

/*
 * Italian age-1 workplaces, each with a second shape on its skyline:
 * the villa rustica with its columbarium tower and cypresses over the
 * vines, the timber yard's arcaded store with a treadwheel crane, the
 * mine's ore house beside a round brick furnace, and the two-storey
 * smithy (fabrica) with its tall stack.
 */

function farm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.ground(0.05, 0.05, 1.95, 1.95, 0x7a5a36);
  vineRows(p, 0.25, 1.05, 1.8, 1.85);
  // Columbarium tower behind the farmhouse, its nest holes under a low pyramid.
  const tower = [0.18, 0.18, 0.58, 0.58] as const;
  block(p, tower, 0, 84, stuccoWall(s), (w, h) => holes(p, w, h, 1), (w, h) => holes(p, w, h, R));
  lowHip(p, s, tower, 84, 24, c.roof, 0.07);
  const house = [0.58, 0.3, 1.4, 1.0] as const;
  block(p, house, 0, 40, stuccoWall(s), (w) => {
    p.door(w * 0.2, 12, 18, shade(team, 0.75));
    p.window(w * 0.6, -32, 8, 10, true);
  }, (w) => p.window(w * 0.4, -32, 8, 10, true));
  lowHip(p, s, house, 40, 18, c.roof, 0.08);
  cypressLine(p, 1.75, 0.2, 1.8, 0.85, 3, 52);
  p.flag(1.9, 1.9, 0, 22, team);
}

/** Nest holes (columbaria) in rows near the top of a dovecote face. */
function holes(p: IsoPainter, w: number, h: number, light: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(0x2a1d14, light));
  for (let r = 0; r < 3; r++) for (let x = 4 + (r % 2) * 3; x < w - 3; x += 6) ctx.fillRect(x, -h + 8 + r * 5, 2.4, 2.4);
}

function lumberCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
  // Arcaded timber store, the log ends stacked inside its arches.
  block(p, [0.2, 0.22, 1.35, 1.0], 0, 46, brickWall(s), (w, h) => {
    arcade(ctx, w, h - 6, { bays: 3, head: 'round', wall: c.brick, light: 1, rise: 0.84 });
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 9; k++) {
        const x = (i + 0.5) * (w / 3) - 8 + (k % 3) * 7.5 + 3.5;
        const y = -4 - Math.floor(k / 3) * 7;
        ellipse(ctx, x, y, 3.2, 3.2);
        ctx.fillStyle = '#c99a62';
        ctx.fill();
      }
    }
    stringCourse(ctx, w, h - 6, c.ashlar, 1, 2.6);
  }, (w, h) => stringCourse(ctx, w, h - 6, c.ashlar, R, 2.6));
  // Drying loft over the store.
  block(p, [0.2, 0.22, 1.35, 1.0], 46, 72, stuccoWall(s), (w) => {
    for (const x of [0.2, 0.5, 0.8]) shutteredDark(ctx, w * x - 4, -20, 8, 11, c.shutter, 1);
  }, (w) => shutteredDark(ctx, w * 0.45, -20, 8, 11, c.shutter, R));
  lowHip(p, s, [0.2, 0.22, 1.35, 1.0], 72, 20, c.roof, 0.08);
  cypress(p, 1.75, 0.3, 0, 48);
  logPile(p, 1.2, 1.72, 9);
  // Treadwheel crane lifting a trunk on to the pile.
  crane(p, 1.72, 1.45, 100, 1.2, 1.4, 24);
  p.flag(0.35, 1.8, 0, 26, team);
}

function miningCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
  // Round brick smelting furnace with a tapering stack.
  drumWall(p, 1.42, 0.55, 0.28, 0, 44, c.brick, 'brick');
  drumOpening(p, 1.42, 0.55, 0.28, Math.PI / 4, 4.5, 3, 13, c.ashlar, 'dark');
  helm(p, 1.42, 0.55, 44, [[0, 0.3], [4, 0.3], [5, 0.24], [18, 0.17], [54, 0.12], [56, 0.14], [60, 0.14]], c.brick, false);
  p.addSmoke(1.42, 0.55, 104);
  insula(p, [0.2, 0.25, 1.12, 1.15], 0, { ...insulaOpts(s, 3, [2, 1], [2, 1]), upper: stuccoWall(s) });
  lowHip(p, s, [0.2, 0.25, 1.12, 1.15], 78, 20, c.roof, 0.08);
  // Ore cart and the gold.
  p.box(0.95, 1.38, 1.5, 1.74, 6, 20, { color: 0x6b4a2a, detail: 'planks' });
  goldPile(p, 1.25, 1.56);
  for (const u of [1.03, 1.42]) {
    const [x, y] = p.p(u, 1.74, 6);
    ellipse(ctx, x, y, 4.5, 5);
    ctx.fillStyle = '#2a1c10';
    ctx.fill();
  }
  p.flag(1.85, 1.85, 0, 26, team);
}

function blacksmith(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
  const b = [0.3, 0.3, 1.7, 1.45] as const;
  chimney(p, 1.15, 0.36, 1.42, 0.62, 66, 128, brickWall(s));
  block(p, b, 0, 28, brickWall(s), (w) => {
    forgeMouth(p, w * 0.35, 26, 22);
    p.door(w * 0.08, 12, 18, shade(team, 0.75));
  }, (w) => shutteredDark(p.ctx, w * 0.4, -20, 9, 10, c.shutter, R));
  block(p, b, 28, 54, stuccoWall(s), (w) => {
    stringCourse(p.ctx, w, 0, c.ashlar, 1);
    for (const x of [0.25, 0.7]) p.window(w * x, -20, 8, 11, true);
  }, (w) => stringCourse(p.ctx, w, 0, c.ashlar, R));
  block(p, b, 54, 78, stuccoWall(s), (w) => {
    for (const x of [0.25, 0.7]) shutteredDark(p.ctx, w * x, -18, 8, 10, c.shutter, 1);
  });
  lowHip(p, s, b, 78, 20, c.roof, 0.08);
  forgeLight(p, 1.0, 1.6);
  const [x, y] = p.p(1.3, 1.72, 0);
  p.ctx.fillStyle = '#3a3a40';
  p.ctx.fillRect(x - 8, y - 9, 16, 4);
  p.ctx.fillRect(x - 3, y - 6, 6, 6);
  p.flag(1.85, 1.85, 0, 26, team);
}

/** The Italian age-1 workplaces. */
export function etruriaWorkArt(s: ArchStyle): AgeArtSet {
  return {
    farm: { size: 2, maxHeight: 140, paint: (p, team) => farm(p, s, team) },
    lumber_camp: { size: 2, maxHeight: 150, paint: (p, team) => lumberCamp(p, s, team) },
    mining_camp: { size: 2, maxHeight: 140, paint: (p, team) => miningCamp(p, s, team) },
    blacksmith: { size: 2, maxHeight: 160, paint: (p, team) => blacksmith(p, s, team) },
  };
}
