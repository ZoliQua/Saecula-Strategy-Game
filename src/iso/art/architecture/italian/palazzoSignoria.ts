import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, pilasters, R } from '../facade';
import { basin } from '../kits/patio';
import { lantern } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { balustrade, statue } from '../wonderParts';
import { banner, block, cornicione, cupola, type Block } from './italianParts';
import { loggia } from './loggia';
import { palazzo, whiteWall } from './rinascParts';

/*
 * Italian age-3 town centre: a Renaissance civic square. The rusticated
 * palazzo of the signoria under its heavy cornice, a domed chapel
 * beside it (after the Pazzi chapel: white walls, grey pietra serena
 * pilasters, a ribbed terracotta cupola with its lantern), and in front
 * a free-standing arcaded loggia with a balustraded roof and a bronze
 * hero; a fountain and lamps on the paving.
 */

const PAL: Block = [0.95, 0.3, 2.75, 1.5];
const CHAPEL: Block = [0.25, 0.45, 0.95, 1.2];
const LOGGIA: Block = [1.05, 1.82, 2.65, 2.5];

function chapel(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const ctx = p.ctx;
  const face = (light: number) => (w: number, h: number) => {
    pilasters(ctx, h, [4, w - 4], c.trim, 6, light);
    ctx.strokeStyle = css(shade(c.trim, light));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, -h * 0.55, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = css(shade(0x6f8fb0, light));
    ctx.beginPath();
    ctx.arc(w / 2, -h * 0.55, 7, 0, Math.PI * 2);
    ctx.fill();
  };
  block(p, CHAPEL, 0, 76, whiteWall(s), face(1), face(R));
  cornicione(p, CHAPEL, 76, 5, 0.04, c.trim);
  p.box(CHAPEL[0] + 0.06, CHAPEL[1] + 0.06, CHAPEL[2] - 0.06, CHAPEL[3] - 0.06, 81, 88, whiteWall(s), c.trim);
  cupola(p, (CHAPEL[0] + CHAPEL[2]) / 2, (CHAPEL[1] + CHAPEL[3]) / 2, 88, 0.36, 28, c.plaster, c.metal, c.trim);
}

function paintSignoria(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xcdbf9f);
  ctx.strokeStyle = css(c.trim, 0.6);
  ctx.lineWidth = 1;
  for (let t = 0.35; t < 2.95; t += 0.4) {
    const a = p.p(t, 1.55, 0);
    const b = p.p(t, 2.92, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  chapel(p, s);
  palazzo(p, s, PAL, {
    ground: 30, storey: 30, storeys: 2, finish: 'ashlar', bays: [5, 4], lit: 3,
    groundLeft: (w) => p.door(w / 2 - 9, 18, 24, shade(team, 0.7)),
    nobileLeft: (w, h) => {
      crest(ctx, s, w / 2, -h + 46, 6.5, team);
      banner(ctx, w * 0.08, -h + 34, 7, 22, team, 1);
      banner(ctx, w * 0.92 - 7, -h + 34, 7, 22, team, 1);
    },
    overhang: 0.09,
  });
  p.flag((PAL[0] + PAL[2]) / 2, (PAL[1] + PAL[3]) / 2, 102, 26, team, true);
  // The loggia: three round arches on composite piers, a balustraded terrace over them.
  const o = { wall: { color: c.ashlar, detail: 'stone' as const }, trim: c.trim, bays: [3, 1] as const, pier: 0.07, band: 8 };
  loggia(p, LOGGIA, 0, 58, 'back', o);
  statue(p, 1.85, 2.15, 4);
  loggia(p, LOGGIA, 0, 58, 'front', o);
  p.box(LOGGIA[0] - 0.04, LOGGIA[1] - 0.04, LOGGIA[2] + 0.04, LOGGIA[3] + 0.04, 58, 64, { color: c.ashlar }, shade(c.ashlar, 0.9));
  balustrade(p, LOGGIA[0], LOGGIA[1], LOGGIA[2], LOGGIA[3], 64);
  basin(p, 0.55, 2.3, 0, 0.24, c.ashlar, 16);
  lantern(p, 0.95, 1.55, 30, 0.95, 1.9);
  lantern(p, 2.8, 1.55, 30, 2.95, 1.6);
}

/** The Italian age-3 town centre: palazzo, domed chapel and loggia. */
export function palazzoSignoria(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 200, paint: (p, team) => paintSignoria(p, s, team) };
}
