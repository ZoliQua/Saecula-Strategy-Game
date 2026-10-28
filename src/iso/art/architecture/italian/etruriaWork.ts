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
import { insulaOpts } from './etruriaHouse';
import { cypressLine, vineRows } from './fields';
import { anvil, block, brickWall, cypress, lowHip, nestHoles, stuccoWall } from './italianParts';

/*
 * Italian age-1 workplaces, each with a second shape on its skyline:
 * the villa rustica with its columbarium tower and cypresses over the
 * vines, the timber yard's arcaded store beside a slatted timber drying
 * tower, the mine's ore house with a round brick furnace and tall stack, and the two-storey
 * smithy (fabrica) with its tall stack.
 */

function farm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.ground(0.05, 0.05, 1.95, 1.95, 0x7a5a36);
  vineRows(p, 0.25, 1.05, 1.8, 1.85);
  // Columbarium tower behind the farmhouse, its nest holes under a low pyramid.
  const tower = [0.18, 0.18, 0.58, 0.58] as const;
  block(p, tower, 0, 84, stuccoWall(s), (w, h) => nestHoles(p.ctx, w, h, 1), (w, h) => nestHoles(p.ctx, w, h, R));
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
  // Slatted timber drying tower (seccatoio) beside the store.
  const dryer = [1.42, 0.16, 1.84, 0.58] as const;
  const louvres = (light: number) => (w: number, h: number) => {
    ctx.fillStyle = css(shade(0x1f150d, light), 0.85);
    for (let y = 12; y < h - 6; y += 7) ctx.fillRect(3, -h + y, w - 6, 2.2);
  };
  block(p, dryer, 0, 92, { color: c.timber, detail: 'planks' }, louvres(1), louvres(R));
  lowHip(p, s, dryer, 92, 26, c.roof, 0.07);
  cypress(p, 1.85, 1.0, 0, 46);
  logPile(p, 1.2, 1.72, 9);
  p.flag(0.35, 1.8, 0, 26, team);
}

function miningCamp(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
  insula(p, [0.2, 0.25, 1.12, 1.15], 0, { ...insulaOpts(s, 3, [2, 1], [2, 1]), upper: stuccoWall(s) });
  lowHip(p, s, [0.2, 0.25, 1.12, 1.15], 78, 20, c.roof, 0.08);
  // Round brick smelting furnace with a tapering stack, in front of the ore house's right face.
  drumWall(p, 1.5, 0.92, 0.28, 0, 44, c.brick, 'brick');
  drumOpening(p, 1.5, 0.92, 0.28, Math.PI / 4, 4.5, 3, 13, c.ashlar, 'dark');
  helm(p, 1.5, 0.92, 44, [[0, 0.3], [4, 0.3], [5, 0.24], [18, 0.18], [62, 0.13], [64, 0.16], [69, 0.16]], c.brick, false);
  p.addSmoke(1.5, 0.92, 113);
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
  anvil(p, 1.3, 1.72);
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
